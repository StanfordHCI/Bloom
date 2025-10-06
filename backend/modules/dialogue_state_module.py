from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

from backend.llm.llm_provider import LLMProvider
from backend.llm.models import AnnotatedMessage
from backend.llm.prompts import PromptLoader

import os
import yaml
import logging

llm_client = LLMProvider.get_client()
logger = logging.getLogger(__name__)

class DialogueState:
    def __init__(self, data: dict[str, Any]):
        self.id = data['id']
        self.prompt = data.get('prompt', '')        
        self.function_calls = data['function_calls']

        self.transition: str | StateClassifier | None = None
        self.transition_type: str

        transition_data = data.get('transition')
        if transition_data:            
            # Check if both 'prompt' and 'classification_prompt' exist in the data
            if 'prompt' in data and 'transition' in data and 'classification_prompt' in transition_data:
                # Replace {prompt} in the classification_prompt with the actual prompt value
                data['transition']['classification_prompt'] = data['transition']['classification_prompt'].format(prompt=self.prompt)

            if transition_data.get('type') == 'id':
                self.transition = transition_data.get('state')
                self.transition_type = 'id'
            elif transition_data.get('type') == 'StateClassifier':
                self.transition = StateClassifier(
                    task_prompt=self.prompt,
                    class_transitions=transition_data['class_transitions']
                )
                self.transition_type = 'StateClassifier'  

# Used for LLM structured outputs
class StateTransition(BaseModel):
    """
    Defines the structure for managing transitions between states in the dialogue module.
    """
    rationale: str = Field(
        ...,
        description="A concise explanation of the reasoning behind the selected state transition. This should clarify the rationale behind the transition decision."
    )
    transition: Literal["continue", "completed"] = Field(
        ...,
        description="Specifies the dialogue state transition. Use 'continue' to indicate that the task is still ongoing and requires further action, or 'completed' to signify that the task has been successfully finished and the dialogue state should advance."
    )     

class StateClassifier:
    def __init__(self, task_prompt: str, class_transitions: dict[str, str]):
        self.task_prompt = task_prompt # The prompt to be used to decide whether the task is completed or not
        self.class_transitions = class_transitions

        assert set(self.class_transitions.keys()) == {'continue', 'completed'}, "Class transitions must contain 'continue' and 'completed' keys."

    async def classify_state(self, dialogue_history: list[AnnotatedMessage]=[]) -> str:
        logger.info("Classifying dialogue state transition")

        classification_prompt = PromptLoader.dialogue_classification_prompt(dialogue_history, self.task_prompt)

        output: StateTransition = await llm_client.chat_completion_structured(
            messages=[{"role": "system", "content": classification_prompt}],
            response_format=StateTransition
        )
        logger.info(f"State classification rationale: {output.rationale}")
        logger.info(f"State classification transition: {output.transition}")

        next_state_id = self.class_transitions[output.transition]
        return next_state_id

class DialogueStateModule:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.states: Optional[dict[str, DialogueState]] = None

    def load_states(self):
        """
        Load states from YAML files into the self.states dictionary in order of transitions.
        Dynamically determine the initial state from the first entry in the `children` of the only YAML file.
        """
        if self.states is not None:
            return
        else:
            self.states = {}

        def load_yaml(file_path):
            """Helper function to load a YAML file."""
            with open(file_path, 'r') as f:
                return yaml.safe_load(f)

        # Find the only YAML file in the base directory
        yaml_files = [os.path.join(self.base_dir, f) for f in os.listdir(self.base_dir) if f.endswith('.yml')]
        if len(yaml_files) != 1:
            raise ValueError("There should be exactly one YAML file in the base directory.")
        
        onboarding_file = yaml_files[0]
        onboarding_data = load_yaml(onboarding_file)
        
        # Get the first child as the starting state
        children = onboarding_data.get('children', [])
        if not children:
            raise ValueError("The onboarding YAML file does not contain a 'children' list.")
        
        current_state_id = children[0]
        visited_states = set()

        # Build mapping of state_id to file paths
        state_files = {}
        for root, dirs, files in os.walk(self.base_dir):
            for file in files:
                if file.endswith(".yml"):
                    file_path = os.path.join(root, file)
                    data = load_yaml(file_path)
                    state_id = data.get('id', '')
                    if state_id:
                        state_files[state_id] = file_path

        # BFS over states to load states in order
        while current_state_id:
            if current_state_id in visited_states:
                raise ValueError(f"Cycle detected in transitions at state '{current_state_id}'.")
            visited_states.add(current_state_id)

            file_path = state_files.get(current_state_id)
            if not file_path:
                raise ValueError(f"File for state '{current_state_id}' not found.")
            state_data = load_yaml(file_path)

            self.states[current_state_id] = DialogueState(state_data)

            transitions = state_data.get('transition', {}).get('class_transitions', {})
            current_state_id = transitions.get('completed')

            if current_state_id == state_data['id']:
                break

    def get_state(self, state_id: str) -> DialogueState:
        """Retrieve a state object by its ID."""
        self.load_states()
        if not self.states:
            raise ValueError("Unable to load states.")
        if state_id not in self.states:
            raise ValueError(f"State {state_id} not found.")

        return self.states[state_id]

    async def get_next_state(self, dialogue_history: list[AnnotatedMessage]) -> tuple[str, str, str]:
        """
        Given the dialogue history, returns the current state, next state, and the prompt for the next state.
        """
        
        # get most recent user and agent message 
        user_response, agent_response = None, None

        # Iterate from the end to the beginning
        for i in range(len(dialogue_history)-1, -1, -1):
            response = dialogue_history[i]
            if response.role == "user" and user_response is None:
                user_response = response
            elif response.role == "assistant" and agent_response is None:
                agent_response = response
            
            # Break early if both responses are found
            if user_response and agent_response:
                break
        
        if not agent_response:
            visited_states = []
        else:
            visited_states = [agent_response.start_state] if agent_response.start_state else [] + \
                             [agent_response.end_state] if agent_response.end_state else []
        

        if len(visited_states) == 0:
            next_state = self.get_state('introduction')
            return "introduction", "introduction", next_state.prompt
        
        # Required for type checking
        assert agent_response is not None, "Agent response not found."
        assert agent_response.end_state is not None, "Agent response end state not found."
        current_state = self.get_state(agent_response.end_state)
        
        if current_state.transition_type == 'id':
            next_state_name = current_state.transition
        elif current_state.transition_type == 'StateClassifier':
            assert isinstance(current_state.transition, StateClassifier), "Transition is not a StateClassifier."
            next_state_name = await current_state.transition.classify_state(dialogue_history)
        
        assert isinstance(next_state_name, str), "Next state is not a string."
        
        logger.info(f"Transitioning from state {current_state.id} to state {next_state_name}")
        next_state = self.get_state(next_state_name)

        return current_state.id, next_state_name, next_state.prompt
