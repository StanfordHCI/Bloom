from datetime import datetime
from backend.utils import date_utils
from backend.llm.models import AnnotatedMessage

# GLOBAL
with open("backend/llm/prompts/response_generation/system_instructions.txt", "r") as file:
    SYSTEM_INSTRUCTIONS = file.read()   
with open("backend/llm/prompts/response_generation/persona.txt", "r") as file:
    PERSONA_PROMPT = file.read()
with open("backend/llm/prompts/response_generation/tool_calls.txt", "r") as file:
    TOOL_CALL_PROMPT = file.read()
with open("backend/llm/prompts/response_generation/safety.txt", "r") as file:
    SYSTEM_SAFETY_PROMPT = file.read()

# DIALOGUE STATE MANAGER
with open("backend/llm/prompts/dialogue_module/dialogue_classification_prompt.txt", "r") as file:
    DIALOGUE_CLASSIFICATION_PROMPT = file.read()

# MOTIVATIONAL INTERVIEWING CHAIN
with open("backend/llm/prompts/strategy_module/strategy_classification_prompt.txt", "r") as file:
    STRATEGY_CLASSIFICATION_PROMPT = file.read()
with open("backend/llm/prompts/strategy_module/strategy_descriptions.txt", "r") as file:
    STRATEGY_DESCRIPTIONS = file.read()

# ONBOARDING
with open("backend/llm/prompts/response_generation/onboarding_system_prompt.txt", "r") as file:
    ONBOARDING_RESPONSE_GENERATION_SYSTEM_PROMPT = file.read()
with open("backend/llm/prompts/response_generation/onboarding_agent_prompt.txt", "r") as file:
    ONBOARDING_RESPONSE_GENERATION_AGENT_PROMPT = file.read()

# CHECK-IN
with open("backend/llm/prompts/response_generation/check_in_system_prompt.txt", "r") as file:
    CHECK_IN_RESPONSE_GENERATION_SYSTEM_PROMPT = file.read()
with open("backend/llm/prompts/response_generation/check_in_agent_prompt.txt", "r") as file:
    CHECK_IN_RESPONSE_GENERATION_AGENT_PROMPT = file.read()
with open("backend/llm/prompts/response_generation/check_in_dynamic_intro_prompt.txt", "r") as file:
    CHECK_IN_DYNAMIC_INTRO_PROMPT = file.read()

# AT-WILL
with open("backend/llm/prompts/response_generation/at_will_chat_system_prompt.txt", "r") as file:
    AT_WILL_RESPONSE_GENERATION_SYSTEM_PROMPT = file.read() 
with open("backend/llm/prompts/response_generation/at_will_chat_task.txt", "r") as file:
    AT_WILL_CHAT_TASK = file.read()
with open("backend/llm/prompts/response_generation/at_will_chat_dynamic_intro_prompt.txt", "r") as file:
    AT_WILL_DYNAMIC_INTRO_PROMPT = file.read()
with open("backend/llm/prompts/response_generation/at_will_tool_calls.txt", "r") as file:
    AT_WILL_TOOL_CALL_PROMPT = file.read()

# PLAN MODULE
with open("backend/llm/prompts/plan_module/plan_generation_prompt.txt", "r") as file:
    PLAN_GENERATION_PROMPT = file.read()

# MEMORY MODULE
with open("backend/llm/prompts/memory_module/summarize.txt", "r") as file:
    SUMMARIZE_MEMORY = file.read()
with open("backend/llm/prompts/memory_module/memory.txt", "r") as file:
    MEMORY_PROMPT = file.read()

# SAFETY MODULE
with open("backend/llm/prompts/safety_module/classification/category_1.txt", "r") as file:
    SAFETY_CLASSIFICATION_CATEGORY_1 = file.read()
with open("backend/llm/prompts/safety_module/classification/category_2.txt", "r") as file:
    SAFETY_CLASSIFICATION_CATEGORY_2 = file.read()
with open("backend/llm/prompts/safety_module/classification/category_3.txt", "r") as file:
    SAFETY_CLASSIFICATION_CATEGORY_3 = file.read()
with open("backend/llm/prompts/safety_module/classification/category_4.txt", "r") as file:
    SAFETY_CLASSIFICATION_CATEGORY_4 = file.read()
