from abc import ABC
import copy

from pydantic import BaseModel, Field

from backend.llm.models import AnnotatedMessage
from backend.llm.prompts import PromptLoader
from backend.task_queue import TaskQueue
from backend.managers.firebase_manager import FirebaseManager
from apscheduler.triggers.date import DateTrigger # type: ignore
from datetime import datetime, timedelta
import logging
from backend.llm.llm_provider import LLMProvider
from backend.config import AT_WILL_SUMMARY_TIMEOUT_DELAY
from backend.utils.date_utils import get_current_iso_datetime_str

logger = logging.getLogger(__name__)

firebase_manager = FirebaseManager()
llm_client = LLMProvider.get_client()
task_queue = TaskQueue() 

class ChatSummary(BaseModel):
    """
    An object con
    """
    long_summary: str = Field(..., description="The long summary of the conversation. This summary is intended for an AI health coach to use in future sessions with the user. It should contain important details and insights from the conversation that will be relevant in future conversations.")
    headline: str = Field(..., description="A headline summarizing the conversation. No longer than 50 characters. This summary is intended for the user to quickly understand the key points of the conversation.")


class MemoryModule(ABC):
    @staticmethod
    async def retrieve_memory(uid: str) -> str:
        """Get all summaries for a user."""
        try:
            summaries = await firebase_manager.get_all_summaries(uid)
            logger.debug(f"Retrieved {len(summaries)} summaries for uid: {uid}")
            return '\n'.join(summaries)
        except Exception as e:
            logger.error(f"Error retrieving memory for uid {uid}: {e}")
            return ""
    
    @staticmethod
    async def summarize(uid: str, annotated_history: list[AnnotatedMessage]) -> ChatSummary:
        """Summarize conversation history using OpenAI."""
        if not annotated_history:
            logger.error("No conversation history to summarize.")
            raise Exception("No conversation history to summarize.")
        
        try:
            timezone_str = await firebase_manager.get_user_timezone(uid)
            prompt = PromptLoader.summarize_memory_prompt(timezone_str, annotated_history)
            messages = [{"role": "system", "content": prompt}]
            
            summary: ChatSummary = await llm_client.chat_completion_structured(
                messages=messages,
                response_format=ChatSummary
            )
            if not summary:
                raise Exception("Empty summary generated.")
            logger.info(f"Successfully generated summary: {summary.long_summary[:100]}...")
            return summary
        except Exception as e:
            logger.error(f"Failed to summarize conversation: {e}")
            raise Exception("Failed to summarize conversation.")

    @staticmethod
    async def store_summary(uid: str, session_id: str, summary: ChatSummary) -> None:
        """Store summary in Firebase as a field in the messages document."""
        try:
            # Get reference to the messages document
            messages_doc_ref = firebase_manager.get_user_doc_ref(uid).collection('gpt-messages').document(session_id)
            messages_doc = await messages_doc_ref.get()

            if not messages_doc.exists:
                logger.error(f"Messages document for session {session_id} does not exist.")
                return

            # Update the document to add/update summary field while preserving messages
            await messages_doc_ref.update({
                "summary": summary.long_summary,
                "headline": summary.headline,
                "summary_timestamp": get_current_iso_datetime_str()
            })
            logger.info(f"Summary stored for user {uid}, session {session_id} in Firebase")

        except Exception as e:
            logger.error(f"Failed to store summary for user {uid}, session {session_id}: {e}")
            raise
    
    @staticmethod
    async def save_summary(uid: str, session_id: str, annotated_history: list[AnnotatedMessage]):
        """Generate and store summary."""
        try:
            logger.info(f"Generating summary for session {session_id}")
            summary = await MemoryModule.summarize(uid, annotated_history)
            await MemoryModule.store_summary(uid, session_id, summary)
            logger.info(f"Summary generated and stored for session {session_id}")
        except Exception as e:
            logger.error(f"Error in save_summary for session {session_id}: {e}")

    @staticmethod
    def schedule_summary(uid: str, session_id: str, annotated_history: list[AnnotatedMessage]) -> None:
        """Schedule summary generation."""
        logger.debug(f"Scheduling summary for user {uid}, session {session_id}, with {len(annotated_history)} messages.")
        
        # Remove the previous summary task if it exists
        job_id = f"summarize_{uid}_{session_id}"
        if task_queue.scheduler.get_job(job_id):
            task_queue.remove_task(job_id)
        
        # Schedule the new summary task to run after 2 hours
        run_time = datetime.now() + timedelta(minutes=AT_WILL_SUMMARY_TIMEOUT_DELAY)
        task_queue.add_task(
            func=MemoryModule.save_summary,
            trigger=DateTrigger(run_date=run_time),
            args=[uid, session_id, copy.deepcopy(annotated_history)],
            job_id=job_id
        )
        logger.info(f"Scheduled summary task for user {uid}, session {session_id} at {run_time}")