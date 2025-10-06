import json
from backend.api.models import ToolResponseMessage
import logging
import asyncio
from backend.llm.models import AnnotatedMessage
from backend.modules.memory_module import MemoryModule
from backend.modules.plan_module import PlanModule
from backend.api.models import ChatState
from backend.modules.date_module import PlanDateModule
from backend.task_queue import TaskQueue
from backend.managers.firebase_manager import FirebaseManager
from backend.config import TOOL_CALL_TIMEOUT_DELAY
import pytz
from backend.modules.plan_module import VALID_WORKOUT_TYPES
from typing import Any, Dict, List

logger = logging.getLogger(__name__)
firebase_manager = FirebaseManager()
task_queue = TaskQueue()


class ToolModule:
    def __init__(self, chat_state: str):
        self.backend_tools = ["generate_plan", "plan-widget", "addWorkout", "deleteWorkout"]  # directly executed in the backend
        self.frontend_tools = ["query_health_data"]
        self.active_tool_calls = {}  # type: ignore[var-annotated]
        self.finished_tool_calls = {}  # type: ignore[var-annotated]
        self.active_tool_calls_lock = asyncio.Lock()
        self.finished_tool_calls_lock = asyncio.Lock()
        self.chat_state = chat_state

    def get_available_tools(self) -> List[Dict[str, Any]]:
        all_toools: List[Dict[str, Any]] = [
            {
                "type": "function",
                "function": {
                    "name": "query_health_data",
                    "description": "Performs a data query for apple health kit data.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sample_type": {
                                "type": "string",
                                "enum": [
                                    "stepCount",
                                    "distanceWalkingRunning",
                                    "basalEnergyBurned",
                                    "activeEnergyBurned",
                                    "flightsClimbed",
                                    "appleExerciseTime",
                                    "appleMoveTime",
                                    "appleStandTime",
                                    "heartRate",
                                    "restingHeartRate",
                                    "heartRateVariabilitySDNN",
                                    "walkingHeartRateAverage",
                                    "oxygenSaturation",
                                    "respiratoryRate",
                                    "sleepAnalysis",
                                    "workout"
                                ],
                                "description": """The data type to be queried. Options are: 
                                    activeEnergyBurned: "This is an estimate of energy burned over and above your Resting Energy use (see Resting Energy). Active energy includes activity such as walking slowly, pushing your wheelchair, and household chores, as well as exercise such as biking and dancing.",
                                    appleExerciseTime: "Every full minute of movement equal to or exceeding the intensity of a brisk walk for you counts towards your Exercise minutes.",
                                    appleStandTime: "Stand minutes are the minutes in each hour that you're standing and moving. Looking at your Stand minutes over time can help you understand how active or sedentary you are. Apple Watch automatically tracks and logs Stand minutes in Health.",
                                    basalEnergyBurned: "This is an estimate of the energy your body uses each day while minimally active. Additional physical activity requires more energy over and above Resting Energy (see Active Energy).",
                                    distanceWalkingRunning: "This is an estimate of the distance you've walked or run. It's calculated using the steps you've taken and the distance of your stride.",
                                    flightsClimbed: "A flight of stairs is counted as approximately 10 feet (3 meters) of elevation gain (approximately 16 steps).",
                                    heartRate: "Your heart beats approximately 100,000 times per day, accelerating and slowing through periods of rest and exertion. Your heart rate refers to how many times your heart beats per minute and can be an indicator of your cardiovascular health.",
                                    heartRateVariabilitySdnn: "Heart Rate Variability (HRV) is a measure of the variation in the time interval between heart beats. Apple Watch calculates HRV by using the standard deviation of beat-to-beat measurements.",
                                    oxygenSaturation: "Blood oxygen is a measure of the amount of oxygen in the protein (hemoglobin) in your red blood cells. To function properly, your body needs a certain level of oxygen circulating in the blood.",
                                    respiratoryRate: "Respiratory rate refers to the number of times you breathe in a minute. When you inhale, your lungs fill with air and oxygen is added to your bloodstream while carbon dioxide is removed.",
                                    restingHeartRate: "Your resting heart rate is the average heart beats per minute measured when you've been inactive or relaxed for several minutes. A lower resting heart rate typically indicates better cardiovascular fitness.",
                                    sleepAnalysis: "Sleep provides insight into your sleep habits. Sleep trackers and monitors can help you determine the amount of time you are in bed and asleep.",
                                    stepCount: "Step count is the number of steps you take throughout the day. Pedometers and digital activity trackers can help you determine your step count.",
                                    walkingHeartRateAverage: "Your walking heart rate is the average heart beats per minute measured by your Apple Watch during walks at a steady pace throughout the day.",
                                    workout: "Workouts can be logged manually or automatically by your phone or watch. Each workout is logged with a start and end time, type of workout, and duration."
                                """
                            },
                            "reference_date": {
                                "type": "string",
                                "description": "the query's reference date, in natural language ('today', 'yesterday', etc.) or ISO string. defaults to today"
                            },
                            "aggregation_level": {
                                "type": "string",
                                "enum": [
                                    "day",
                                    "week",
                                    "month"
                                ],
                                "description": "the time frame over which the data should be fetched"
                            },
                            "show_user": {
                                "type": "boolean",
                                "description": "Whether the data should be visualized for the user or just fetched for the ai chat agent."
                            }
                        },
                        "required": ["sample_type"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_plan",
                    "description": "Generates a weekly workout plan for a given user.",
                    "strict": False,
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "plan-widget",
                    "description": "Visualizes the current workout plan",
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "addWorkout",
                    "description": "Adds a workout to the active plan for a specified day, workout type, start time, duration, and optionally intensity/location.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "day": {
                                "type": "string",
                                "enum": [
                                        "Sunday",
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday"
                                ],
                                "description": "The day to add a workout (e.g., 'Monday')."
                            },
                            "workout_type": {
                                "type": "string",
                                "enum": VALID_WORKOUT_TYPES,
                                "description": "Type of workout to add (e.g., 'running')."
                            },
                            "time_start": {
                                "type": "string",
                                "description": "Start time in 'hh:mm AM/PM' or 'HH:mm' format (e.g., '6:30 AM')."
                            },
                            "duration_min": {
                                "type": "number",
                                "description": "Duration of the workout in minutes (e.g., 30)."
                            },
                            "intensity": {
                                "type": "string",
                                "enum": ["light", "moderate", "vigorous"],
                                "description": "Optional workout intensity: 'light', 'moderate', or 'vigorous'. Defaults to 'moderate'."
                            },
                            "location": {
                                "type": "string",
                                "description": "Optional location or extra info for the workout (e.g., 'Gym')."
                            }
                        },
                        "required": ["day", "workout_type", "time_start", "duration_min"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "deleteWorkout",
                    "description": "Deletes a workout from the active plan based on day, workout type, and optionally the start time.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "day": {
                                "type": "string",
                                "enum": [
                                    "Sunday",
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday"
                                ],
                                "description": "The day from which to delete the workout."
                            },
                            "workout_type": {
                                "type": "string",
                                "enum": VALID_WORKOUT_TYPES,
                                "description": "The type of workout to delete (e.g., 'running')."
                            },
                            "workout_time": {
                                "type": "string",
                                "description": "Optional: The start time of the workout (e.g., '6:30 AM')."
                            }
                        },
                        "required": ["day", "workout_type"]
                    }
                }
            }
        ]

        if self.chat_state == ChatState.AT_WILL.value:
            filtered_tools = []
            for tool in all_toools:
                if tool["function"]["name"] != "generate_plan":
                    filtered_tools.append(tool)
            return filtered_tools

        return all_toools

    async def generate_plan(self, uid: str, tool_request: dict, dialogue_history: list[AnnotatedMessage], chat_state: str) -> dict:
        function_name = tool_request["function"]["name"]
        tool_call_id = tool_request["id"]

        # 1) Determine official plan start/end using your rules
        start_dt, end_dt, error_msg = await PlanDateModule.determine_plan_dates(uid, chat_state, firebase_manager)
        if error_msg or start_dt is None or end_dt is None:
            logger.error(error_msg)
            return {
                "tool_call_id": tool_call_id,
                "content": f"Cannot generate plan: {error_msg}",
                "role": "tool",
                "name": function_name
            }
        start_dt_str = start_dt.isoformat()  # isoformat the date
        end_dt_str = end_dt.isoformat()  # isoformat the date

        memory = await MemoryModule.retrieve_memory(uid)

        plan, revision_message = await PlanModule.generate_plan(uid, dialogue_history, memory, chat_state, start_dt_str, end_dt_str)

        if plan is None:
            logger.info(f"Error generating plan for user {uid}")
            return {
                "tool_call_id": tool_call_id,
                "content": "Error generating plan.",
                "role": "tool",
                "name": function_name
            }
        else:
            logger.info(f"Generated plan for user {uid}: {plan.model_dump()}")
            # save plan to firebase
            await PlanModule.save_plan(uid, plan, chat_state, revision_message)

            # 1. Retrieve the user’s time zone
            user_tz_str = await firebase_manager.get_user_timezone(uid)
            user_tz = pytz.timezone(user_tz_str)

            plan_dict = PlanModule.serialize_plan(plan.model_dump(), user_tz)

            return {
                "tool_call_id": tool_call_id,
                "content": json.dumps({
                    "message": "Plan successfully generated and saved.",
                    "revision_message": revision_message,
                    "plan": plan_dict
                }),
                "role": "tool",
                "name": function_name
            }

    async def add_workout(self, uid: str, tool_request: dict, dialogue_history: list[AnnotatedMessage], chat_state: str) -> dict:
        """
        Handles the addWorkout tool call by parsing arguments, calling PlanModule.add_workout,
        and returning the response in a standardized format.
        """
        function_name = tool_request["function"]["name"]
        tool_call_id = tool_request["id"]

        raw_args = tool_request["function"].get("arguments", {})
        if isinstance(raw_args, str):
            arguments = json.loads(raw_args)
        else:
            arguments = raw_args

        day = arguments.get("day")
        workout_type = arguments.get("workout_type")
        time_start = arguments.get("time_start")
        duration_min = arguments.get("duration_min")
        intensity = arguments.get("intensity")  # optional
        location = arguments.get("location")    # optional

        # Call the updated PlanModule.add_workout
        plan, revision_message = await PlanModule.add_workout(
            uid=uid,
            day=day,
            workout_type=workout_type,
            time_start=time_start,
            duration_min=duration_min,
            chat_state=chat_state,
            intensity=intensity,
            location=location
        )

        if plan is None:
            logger.info(f"Error adding workout for user {uid}: {revision_message}")
            return {
                "tool_call_id": tool_call_id,
                "content": revision_message,
                "role": "tool",
                "name": function_name
            }

        logger.info(f"Workout added for user {uid}: {plan.model_dump()}")
        # Save the updated plan
        await PlanModule.save_plan(uid, plan, chat_state, revision_message)

        # Localize plan before returning
        user_tz_str = await firebase_manager.get_user_timezone(uid)
        user_tz = pytz.timezone(user_tz_str)
        plan_dict = PlanModule.serialize_plan(plan.model_dump(), user_tz)

        return {
            "tool_call_id": tool_call_id,
            "content": json.dumps({
                "message": "Workout successfully added and saved.",
                "revision_message": revision_message,
                "plan": plan_dict
            }),
            "role": "tool",
            "name": function_name
        }

    async def delete_workout(self, uid: str, tool_request: dict, chat_state: str) -> dict:
        """
        Handles the deleteWorkout tool call by parsing arguments, calling PlanModule.delete_workout,
        and returning the response in a standardized format.
        """
        function_name = tool_request["function"]["name"]
        tool_call_id = tool_request["id"]
        raw_args = tool_request["function"].get("arguments", {})
        if isinstance(raw_args, str):
            arguments = json.loads(raw_args)
        else:
            arguments = raw_args

        day = arguments.get("day")
        workout_type = arguments.get("workout_type")
        workout_time = arguments.get("workout_time")

        plan, revision_message = await PlanModule.delete_workout(uid, day, workout_type, chat_state, workout_time)

        if plan is None:
            logger.info(f"Error deleting the workout for user {uid}")
            return {
                "tool_call_id": tool_call_id,
                "content": "Could not find a matching workout.",
                "role": "tool",
                "name": function_name
            }
        else:
            logger.info(f"Deleted workout for user {uid}: {plan.model_dump()}")
            # save plan to firebase
            await PlanModule.save_plan(uid, plan, chat_state, revision_message)

            # 1. Retrieve the user’s time zone
            user_tz_str = await firebase_manager.get_user_timezone(uid)
            user_tz = pytz.timezone(user_tz_str)

            plan_dict = PlanModule.serialize_plan(plan.model_dump(), user_tz)

            return {
                "tool_call_id": tool_call_id,
                "content": json.dumps({
                    "message": "Workout successfully deleted and saved.",
                    "revision_message": revision_message,
                    "plan": plan_dict
                }),
                "role": "tool",
                "name": function_name
            }

    def _is_successful_plan_result(self, result: dict) -> bool:
        """
        Checks if the result dictionary includes a valid plan.
        i.e. if 'plan' is in result['content'] and not None.
        """
        if "content" not in result:
            return False
        try:
            data = json.loads(result["content"])
            if "plan" in data and data["plan"] is not None:
                return True
            return False
        except Exception:
            return False

    async def process_tool_calls(self, uid: str, tool_requests: list[dict], dialogue_history: list[AnnotatedMessage], response_call_back, send_to_frontend, chat_state: str) -> list[dict]:
        frontend_tool_calls = [
            tool_request for tool_request in tool_requests if tool_request["function"]["name"] in self.frontend_tools
        ]

        # 1. Filter out front-end calls (handled concurrently).
        frontend_tool_calls = []
        backend_tool_calls = []
        for tr in tool_requests:
            if tr["function"]["name"] in self.frontend_tools:
                frontend_tool_calls.append(tr)
            else:
                backend_tool_calls.append(tr)

        # 2. Schedule front-end tool calls concurrently.
        for tool_request in frontend_tool_calls:
            future: asyncio.Future = asyncio.Future()
            task = asyncio.create_task(self._handle_frontend_tool(uid, tool_request['id'], future, response_call_back))
            async with self.active_tool_calls_lock:
                self.active_tool_calls.setdefault(uid, {})[tool_request["id"]] = {'task': task, 'future': future}

        # 3. Identify the index of the last workout modification call (add/delete).
        last_workout_mod_index = None
        for i, req in enumerate(backend_tool_calls):
            fn_name = req["function"]["name"]
            if fn_name in ["addWorkout", "deleteWorkout"]:
                last_workout_mod_index = i

        # Process backend calls in order
        for i, tool_request in enumerate(backend_tool_calls):
            fn_name = tool_request["function"]["name"]
            if fn_name in ["generate_plan", "plan-widget"]:
                # Show widget immediately
                await self._handle_backend_tool(
                    uid, tool_request, dialogue_history,
                    response_call_back, send_to_frontend,
                    chat_state,
                    show_plan_widget=True
                )
            elif fn_name in ["addWorkout", "deleteWorkout"]:
                # Is this the final add/delete call in the sequence?
                is_last_mod_call = (i == last_workout_mod_index)
                if not is_last_mod_call:
                    # Run but do not show widget
                    await self._handle_backend_tool(
                        uid, tool_request, dialogue_history,
                        response_call_back, send_to_frontend,
                        chat_state,
                        show_plan_widget=False
                    )
                else:
                    # It's the last mod call => show widget only if it succeeds
                    result = await self._handle_backend_tool(
                        uid, tool_request, dialogue_history,
                        response_call_back, send_to_frontend,
                        chat_state,
                        show_plan_widget=False  # skip widget for now
                    )
                    # Check success
                    if self._is_successful_plan_result(result):
                        # Show plan widget
                        message = AnnotatedMessage(
                            role="assistant",
                            type="plan-widget",
                            content=result["content"],
                            should_respond_tool_call=False
                        )
                        await send_to_frontend(uid, message, store=False)
            else:
                # Unrecognized
                logger.error(f"Error: Tool '{fn_name}' not recognized.")
                async with self.finished_tool_calls_lock:
                    self.finished_tool_calls.setdefault(uid, {})[tool_request["id"]] = {
                        "tool_call_id": tool_request["id"],
                        "content": f"Error: Tool '{fn_name}' not found.",
                        "role": "tool",
                        "name": fn_name
                    }

        return frontend_tool_calls

    async def _handle_frontend_tool(self, uid: str, tool_id: str, future: asyncio.Future, response_call_back):
        logger.info(f"Handling frontend tool call {tool_id} for user {uid}")
        try:
            await asyncio.wait_for(future, timeout=TOOL_CALL_TIMEOUT_DELAY)
        except asyncio.TimeoutError:
            logger.info(f"Tool call {tool_id} for user {uid} timed out.")
            logger.info(f"Cancelling future for tool call {self.active_tool_calls[uid][tool_id]['future']} for user {uid}")
            async with self.active_tool_calls_lock:
                self.active_tool_calls[uid][tool_id]['future'].cancel()
            async with self.finished_tool_calls_lock:
                self.finished_tool_calls.setdefault(uid, {})[tool_id] = self.get_error_tool_response(tool_id)
            await response_call_back(uid, ToolResponseMessage(tool_responses=[]))

    async def _handle_backend_tool(self, uid: str, tool_request: dict, dialogue_history: list[AnnotatedMessage], response_call_back, send_to_frontend, chat_state: str, show_plan_widget: bool) -> Dict[str, Any]:
        logger.info(f"Handling backend tool call {tool_request['id']} for user {uid}")
        tool_id = tool_request["id"]
        tool_name = tool_request["function"]["name"]

        try:
            if tool_name == "generate_plan":
                result = await asyncio.wait_for(self.generate_plan(uid, tool_request, dialogue_history, chat_state), timeout=TOOL_CALL_TIMEOUT_DELAY)
                logger.info(f"Finished tool call {tool_id} for user {uid}: {result}")
                message = AnnotatedMessage(
                    role="assistant",
                    type="plan-widget",
                    content=result["content"],
                    should_respond_tool_call=False
                )
                # If show_plan_widget is True => send widget to user
                if show_plan_widget:
                    id = json.loads(result["content"])["plan"]["workoutsByDay"]
                    id = {
                        day: [{k: v for k, v in workout.items() if k != 'id'} for workout in workouts]
                        for day, workouts in id.items()
                    } # The id's are generated on every reload
                    message = AnnotatedMessage(
                        role="assistant",
                        type="plan-widget",
                        content=result["content"],
                        should_respond_tool_call=False,
                        id=str(id)
                    )
                    await send_to_frontend(uid, message, store=False)

            elif tool_name == "plan-widget":
                plan = await PlanModule.get_current_week_active_plan(uid)
                logger.info(f"Fetched current week active plan for user {uid}: {plan}")

                if not plan:
                    result = {
                        "tool_call_id": tool_id,
                        "content": "No active plan found.",
                        "role": "tool",
                        "name": tool_name
                    }
                else:
                    user_tz_str = await firebase_manager.get_user_timezone(uid)
                    user_tz = pytz.timezone(user_tz_str)
                    plan_dict = PlanModule.serialize_plan(plan.model_dump(), user_tz)

                    result = {
                        "tool_call_id": tool_id,
                        "content": json.dumps({
                            "message": "Succesfully fetched current active plan.",
                            "revision_message": "",
                            "plan": plan_dict
                        }),
                        "role": "tool",
                        "name": tool_name
                    }

                if show_plan_widget:
                    message = AnnotatedMessage(
                        role="assistant",
                        type="plan-widget",
                        content=result["content"],
                        should_respond_tool_call=False
                    )
                    await send_to_frontend(uid, message, store=False)

            elif tool_name == "addWorkout":
                result = await asyncio.wait_for(
                    self.add_workout(uid, tool_request, dialogue_history, chat_state),
                    timeout=TOOL_CALL_TIMEOUT_DELAY
                )
                if show_plan_widget and self._is_successful_plan_result(result):
                    # If requested, show widget now
                    message = AnnotatedMessage(
                        role="assistant",
                        type="plan-widget",
                        content=result["content"],
                        should_respond_tool_call=False
                    )
                    await send_to_frontend(uid, message, store=False)

            elif tool_name == "deleteWorkout":
                result = await asyncio.wait_for(
                    self.delete_workout(uid, tool_request, chat_state),
                    timeout=TOOL_CALL_TIMEOUT_DELAY
                )
                if show_plan_widget and self._is_successful_plan_result(result):
                    message = AnnotatedMessage(
                        role="assistant",
                        type="plan-widget",
                        content=result["content"],
                        should_respond_tool_call=False
                    )
                    await send_to_frontend(uid, message, store=False)
            else:
                logger.error(f"Error: Tool '{tool_name}' not found.")
                result = {
                    "tool_call_id": tool_id,
                    "content": f"Error: Tool '{tool_name}' not found.",
                    "role": "tool",
                    "name": tool_name
                }

            async with self.finished_tool_calls_lock:
                self.finished_tool_calls.setdefault(uid, {})[tool_id] = result
        except asyncio.TimeoutError:
            logger.warning(f"Timeout for tool call {tool_id}")
            async with self.active_tool_calls_lock, self.finished_tool_calls_lock:
                self.finished_tool_calls.setdefault(uid, {})[tool_id] = self.get_error_tool_response(tool_id)
            await response_call_back(uid, ToolResponseMessage(tool_responses=[]))

        return result

    async def finish_tool_responses(self, uid: str, tool_response: ToolResponseMessage) -> ToolResponseMessage:
        logger.info(f"Finishing tool responses for user {uid}: {tool_response.tool_responses}")
        for i, response in enumerate(tool_response.tool_responses):
            async with self.active_tool_calls_lock, self.finished_tool_calls_lock:
                # Only frontend calls can be in the tool response
                if response["tool_call_id"] in self.active_tool_calls.get(uid, {}).keys() and not self.active_tool_calls[uid][response["tool_call_id"]]['future'].cancelled():
                    self.active_tool_calls[uid][response["tool_call_id"]]['future'].set_result(response)
                    self.finished_tool_calls.setdefault(uid, {})[response["tool_call_id"]] = response
                else:
                    logger.warning(f"Received response for unknown tool call {response['tool_call_id']}")
                    tool_response.tool_responses.pop(i)

        async with self.active_tool_calls_lock:
            active_calls = [call for call in self.active_tool_calls.get(uid, {}).values()]
            try:
                if self.active_tool_calls.get(uid, {}):
                    await asyncio.wait([call['future'] if 'future' in call.keys() else call['task'] for call in active_calls], timeout=TOOL_CALL_TIMEOUT_DELAY)
            except asyncio.TimeoutError:
                logger.warning("Timeout occurred while waiting for tool responses.")
                for tool_call_id, future in [(call, call['future']) if 'future' in call.keys() else (call, call['task']) for call in active_calls]:
                    try:
                        if not future.done():
                            future.cancel()
                        self.finished_tool_calls.setdefault(uid, {})[tool_call_id] = self.get_error_tool_response(tool_call_id)
                    except asyncio.CancelledError:
                        logger.warning(f"Future for tool call {tool_call_id} was already cancelled or type incompatible.")

        async with self.active_tool_calls_lock, self.finished_tool_calls_lock:
            self.active_tool_calls[uid] = {}
            all_responses = list(self.finished_tool_calls.get(uid, {}).values())
            self.finished_tool_calls[uid] = {}

        async with self.finished_tool_calls_lock:
            return ToolResponseMessage(tool_responses=all_responses)

    def get_error_tool_response(self, tool_call_id: str, content: str = "Timeout occurred while waiting for tool responses.") -> dict:
        return {
            "tool_call_id": tool_call_id,
            "content": content,
            "role": "tool",
            "name": "error",
        }