with open("backend/llm/prompts/safety_module/classification/category_5.txt", "r") as file:
    SAFETY_CLASSIFICATION_CATEGORY_5 = file.read()
with open("backend/llm/prompts/safety_module/classification/all_categories.txt", "r") as file:
    SAFETY_CLASSIFICATION_ALL_CATEGORIES = file.read()
with open("backend/llm/prompts/safety_module/revision/revision_prompt.txt", "r") as file:
    REVISION_PROMPT = file.read()

# SUMMARY ENDPOINTS
with open("backend/llm/prompts/summary/insights_summary_prompt.txt", "r") as file:
    INSIGHTS_SUMMARY_PROMPT = file.read()
with open("backend/llm/prompts/summary/chart_summary_prompt.txt", "r") as file:
    CHART_SUMMARY_PROMPT = file.read()
with open("backend/llm/prompts/summary/journey_summary_prompt.txt", "r") as file:
    JOURNEY_SUMMARY_PROMPT = file.read()
with open("backend/llm/prompts/summary/ambient_summary_prompt.txt", "r") as file:
    AMBIENT_SUMMARY_PROMPT = file.read()


# NOTIFICATION MODULE
with open("backend/llm/prompts/notifications/morning_notification_prompt.txt", "r") as f:
    MORNING_NOTIFICATION_PROMPT = f.read()
with open("backend/llm/prompts/notifications/evening_notification_prompt.txt", "r") as f:
    EVENING_NOTIFICATION_PROMPT = f.read()
with open("backend/llm/prompts/notifications/workout_reminder_prompt.txt", "r") as f:
    WORKOUT_REMINDER_PROMPT = f.read()

