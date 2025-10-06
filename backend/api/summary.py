from fastapi import APIRouter, HTTPException, Header
from backend.api.auth import verify_token
import logging

from backend.api.models import HKChartSummaryRequest, InsightsSummaryRequest, JourneySummaryRequest, AmbientSummaryRequest, SummaryResponse
from backend.llm.llm_provider import LLMProvider
from backend.llm.prompts import PromptLoader
from backend.managers.firebase_manager import FirebaseManager
from backend.modules.memory_module import MemoryModule
from backend.modules.plan_module import PlanModule
from backend.utils.ambient_display_utils import get_workout_category_and_size

plan_module = PlanModule()
memory_module = MemoryModule()
firebase_manager = FirebaseManager()

llm_client = LLMProvider.get_client()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/summary")


@router.post("/hkchart", response_model=SummaryResponse)
async def get_hk_chart_summary(
    request: HKChartSummaryRequest,
    authorization: str = Header(None)
):
    """
    Accepts a single string 'summaryText' that the client has already formatted,
    describing the current + 2 previous periods. 
    Returns a dummy LLM-based description.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    uid = await verify_token(token)
    logger.info(f"User {uid} requesting hkchart insights. summaryText length={len(request.summaryText)}")

    previous_summaries = await memory_module.retrieve_memory(uid)
    if previous_summaries:
        previous_summaries = f"\n\n# Summary of Past Conversations:\n{previous_summaries}\n\n"
    else:
        previous_summaries = ""
        
    tz_str = await firebase_manager.get_user_timezone(uid)
    full_plan_history = await PlanModule.get_weekly_plan_history(uid)  

    prompt = PromptLoader.chart_summary_prompt(
        request.summaryText,
        tz_str,
        previous_summaries,
        full_plan_history
    )
    
    messages = [{"role": "system", "content": prompt}]

    response = await llm_client.chat_completion(messages=messages)
    if not response:
        raise Exception("Empty response generated.")
    return SummaryResponse(summary=response)


@router.post("/insights", response_model=SummaryResponse)
async def get_insights_summary(
    request: InsightsSummaryRequest,
    authorization: str = Header(None)
):
    """
    Accepts a single string 'summaryText' describing the overall insights
    from multiple sample types for a single period. Returns dummy LLM summary.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    uid = await verify_token(token)
    logger.info(f"User {uid} requesting summary insights. summaryText length={len(request.summaryText)}")

    previous_summaries = await memory_module.retrieve_memory(uid)
    if previous_summaries:
        previous_summaries = f"\n\n# Summary of Past Conversations:\n{previous_summaries}\n\n"
    else:
        previous_summaries = ""
        
    tz_str = await firebase_manager.get_user_timezone(uid)
    full_plan_history = await PlanModule.get_weekly_plan_history(uid)  

    prompt = PromptLoader.insights_summary_prompt(
        request.summaryText,
        tz_str,
        previous_summaries,
        full_plan_history
    )
    messages = [{"role": "system", "content": prompt}]

    response = await llm_client.chat_completion(messages=messages)
    if not response:
        raise Exception("Empty response generated.")
    return SummaryResponse(summary=response)

@router.post("/journey", response_model=SummaryResponse)
async def get_journey_summary(
    request: JourneySummaryRequest,
    authorization: str = Header(None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    uid = await verify_token(token)
    logger.info(f"User {uid} requesting journey summary for week {request.weekIndex}")

    previous_summaries = await memory_module.retrieve_memory(uid)
    if previous_summaries:
        previous_summaries = f"\n\n# Summary of Past Conversations:\n{previous_summaries}\n\n"
    else:
        previous_summaries = ""
        
    tz_str = await firebase_manager.get_user_timezone(uid)
    full_plan_history = await PlanModule.get_weekly_plan_history(uid)
    ambient_display_history = await PlanModule.get_ambient_display_history(uid)  

    prompt = PromptLoader.journey_summary_prompt(
        request.weekIndex,
        tz_str,
        previous_summaries,
        full_plan_history,
        ambient_display_history
    )
    messages = [{"role": "system", "content": prompt}]

    response = await llm_client.chat_completion(messages=messages)
    if not response:
        raise Exception("Empty response generated.")
    return SummaryResponse(summary=response)

@router.post("/ambient", response_model=SummaryResponse)
async def get_ambient_summary(
    request: AmbientSummaryRequest,
    authorization: str = Header(None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1]
    uid = await verify_token(token)
    logger.info(f"User {uid} requesting ambient summary {request}")

    
    previous_summaries = await memory_module.retrieve_memory(uid)
    if previous_summaries:
        previous_summaries = f"\n\n# Summary of Past Conversations:\n{previous_summaries}\n\n"
    else:
        previous_summaries = ""
        
    tz_str = await firebase_manager.get_user_timezone(uid)
    full_plan_history = await PlanModule.get_weekly_plan_history(uid)
    ambient_display_history = await PlanModule.get_ambient_display_history(uid)

    critter_templates = {
        "cardio-aerobic": ("red", "butterfly"),
        "strength-conditioning": ("orange", "butterfly"),
        "team-combat": ("green", "butterfly"),
        "mind-body-dance": ("yellow", "butterfly"),
        "misc-recovery": ("purple", "butterfly"),
        "outdoor-rec": ("blue", "butterfly"),
        "walk": ("yellow", "bee")
    }

    critters_list = []
    for w in request.critters:
        # e.g. "cardio-aerobic-small.png"
        category_fname = get_workout_category_and_size(w.type, w.durationMin)
        category = "-".join(category_fname.split("-")[:-1])
        color, creature = critter_templates.get(category, ("gray", "butterfly"))
        critters_list.append(f"{color} {creature}")

    critter_str = ", ".join(critters_list)

    prompt = PromptLoader.ambient_summary_prompt(
        week_index=request.weekIndex + 1,
        timezone_str=tz_str,
        summaries=previous_summaries,
        plan_history=full_plan_history,
        ambient_display_history=ambient_display_history,
        control_diff_str=request.diffString,
        critter_str=critter_str
    )
    messages = [{"role": "system", "content": prompt}]
    response = await llm_client.chat_completion(messages=messages)
    if not response:
        raise Exception("Empty response generated.")
    return SummaryResponse(summary=response)