import os
import logging
from datetime import datetime, timedelta
import pytz
import threading

import firebase_admin  # type: ignore
from firebase_admin import auth, credentials, firestore_async, firestore as firestore_sync, storage

from google.cloud.firestore_v1.async_document import AsyncDocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_collection import AsyncCollectionReference
from google.cloud.firestore_v1 import ArrayUnion

from backend import config
from backend.api.models import ChatState
from backend.llm.models import AnnotatedMessage
from backend.utils.date_utils import get_current_iso_datetime

logger = logging.getLogger(__name__)

class FirebaseManager:
    _instance = None
    _singleton_lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._singleton_lock:
                if cls._instance is None:
                    cls._instance = super(FirebaseManager, cls).__new__(cls)
                    cls._instance.app = None
                    cls._instance.async_db = None
                    cls._instance.sync_db = None
                    cls._instance.auth = None
        return cls._instance

    def initialize_firebase_app(self) -> "FirebaseManager":
        if config.USE_FIREBASE_EMULATOR:
            logger.info("Initializing Firebase with emulator environment")
            os.environ["FIRESTORE_EMULATOR_HOST"] = f"{config.FIREBASE_EMULATOR_HOST}:{config.FIREBASE_FIRESTORE_EMULATOR_PORT}"
            os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = f"{config.FIREBASE_EMULATOR_HOST}:{config.FIREBASE_AUTH_EMULATOR_PORT}"
            os.environ["STORAGE_EMULATOR_HOST"] = f"http://{config.FIREBASE_EMULATOR_HOST}:{config.FIREBASE_STORAGE_EMULATOR_PORT}"
            os.environ["GCLOUD_PROJECT"] = f"{config.FIREBASE_PROJECT_ID}"
            self.async_db = firestore_async.AsyncClient(project=f"{config.FIREBASE_PROJECT_ID}")
            # Sync client specifically for on_snapshot
            self.sync_db = firestore_sync.Client(project=f"{config.FIREBASE_PROJECT_ID}")
            
            cred = credentials.Certificate(config.FIREBASE_SERVICE_ACCOUNT_PATH)
            self.app = firebase_admin.initialize_app(cred, {
                "storageBucket": config.FIREBASE_STORAGE_BUCKET
            })
        else:
            logger.info("Initializing Firebase with production environment")
            cred = credentials.Certificate(config.FIREBASE_SERVICE_ACCOUNT_PATH)
            self.app = firebase_admin.initialize_app(cred)
            self.sync_db = firestore_sync.client()
            self.async_db = firestore_async.client()            

        self.auth = auth
        self.bucket = storage.bucket(config.FIREBASE_STORAGE_BUCKET, app=self.app)
        return self

    def get_users_col_ref(self) -> AsyncCollectionReference:
        return self.async_db.collection(f'studies/{config.STUDY_ID}/users')

    def get_user_doc_ref(self, user_id: str) -> AsyncDocumentReference:
        return self.async_db.collection(f'studies/{config.STUDY_ID}/users').document(user_id)
    
    # -----------------------------------------------------------------
    # Synchronous references for real-time on_snapshot
    # -----------------------------------------------------------------
    def get_sync_users_col_ref(self) -> firestore_sync.CollectionReference:
        """Sync reference to 'users' collection."""
        return self.sync_db.collection(f"studies/{config.STUDY_ID}/users")

    def get_sync_user_doc_ref(self, user_id: str) -> firestore_sync.DocumentReference:
        """Sync reference to a single user doc."""
        return self.sync_db.collection(f"studies/{config.STUDY_ID}/users").document(user_id)    

    async def is_valid_user_id(self, user_id: str) -> bool:
        # Returns true if the user id is valid, false otherwise using async
        user_doc_ref = self.get_user_doc_ref(user_id)
        user_doc: DocumentSnapshot = await user_doc_ref.get()
        return user_doc.exists

    def verify_token(self, token: str) -> str:
        decoded_token = self.auth.verify_id_token(token)
        logger.debug(f"Token verified successfully, uid = {decoded_token['uid']}")
        return decoded_token['uid']

    def get_root_path(self) -> str:
        return f'studies/{config.STUDY_ID}'

    async def _get_all_sessions_for_user(self, uid: str) -> list[DocumentSnapshot]:
        """
        Returns all gpt-messages session documents (as snapshots) for the given user.
        """
        collection_ref = self.get_user_doc_ref(uid).collection('gpt-messages')
        docs = [doc async for doc in collection_ref.stream()]
        return docs

    async def _session_ended_with_goodbye(self, uid: str, session_id: str) -> bool:
        """
        Returns True if the last message in the given session has end_state='goodbye'
        """
        doc_ref = self.get_user_doc_ref(uid).collection('gpt-messages').document(session_id)
        doc_snapshot = await doc_ref.get()
        if not doc_snapshot.exists:
            return False

        data = doc_snapshot.to_dict() or {}
        messages = data.get("messages", [])
        if not messages:
            return False

        for msg in messages:
            if msg.get("end_state") == "goodbye":
                return True
        
        return False
    
    
    async def fetch_most_recent_session_id(self, uid: str, chat_state: ChatState) -> str:
        """
        Fetches the most recent session ID for a user or creates a new session ID 
        if no recent session is found within the last SESSION_TIMEOUT_DELAY minutes.
        """
        collection_ref = self.get_user_doc_ref(uid).collection('gpt-messages')
        
        def extract_timestamp(filename):
            timestamp_str = filename.split('session-')[-1]
            timestamp = datetime.fromisoformat(timestamp_str)
            return timestamp

        session_ids = [doc.id async for doc in collection_ref.stream()]

        current_time = get_current_iso_datetime()
        current_time_str = current_time.isoformat()
        
        if not session_ids:
            most_recent_session_id = f"session-{current_time_str}"
            return most_recent_session_id
        
        all_sessions = await self._get_all_sessions_for_user(uid)

        # 2) Filter for those whose stored "chatState" matches the argument
        matching_sessions = []
        for doc_snapshot in all_sessions:
            data = doc_snapshot.to_dict() or {}
            if data.get("chatState") == chat_state.value:
                matching_sessions.append(doc_snapshot) 
        
        # Find the "most recent" by doc ID time
        most_recent_session_id = None  # type: ignore
        if matching_sessions:
            most_recent_doc = max(matching_sessions, key=lambda d: extract_timestamp(d.id))
            most_recent_session_id = most_recent_doc.id
        
        # -----------------------------------------------
        # (A) Onboarding logic
        # -----------------------------------------------
        if chat_state.value == ChatState.ONBOARDING.value:
            # If a matching onboarding session exists, ALWAYS reuse
            if most_recent_session_id:
                logger.info(f"Reusing onboarding session {most_recent_session_id} for user {uid}")
                return most_recent_session_id
            else:
                # Otherwise, create new
                new_session_id = f"session-{current_time_str}"
                logger.info(f"No existing onboarding session for user {uid}, creating new: {new_session_id}")
                return new_session_id        
        
        # -----------------------------------------------
        # (B) Checkin logic
        # -----------------------------------------------
        if chat_state.value == ChatState.CHECK_IN.value:
            if most_recent_session_id:
                ended = await self._session_ended_with_goodbye(uid, most_recent_session_id)
                if ended:
                    # If session ended with goodbye but occurred within 24 hours, resume the session.
                    most_recent_session_time = extract_timestamp(most_recent_session_id)
                    time_diff = current_time - most_recent_session_time
                    
                    if time_diff <= timedelta(hours=24):
                        logger.info(f"Reusing checkin session {most_recent_session_id} for user {uid} (resuming within 24h despite goodbye)")
                        return most_recent_session_id
                    else:
                        new_session_id = f"session-{current_time_str}"
                        logger.info(f"Checkin session {most_recent_session_id} ended with goodbye and is older than 24h. Creating new session {new_session_id} for user {uid}")
                        return new_session_id
                else:
                    logger.info(f"Reusing active checkin session {most_recent_session_id} for user {uid}")
                    return most_recent_session_id
            else:
                new_session_id = f"session-{current_time_str}"
                logger.info(f"No checkin sessions found for user {uid}, creating new: {new_session_id}")
                return new_session_id
        
        # -----------------------------------------------
        # (C) At-will (or fallback) logic
        # -----------------------------------------------
        if chat_state.value == ChatState.AT_WILL.value:
            # If we have no at-will sessions, just create one
            if not most_recent_session_id:
                new_session_id = f"session-{current_time_str}"
                logger.info(f"No at-will sessions found. Creating new session {new_session_id} for user {uid}")
                return new_session_id

            # We do day-based logic for AT_WILL
            user_tz_str = await self.get_user_timezone(uid)
            user_tz = pytz.timezone(user_tz_str)
            now_local_date = current_time.astimezone(user_tz).date()

            # Convert the existing most_recent_session_id to local date
            most_recent_session_time = extract_timestamp(most_recent_session_id)
            most_recent_local_date = most_recent_session_time.astimezone(user_tz).date()

            if most_recent_local_date == now_local_date:
                # Same day => resume at-will
                logger.info(f"Resuming at-will session {most_recent_session_id} for user {uid}because it's the same local day")
                return most_recent_session_id
            else:
                # Different local day => create new
                new_session_id = f"session-{current_time_str}"
                logger.info(f"Creating new at-will session {new_session_id} for user {uid} (previous session was from a different day)")
                return new_session_id
        
        logger.error(f"Invalid chat state: {chat_state}, defaulting to creating new session")
        new_session_id = f"session-{current_time_str}"
        return new_session_id                     
    
    async def get_user_timezone(self, uid: str) -> str:
        """
        Fetches the user's timezone from their user docuemnt.
        """
        if not await self.is_valid_user_id(uid):
            raise ValueError(f"Invalid user ID: {uid}")

        user_doc = await self.get_user_doc_ref(uid).get()
        user_doc_dict = user_doc.to_dict()

        if user_doc_dict is None:
            raise ValueError(f"User document not found for user ID: {uid}")

        if 'timezone' in user_doc_dict:
            return user_doc_dict['timezone']
        else:
            raise ValueError(f"Timezone token not found for user ID: {uid}")
        
    def get_sync_user_timezone(self, uid: str) -> str:
        """
        Synchronous version of get_user_timezone that uses the sync Firestore client.
        Raises ValueError if user doc or timezone is missing.
        """
        user_doc_ref = self.get_sync_user_doc_ref(uid)
        doc_snapshot = user_doc_ref.get()  # synchronous get
        if not doc_snapshot.exists:
            raise ValueError(f"User document does not exist for user ID: {uid}")
        
        user_data = doc_snapshot.to_dict() or {}
        if 'timezone' not in user_data:
            raise ValueError(f"Timezone not found for user ID: {uid}")
        
        return user_data['timezone']        

    async def get_apns_token(self, uid: str) -> str:
        """
        Fetches a user's APNs token from their user document.
        """
        if not await self.is_valid_user_id(uid):
            raise ValueError(f"Invalid user ID: {uid}")

        user_doc = await self.get_user_doc_ref(uid).get()
        user_doc_dict = user_doc.to_dict()

        if user_doc_dict is None:
            raise ValueError(f"User document not found for user ID: {uid}")

        if 'apnsToken' in user_doc_dict:
            return user_doc_dict['apnsToken']
        else:
            raise ValueError(f"APNs token not found for user ID: {uid}")

    async def get_user_chat_state(self, uid: str) -> str:
        """
        Fetches the user's chat agent from their user document.
        """
        user_doc = await self.get_user_doc_ref(uid).get()
        user_doc_dict = user_doc.to_dict()
        
        try:
            if user_doc_dict is not None: 
                if (not user_doc.exists) or ('chat_state' not in user_doc_dict):
                    user_doc_ref = self.get_user_doc_ref(uid)
                    await user_doc_ref.set({
                        "chat_state": "onboarding"
                    }, merge=True)
                    return "onboarding"                        
                else:
                    return user_doc_dict['chat_state']
            else:
                raise ValueError(f"User document not found for user ID: {uid}")
        except Exception as e:
            raise ValueError(f"User document Chat State not found for user ID: {uid}, error: {e}")

    async def update_user_chat_state(self, uid: str, new_chat_state: str) -> None:
        """
        Updates the user's chat_state field to the given new_chat_state.
        Creates the user document if it does not exist.
        """
        user_doc_ref = self.get_user_doc_ref(uid)
        
        # Merge = True ensures that only 'chat_state' is updated/added
        await user_doc_ref.set({
            "chat_state": new_chat_state
        }, merge=True)

        logger.info(f"Chat state updated for user {uid} to '{new_chat_state}'")        
   
    async def get_user_workout_plan_ids(self, uid: str) -> list[str]:
        """
        Fetch all plan_doc_ids for the given uid.
        Each plan document is stored in the 'plans' sub-collection under the user's doc.
        """
        user_plans_ref = self.get_user_doc_ref(uid).collection('plans')
        plan_doc_ids = []
        async for doc_snapshot in user_plans_ref.stream():
            plan_doc_ids.append(doc_snapshot.id)
        return plan_doc_ids            
        
    async def load_conversation_history(self, uid: str, chat_state: ChatState) -> tuple[str, list[AnnotatedMessage]]:
        """
        Loads the conversation history for a user from Firebase.
        """
        logging.info("Loading conversation history from Firebase for user: " + uid)
        session_id = await self.fetch_most_recent_session_id(uid, chat_state)
        messages_doc_ref = self.get_user_doc_ref(uid).collection('gpt-messages').document(session_id)
        messages_doc = await messages_doc_ref.get()

        if not messages_doc.exists:
            # Initialize document with empty messages array
            await messages_doc_ref.set({
                "messages": [],
                "chatState": chat_state.value
            }, merge=True)
            return session_id, []

        message_dicts = messages_doc.to_dict().get("messages", []) 
        annotated_history = AnnotatedMessage.get_annotated_message_history(message_dicts)

        return session_id, annotated_history
    
    async def end_conversation(self, uid: str, annotated_history: list[AnnotatedMessage]) -> None:
        """
        Verifies that all messages in the conversation history have been synced to Firebase.
        Currently a placeholder.
        """
        pass

    async def write_message_to_firebase(self, uid: str, session_id: str, annotated_message: AnnotatedMessage):
        """
        Writes a message to Firebase.
        """
        logging.info(f"Writing message to Firebase for user {uid} in session {session_id}: {annotated_message}")
        messages_doc_ref = self.get_user_doc_ref(uid).collection('gpt-messages').document(session_id) 

        # convert annotated message to dictionary
        message_dict = annotated_message.to_dict()
        await messages_doc_ref.update({"messages": ArrayUnion([message_dict])})

    async def write_all_messages_to_firebase(self, uid: str, session_id: str, annotated_history: list[AnnotatedMessage]):
        """
        Verifies all messages in `annotated_history` are stored in Firebase.
        """
        messages_doc_ref = self.get_user_doc_ref(uid).collection('gpt-messages').document(session_id)
        doc = await messages_doc_ref.get()
        current_messages = doc.to_dict().get("messages", []) if doc.exists else []
        current_message_ids = {msg.get("id") for msg in current_messages}

        new_messages = [
            annotated_message.to_dict()
            for annotated_message in annotated_history
            if annotated_message.id not in current_message_ids
        ]

        if new_messages:
            await messages_doc_ref.update({"messages": ArrayUnion(new_messages)})
            logger.info(f"Added {len(new_messages)} new messages to Firebase for user {uid} in session {session_id}")

    async def store_summary(self, uid: str, session_id: str, summary: str):
        """
        Stores the generated summary in Firebase for the user.
        """
        try:
            session_doc_ref = self.get_user_doc_ref(uid).collection('gpt-messages').document(session_id)
            session_doc = await session_doc_ref.get()

            if not session_doc.exists:
                logger.info(f"Session {session_id} not found for user {uid}")
                return

            await session_doc_ref.update({
                "summary": summary,
                "summary_timestamp": datetime.utcnow().isoformat()
            })
            logger.info(f"Summary stored for user {uid}")
            
        except Exception as e:
            logger.error(f"Failed to store summary for uid {uid}: {e}")

    async def get_all_summaries(self, uid: str) -> list[str]:
        """
        Fetches all summaries for a user from Firebase.
        """
        summaries = []
        session_collection_ref = self.get_user_doc_ref(uid).collection('gpt-messages')
        async for doc in session_collection_ref.stream():
            session = doc.to_dict()
            summary = session.get("summary")
            if summary:
                summaries.append(summary)

        return summaries

    def upload_ambient_display_image(self, uid: str, image_key: str, image_bytes: bytes) -> str:
        if not self.bucket:
            raise ValueError("Firebase Storage bucket not initialized.")
        
        file_path = f"{uid}/{image_key}.jpg"
        blob = self.bucket.blob(file_path)
        blob.upload_from_string(image_bytes, content_type="image/jpeg")
        return f"gs://{config.FIREBASE_STORAGE_BUCKET}/{file_path}"
