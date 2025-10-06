from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.task_queue import TaskQueue
from backend.managers.firebase_manager import FirebaseManager
from backend.listeners.user_listener import UserListener
from backend.api import chat, auth, summary, widgets
from backend import config

import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
import logging
logging.basicConfig(
    level=logging.DEBUG,  # Set the minimum logging level (DEBUG, INFO, WARNING, etc.)
    format='%(asctime)s - %(levelname)s - %(name)s:%(filename)s:%(lineno)d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Suppress logging from external modules
for module in [
    "google",
    "firebase", 
    "urllib3", 
    "asyncio", 
    "httpcore", 
    "httpx", 
    "grpc", 
    "openai", 
    "PIL"
]:
    logging.getLogger(module).setLevel(logging.ERROR)

if config.USE_SENTRY:
    logger.info("Using Sentry")

    sentry_logging = LoggingIntegration(
        level=logging.ERROR,  # Capture events at or above ERROR level
        event_level=logging.ERROR  # Send events to Sentry at or above ERROR level
    )

    sentry_sdk.init(
        dsn=config.SENTRY_DSN,
        traces_sample_rate=1.0,
        integrations=[sentry_logging],
        _experiments={
            "continuous_profiling_auto_start": True,
        },
    )

os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GLOG_minloglevel"] = "2"

app = FastAPI()

async def on_startup():
    # Run when the app starts up
    firebase_manager = FirebaseManager()
    firebase_manager.initialize_firebase_app()

    task_queue = TaskQueue()
    task_queue.start()
    
    UserListener()

async def on_shutdown():
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    await on_startup()
    yield
    await on_shutdown()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(widgets.router)
app.include_router(summary.router)

# An example route to trigger an error
@app.get("/sentry-debug")
async def trigger_error():
    logger.error("Triggering an error to test Sentry")
    division_by_zero = 1 / 0 # noqa: F841

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=config.BACKEND_PORT, reload=True)