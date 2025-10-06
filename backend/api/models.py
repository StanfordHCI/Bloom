from pydantic import BaseModel
from typing import Literal
from enum import Enum
import uuid

# Chat

class ChatState(Enum):
    ONBOARDING = "onboarding"
    AT_WILL = "at-will"
    CHECK_IN = "check-in"

class UserChatMessage(BaseModel):
    type: Literal["message"] = "message"
    role: Literal["user"] = "user"
    content: str
    id: str

class ToolResponseMessage(BaseModel):
    role: Literal["tool_responses"] = "tool_responses"
    tool_responses: list[dict[str, str]]
    id: str = str(uuid.uuid4())

# Widgets

class HKWorkoutData(BaseModel):
    id: str
    workoutType: str
    durationMin: float
    timeStart: str
    source: str

class WidgetUpdateRequest(BaseModel):
    workouts: list[HKWorkoutData]
    width: int
    height: int

class NextWorkoutModel(BaseModel):
    dayName: str
    timeString: str
    type: str
    durationMin: int

class WidgetUpdateResponse(BaseModel):
    progress: float
    nextWorkout: NextWorkoutModel
    imageURL: str

# Insights

class HKChartSummaryRequest(BaseModel):
    summaryText: str

class InsightsSummaryRequest(BaseModel):
    summaryText: str

# Summaries

class JourneySummaryRequest(BaseModel):
    weekIndex: int

class CritterWorkout(BaseModel):
    type: str
    durationMin: float

class AmbientSummaryRequest(BaseModel):
    weekIndex: int
    diffString: str
    critters: list[CritterWorkout] = []

class SummaryResponse(BaseModel):
    summary: str