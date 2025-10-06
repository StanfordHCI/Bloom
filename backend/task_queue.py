from apscheduler.schedulers.asyncio import AsyncIOScheduler # type: ignore
from apscheduler.jobstores.base import JobLookupError # type: ignore
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

class TaskQueue:
    """
    A singleton class to manage scheduled tasks using APScheduler's AsyncIO capabilities.

    The TaskQueue allows for adding, removing, and managing asynchronous tasks with precise scheduling.
    It is built on top of APScheduler and is configured to use in-memory storage for job metadata and
    async executors to handle task execution.
    """
    _instance = None

    # in-memory dictionary (user_id, key) -> set of job_ids
    notifications_index: dict[tuple[str, str], set] = defaultdict(set)
    _did_rebuild_index = False

    def __new__(cls: type["TaskQueue"]) -> "TaskQueue":
        if cls._instance is None:
            cls._instance = object.__new__(cls)
            cls._instance.scheduler = None
        return cls._instance

    def start(self, db_url="sqlite:///obs.sqlite"):
        if self.scheduler is not None:
            logger.warning("TaskQueue scheduler already started.")
            return
        
        jobstores = {
            "default": {"type": "sqlalchemy", "url": db_url}
        }

        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            jobdefaults={'misfire_grace_time': 15*60}
        )
        self.scheduler.start()
        logger.debug("TaskQueue initialized and scheduler started.")

        if not self._did_rebuild_index:
            self.rebuild_notification_index()
            self._did_rebuild_index = True

    def add_task(self, func, trigger, args=None, kwargs=None, job_id=None):
        """
        Adds a new task to the scheduler.

        Parameters:
            func (callable): The function to execute.
            trigger (apscheduler.triggers.base.BaseTrigger): The trigger defining when the task should run.
            args (list): Positional arguments for the `func` (optional).
            kwargs (dict): Keyword arguments for the `func` (optional).
            job_id (str): Unique identifier for the task. If a job with the same ID exists, it is replaced.

        Returns:
            apscheduler.job.Job: The scheduled job instance.

        Logs an error if the task fails to be added.
        """
        try:
            logger.debug(f"Task with job_id: {job_id} added to queue with trigger: {trigger} for func: {func}, args: {args}, kwargs: {kwargs}.")
            job = self.scheduler.add_job(
                func, 
                trigger, 
                args=args, 
                kwargs=kwargs, 
                id=job_id, 
                replace_existing=True, 
                misfire_grace_time=10*60 # 10 minutes
            )
            return job
        except Exception as e:
            logger.error(f"Failed to add task to queue with job_id: {job_id}. Error: {e}")


    def remove_task(self, job_id):
        """
        Removes a task from the scheduler by its `job_id`.

        Parameters:
            job_id (str): The unique identifier of the task to remove.

        Logs an error if the task cannot be found or fails to be removed.
        """
        try:
            self.scheduler.remove_job(job_id)
            logger.debug(f"Task with job_id: {job_id} removed from queue.")
        except JobLookupError:
            logger.warning(f"Task with job_id: {job_id} not found in queue.")
        except Exception as e:
            logger.warning(f"Failed to remove task with job_id: {job_id}. Error: {e}")

    def get_all_tasks(self):
        """
        Returns a list of all scheduled tasks in the queue.

        Returns:
            list: A list of scheduled job instances.
        """
        return self.scheduler.get_jobs()

    def shutdown(self):
        """
        Shuts down the scheduler gracefully, allowing any running tasks to complete.

        This is typically called when the application is shutting down to clean up resources.
        """
        logger.debug("Shutting down TaskQueue.")
        self.scheduler.shutdown()

    def rebuild_notification_index(self):
        """
        On service startup, rebuild the notifications_index by parsing the job IDs
        in the scheduler's job store.
        
        Protocol:
            {task_type}_{user_id}_{key}  (for morning/evening/complete)
            checkin_{user_id}_{suffix}   (for checkins)
        """
        all_jobs = self.get_all_tasks()
        logger.info(f"Rebuilding notifications_index from {len(all_jobs)} existing jobs...")
        for job in all_jobs:
            job_id = job.id
            try:
                parts = job_id.split("_")
                if len(parts) < 3:
                    continue
                task_type = parts[0]
                user_id = parts[1]

                if task_type in ("morning", "evening", "workout"):
                    # e.g. morning_<uid>_<workout_id>, evening_<uid>_<workout_id>, complete_<uid>_<workout_id>
                    key = parts[2]
                    self.notifications_index[(user_id, key)].add(job_id)

                elif task_type == "checkin":
                    # e.g. checkin_<uid>
                    # always store in (uid, "checkin")
                    key = "checkin"
                    self.notifications_index[(user_id, key)].add(job_id)

                else:
                    logger.warning(f"Unknown task_type in job_id: {job_id}")

            except Exception as e:
                logger.error(f"Error parsing job_id {job_id}: {e}")
        
        logger.info("Rebuild of notifications_index is complete.")
