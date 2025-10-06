import datetime
import logging
from datetime import timedelta, timezone
from apscheduler.triggers.interval import IntervalTrigger # type: ignore
import numpy as np

from backend.managers.firebase_manager import FirebaseManager
from backend.listeners.plan_listener import PlanListener
from backend.task_queue import TaskQueue
from backend.modules.notification_module import PushNotificationModule
from google.cloud.firestore_v1.base_query import FieldFilter

logger = logging.getLogger(__name__)
task_queue = TaskQueue()

class UserListener:
    """
    Sets up a Firestore snapshot listener on the 'users' collection.
    Whenever new users are added, we initialize a PlanListener for them
    and schedule hourly silent push notifications to refresh the ambient display.
    """

    def __init__(self):
        self.firebase_manager = FirebaseManager()
        self.users = {}  # uid -> PlanListener
        self.last_query_time = datetime.datetime.now(datetime.timezone.utc)

        self.initialize_all_users()
        self.setup_user_collection_listener()

    def initialize_all_users(self):
        logger.info("Initializing PlanListeners for all existing users (sync).")
        users_ref = self.firebase_manager.get_sync_users_col_ref()
        
        for user_doc in users_ref.stream():
            user_id = user_doc.id
            if user_id not in self.users:
                logger.info(f"Found existing user doc: {user_id}. Creating PlanListener.")
                self.initialize_user(user_id)

        logger.info(f"Current user set: {list(self.users.keys())}")

    def setup_user_collection_listener(self):
        """
        Attaches a Firestore snapshot listener (sync client) to detect newly created users.
        """
        users_ref = self.firebase_manager.get_sync_users_col_ref()
        query = users_ref.where(filter=FieldFilter('createdAt', '>', self.last_query_time))

        def on_users_snapshot(docs_snapshot, changes, read_time):
            self.handle_new_user_snapshot(docs_snapshot, changes, read_time)

        query.on_snapshot(on_users_snapshot)

    def handle_new_user_snapshot(self, docs_snapshot, changes, read_time):
        """
        Synchronous callback for newly added user docs.
        """
        logger.info("Received snapshot for new user docs (sync).")
        for change in changes:
            if change.type.name == "ADDED":
                user_doc = change.document
                user_id = user_doc.id
                if user_id not in self.users:
                    logger.info(f"New user doc detected: {user_id}")
                    self.initialize_user(user_id)

        self.last_query_time = datetime.datetime.now(datetime.timezone.utc)

    def initialize_user(self, user_id):
        """
        Creates a PlanListener that also uses the sync references for subcollection on_snapshot.
        """
        user_doc_ref = self.firebase_manager.get_sync_user_doc_ref(user_id)
        plan_listener = PlanListener(user_doc_ref)
        self.users[user_id] = plan_listener
        logger.info(f"Initialized PlanListener for user: {user_id}")

        self.schedule_hourly_silent_update(user_id)

    def schedule_hourly_silent_update(self, user_id: str) -> None:
        offset_minutes = 5 * (0.5 - np.random.random())
        start_time = datetime.datetime.now(timezone.utc) + timedelta(minutes=offset_minutes)

        job_id = f"silent_update_{user_id}"

        existing_job = task_queue.scheduler.get_job(job_id)
        if existing_job:
            logger.info(f"Removing existing hourly silent update job for user={user_id}.")
            task_queue.remove_task(job_id)

        trigger = IntervalTrigger(hours=1, start_date=start_time)

        task_queue.add_task(
            func=PushNotificationModule.send_silent_update,
            trigger=trigger,
            args=[user_id],
            job_id=job_id
        )

        logger.info(f"Scheduled hourly silent update for user={user_id} (first run at ~{start_time.isoformat()}, then every hour).")