class PromptLoader:
    @staticmethod
    def onboarding_response_generation_system_prompt(
        timezone_str: str,
        task_prompt: str,
        strategy_description: str
    ) -> str:
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return ONBOARDING_RESPONSE_GENERATION_SYSTEM_PROMPT \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS) \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{TASK}}", task_prompt) \
            .replace("{{STRATEGY}}", strategy_description) \
            .replace("{{TOOL_CALLS}}", TOOL_CALL_PROMPT) \
            .replace("{{SAFETY}}", SYSTEM_SAFETY_PROMPT)
            
    @staticmethod
    def onboarding_response_generation_agent_prompt(
        task_prompt: str,
        strategy_description: str
    ) -> str:
        return ONBOARDING_RESPONSE_GENERATION_AGENT_PROMPT \
            .replace("{{TASK}}", task_prompt) \
            .replace("{{STRATEGY}}", strategy_description)    
            
    @staticmethod
    def check_in_response_generation_system_prompt(
        timezone_str: str,
        task_prompt: str,
        strategy_description: str,        
        plan_history: str,
        ambient_display_history: str
    ) -> str:
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return CHECK_IN_RESPONSE_GENERATION_SYSTEM_PROMPT \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS) \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{TASK}}", task_prompt) \
            .replace("{{STRATEGY}}", strategy_description) \
            .replace("{{TOOL_CALLS}}", TOOL_CALL_PROMPT) \
            .replace("{{AMBIENT_DISPLAY_HISTORY}}", ambient_display_history) \
            .replace("{{SAFETY}}", SYSTEM_SAFETY_PROMPT)  
            
            
    @staticmethod
    def check_in_response_generation_agent_prompt(
        task_prompt: str,
        strategy_description: str
    ) -> str:
        return CHECK_IN_RESPONSE_GENERATION_AGENT_PROMPT \
            .replace("{{TASK}}", task_prompt) \
            .replace("{{STRATEGY}}", strategy_description)    
              

    @staticmethod
    def at_will_response_generation_system_prompt(
        timezone_str: str,        
        strategy_description: str, 
        summaries: str, 
        plan_history: str,
        ambient_display_history: str
    ) -> str:
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return AT_WILL_RESPONSE_GENERATION_SYSTEM_PROMPT \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS) \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{TASK}}", AT_WILL_CHAT_TASK) \
            .replace("{{STRATEGY}}", strategy_description) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{AT_WILL_TOOL_CALLS}}", AT_WILL_TOOL_CALL_PROMPT) \
            .replace("{{AMBIENT_DISPLAY_HISTORY}}", ambient_display_history) \
            .replace("{{SAFETY}}", SYSTEM_SAFETY_PROMPT)                
                                                                                                  
    @staticmethod
    def dialogue_classification_prompt(history: list[AnnotatedMessage], task_prompt: str) -> str:
        conversation_history = AnnotatedMessage.convert_message_history_for_openai(history)
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])

        return DIALOGUE_CLASSIFICATION_PROMPT \
            .replace("{{HISTORY}}", conversation_text) \
            .replace("{{TASK}}", task_prompt)
    
    @staticmethod
    def strategy_classification_prompt(history: list[AnnotatedMessage], task_prompt: str) -> str:
        conversation_history = AnnotatedMessage.convert_message_history_for_openai(history)
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])

        return STRATEGY_CLASSIFICATION_PROMPT \
            .replace("{{HISTORY}}", conversation_text) \
            .replace("{{TASK}}", task_prompt) \
            .replace("{{STRATEGIES}}", STRATEGY_DESCRIPTIONS)
    
    @staticmethod
    def summarize_memory_prompt(
        timezone_str: str,
        history: list[AnnotatedMessage]
    ) -> str:
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        conversation_history = AnnotatedMessage.convert_message_history_for_openai(history)
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])

        return SUMMARIZE_MEMORY \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{HISTORY}}", conversation_text)
            
    @staticmethod
    def at_will_dynamic_intro_prompt(summaries: str, timezone_str: str, plan_history: str) -> str:
        """
        Generates a system or assistant prompt for an intro message using
        previously summarized conversations.
        """
        
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)
                
        # If there's no summary, we can just produce a short fallback greeting.
        if not summaries.strip():
            summaries = "No prior summary available."
        
        return AT_WILL_DYNAMIC_INTRO_PROMPT \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS)
        
    @staticmethod
    def check_in_dynamic_intro_prompt(summaries: str, plan_history: str) -> str:
        """
        Generates a system or assistant prompt for an intro message using
        previously summarized conversations.
        """
        # If there's no summary, we can just produce a short fallback greeting.
        if not summaries.strip():
            summaries = "No prior summary available."
        
        return CHECK_IN_DYNAMIC_INTRO_PROMPT \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS)
        
    @staticmethod
    def memory_prompt(memory: str) -> str:
        return MEMORY_PROMPT.replace("{{MEMORY}}", memory)
    
    @staticmethod
    def plan_generation_prompt(
        current_datetime: datetime,
        plan_start: str, 
        plan_end: str,
        history: list[AnnotatedMessage], 
        memory: str,
        chat_state: str,
        plan_history: str
    ) -> str:
        current_date_str = current_datetime.strftime("%m-%d-%Y %I:%M %p")
        # plan_start_str = utils.verbose_date(plan_start)
        # plan_end_str = utils.verbose_date(plan_end)

        conversation_history = AnnotatedMessage.convert_message_history_for_openai(history)
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])

        plan_prompt = PLAN_GENERATION_PROMPT \
            .replace("{{CURRENT_DATE}}", current_date_str) \
            .replace("{{START_DATE}}", plan_start) \
            .replace("{{END_DATE}}", plan_end) \
            .replace("{{HISTORY}}", conversation_text) \
            .replace("{{CHAT_STATE}}", chat_state) \
            .replace("{{PLAN_HISTORY}}", plan_history)
        
        if memory:
            plan_prompt += "\n\n" + MEMORY_PROMPT.replace("{{MEMORY}}", memory)

        return plan_prompt
    
    @staticmethod
    def safety_classification_prompt(
        category: int,
        user_input: str,
        model_output: str
    ) -> str:
        if category == 1:
            classification_prompt = SAFETY_CLASSIFICATION_CATEGORY_1
        elif category == 2:
            classification_prompt = SAFETY_CLASSIFICATION_CATEGORY_2
        elif category == 3:
            classification_prompt = SAFETY_CLASSIFICATION_CATEGORY_3
        elif category == 4:
            classification_prompt = SAFETY_CLASSIFICATION_CATEGORY_4
        elif category == 5:
            classification_prompt = SAFETY_CLASSIFICATION_CATEGORY_5
        else:
            classification_prompt = SAFETY_CLASSIFICATION_ALL_CATEGORIES

        return classification_prompt \
            .replace("{{INPUT}}", user_input) \
            .replace("{{OUTPUT}}", model_output)

    @staticmethod
    def revision_prompt(
        user_input: str,
        model_output: str,
        history: list[AnnotatedMessage],
        safety_category: str,
        rationales: str
    ) -> str:
        
        conversation_history = AnnotatedMessage.convert_message_history_for_openai(history)
        conversation_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])

        return REVISION_PROMPT \
            .replace("{{INPUT}}", user_input) \
            .replace("{{OUTPUT}}", model_output) \
            .replace("{{CATEGORY_HARMFUL}}", safety_category) \
            .replace("{{RATIONALES}}", rationales) \
            .replace("{{HISTORY}}", conversation_text)
    
    @staticmethod
    def insights_summary_prompt(
        hk_summary: str,
        timezone_str: str,        
        summaries: str, 
        plan_history: str
    ) -> str:
        
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return INSIGHTS_SUMMARY_PROMPT \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{HK_SUMMARY}}", hk_summary) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS)
    
    @staticmethod
    def chart_summary_prompt(
        hk_summary: str,
        timezone_str: str,        
        summaries: str, 
        plan_history: str
    ) -> str:
        
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return CHART_SUMMARY_PROMPT \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{HK_SUMMARY}}", hk_summary) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS)
    
    @staticmethod
    def journey_summary_prompt(
        week_index: int,
        timezone_str: str,        
        summaries: str, 
        plan_history: str,
        ambient_display_history: str
    ) -> str:
        
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return JOURNEY_SUMMARY_PROMPT \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{WEEK_INDEX}}", str(week_index)) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{AMBIENT_DISPLAY_HISTORY}}", ambient_display_history) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS)
    
    @staticmethod
    def ambient_summary_prompt(
        week_index: int,
        timezone_str: str,
        summaries: str,
        plan_history: str,
        ambient_display_history: str,
        control_diff_str: str,
        critter_str: str
    ) -> str:
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)
        
        return AMBIENT_SUMMARY_PROMPT \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{WEEK_INDEX}}", str(week_index)) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{AMBIENT_DISPLAY_HISTORY}}", ambient_display_history) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS) \
            .replace("{{DIFF_STRING}}", control_diff_str) \
            .replace("{{CRITTER_STRING}}", critter_str)

    @staticmethod
    def morning_notification_prompt(
        timezone_str: str,
        summaries: str,
        plan_history: str,
        last_10_notifications: str,
        todays_workouts: str
    ) -> str:
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return MORNING_NOTIFICATION_PROMPT \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{LAST_10_NOTIFICATIONS}}", last_10_notifications) \
            .replace("{{TODAYS_WORKOUTS}}", todays_workouts)

    @staticmethod
    def evening_notification_prompt(
        timezone_str: str,
        summaries: str,
        plan_history: str,
        last_10_notifications: str,
        todays_workouts: str
    ) -> str:
        
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return EVENING_NOTIFICATION_PROMPT \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{LAST_10_NOTIFICATIONS}}", last_10_notifications) \
            .replace("{{TODAYS_WORKOUTS}}", todays_workouts)

    @staticmethod
    def workout_reminder_prompt(
        timezone_str: str,
        summaries: str,
        plan_history: str,
        last_10_notifications: str,
        workout_info: str
    ) -> str:
        
        current_datetime = date_utils.get_current_iso_datetime()
        localized_datetime = date_utils.localize_datetime(current_datetime, timezone_str)
        timestamp_str = date_utils.verbose_datetime(localized_datetime)

        return WORKOUT_REMINDER_PROMPT \
            .replace("{{DATETIME}}", timestamp_str) \
            .replace("{{SYSTEM_INSTRUCTIONS}}", SYSTEM_INSTRUCTIONS) \
            .replace("{{SUMMARIES}}", summaries) \
            .replace("{{PLAN_HISTORY}}", plan_history) \
            .replace("{{LAST_10_NOTIFICATIONS}}", last_10_notifications) \
            .replace("{{WORKOUT_INFO}}", workout_info)
