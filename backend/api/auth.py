from fastapi import APIRouter, HTTPException, Header, WebSocket
from backend.managers.firebase_manager import FirebaseManager

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth") 
firebase_manager = FirebaseManager()

async def verify_token(token: str) -> str:
    """
    Verifies a Firebase token and returns the associated UID.
    Raises an HTTPException if the token is invalid or Firebase is not initialized.
    """
    try:
        if not firebase_manager or not firebase_manager.auth:
            raise HTTPException(status_code=500, detail="Firebase not initialized")

        uid = firebase_manager.verify_token(token)
        return uid
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/verify")
async def verify_endpoint_token(authorization: str = Header(None)) -> str:
    """
    HTTP route for verifying a token.
    Extracts token from the Authorization header and verifies it.
    """
    if not authorization:
        raise HTTPException(status_code=400, detail="Authorization header is missing")
    
    bearer_token = authorization.split(" ") # Extract ["Bearer", token] from "Bearer <token>" string
    if len(bearer_token) != 2:
        raise HTTPException(status_code=400, detail="Authorization token is missing")
    
    token = bearer_token[1]
    uid = await verify_token(token)
    return uid

@router.get("/authenticateToken")
async def authenticate_token(authorization: str = Header(None)) -> dict:
    """
    HTTP route for verifying a token and generating a custom token.
    """
    if not authorization:
        raise HTTPException(status_code=400, detail="Authorization header is missing")
    
    bearer_token = authorization.split(" ")
    if len(bearer_token) != 2:
        raise HTTPException(status_code=400, detail="Authorization token is missing")
    
    token = bearer_token[1]
    
    try:
        uid = await verify_token(token)
        custom_token = firebase_manager.auth.create_custom_token(uid)
        return {"verifiedUID": uid, "customToken": custom_token}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def verify_websocket_token(websocket: WebSocket) -> str:
    """
    Extracts the token from WebSocket subprotocols and verifies it.
    """
    subprotocol = websocket.headers.get('sec-websocket-protocol')
    if not subprotocol or not subprotocol.startswith('Bearer '):
        await websocket.close(code=4401, reason='Authentication required')
        return ""
    
    token = subprotocol[len('Bearer '):]
    uid = await verify_token(token)
    return uid
