import threading
from fastapi import WebSocket
import asyncio
from tenacity import retry, stop_after_attempt, wait_random_exponential

import logging
logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    This class manages the WebSocket connections such that multiple users can connect to the server and chat at the same time.
    """

    _instance = None
    _singleton_lock = threading.Lock() # need to use threading.Lock instead of asyncio.Lock because __new__ is synchronous

    def __new__(cls):
        if cls._instance is None:
            with cls._singleton_lock:
                if cls._instance is None:
                    cls._instance = super(ConnectionManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, "initialized"):  # Initialize only once
            self.active_connections: dict[str, WebSocket] = {}
            self.lock = asyncio.Lock()
            self.initialized = True

    async def connect(self, uid: str, websocket: WebSocket, subprotocol: str):
        logger.info(f"Adding websocket connection for {uid}...")
        async with self.lock:
            if uid in self.active_connections:
                logger.info(f"User {uid} is already connected. Closing old connection.")
                try:
                    await self.active_connections[uid].close()
                except Exception as e:
                    logger.warning(f"Failed to close old connection for {uid}: {e}")
            
            await websocket.accept(subprotocol=subprotocol)
            self.active_connections[uid] = websocket
            logger.info(f"Connected to {uid}")

    async def disconnect(self, uid: str):
        async with self.lock:
            if uid in self.active_connections:
                logger.info(f"Disconnected from {uid}")
                del self.active_connections[uid]

    @retry(wait=wait_random_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(5))
    async def send(self, uid: str, message: dict[str, str]):
        if uid in self.active_connections:
            await self.active_connections[uid].send_json(message)
        else:
            raise ValueError(f"Failed to send message: User {uid} is not connected")
