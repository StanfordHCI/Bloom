import os
from dotenv import load_dotenv

import logging
logger = logging.getLogger(__name__)

APP_ENV = os.getenv("APP_ENV")
assert APP_ENV is not None, "APP_ENV is not set"
dotenv_file = f".env.{APP_ENV}"
load_dotenv(dotenv_file)

BACKEND_PORT = int(os.getenv("BACKEND_PORT", 5001))

if APP_ENV == "local":
    FIREBASE_EMULATOR_HOST = "localhost"
elif APP_ENV == "device":
    FIREBASE_EMULATOR_HOST = os.getenv("LOCAL_IP", "localhost")
else:
    FIREBASE_EMULATOR_HOST = os.getenv("FIREBASE_EMULATOR_HOST", "localhost")

# Firebase Config
STUDY_ID = os.getenv("STUDY_ID", "testing")
USE_FIREBASE_EMULATOR = os.getenv("USE_FIREBASE_EMULATOR", "false").lower() == "true"
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET")
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
FIREBASE_AUTH_EMULATOR_PORT = os.getenv("FIREBASE_AUTH_EMULATOR_PORT", "9099")
FIREBASE_FIRESTORE_EMULATOR_PORT = os.getenv("FIREBASE_FIRESTORE_EMULATOR_PORT", "8080")
FIREBASE_STORAGE_EMULATOR_PORT = os.getenv("FIREBASE_STORAGE_EMULATOR_PORT", "9199")

# LLM Config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")

# How many minutes before an inactive session is automatically closed
AT_WILL_SUMMARY_TIMEOUT_DELAY = 0.5 # 1 minute
# How many seconds before a tool call is considered timed out
TOOL_CALL_TIMEOUT_DELAY = 120 # 2 minutes
CHECK_IN_DELAY = 1440 # 24 hours

# Sentry Config
USE_SENTRY = os.getenv("USE_SENTRY", "false").lower() == "true"
SENTRY_DSN = os.getenv("SENTRY_DSN_PYTHON")

# log all environment variables
logger.info("––––– Environment variables –––––")
logger.info(f"APP_ENV: {APP_ENV}")
logger.info(f"BACKEND_PORT: {BACKEND_PORT}")
logger.info(f"USE_FIREBASE_EMULATOR: {USE_FIREBASE_EMULATOR}")
logger.info(f"FIREBASE_EMULATOR_HOST: {FIREBASE_EMULATOR_HOST}")
logger.info(f"STUDY_ID: {STUDY_ID}")
