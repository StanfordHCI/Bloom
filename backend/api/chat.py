from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from backend.managers.connection_manager import ConnectionManager
from backend.managers.chat_manager import ChatManager
from backend.api.auth import verify_endpoint_token, verify_websocket_token
from backend.api.models import ChatState, UserChatMessage, ToolResponseMessage

from typing import Union
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat")

connection_manager = ConnectionManager()
chat_manager = ChatManager()


@router.websocket("/{uid}/{chat_state}")
async def websocket_endpoint(uid: str, chat_state: ChatState, websocket: WebSocket):
    logger.info(f'''Connecting websocket for {
                uid} with chat state {chat_state}...''')
    subprotocol = websocket.headers.get('sec-websocket-protocol')
    if not subprotocol:
        await websocket.close(code=4401, reason='Authentication required')
        return

    verified_uid = await verify_websocket_token(websocket)
    if verified_uid != uid:
        await websocket.close(code=4403, reason='Unauthorized')
        return

    await connection_manager.connect(uid, websocket, subprotocol)
    await chat_manager.start_conversation(uid, chat_state)

    try:
        while True:
            data = await websocket.receive_json()

            try:
                if data["role"] == "user":
                    message: Union[UserChatMessage, ToolResponseMessage] = UserChatMessage(**data)
                else:
                    message = ToolResponseMessage(**data)
            except ValidationError as e:
                logger.error(f"Invalid message format received from {uid}: {e}")
                continue

            await chat_manager.process_message(uid, message)

    except WebSocketDisconnect:
        await connection_manager.disconnect(uid)
    except Exception as e:
        logger.error(f"Exception in websocket with {uid}: {e}")
        await connection_manager.disconnect(uid)


# Example endpoint with bearer token verification
@router.get("/messages")
async def get_messages(uid: str = Depends(verify_endpoint_token)):
    return {"uid": uid}
