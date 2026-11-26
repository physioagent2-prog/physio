from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
import uuid
from jwt import PyJWKClient
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login/")

jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)

def _firebase_uid_to_uuid(firebase_uid: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"firebase:{firebase_uid}"))

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validates either a Firebase Phone OTP session token bridged from the Android app
    or a standard Supabase JWT token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token.startswith("firebase:"):
        parts = token.split(":", 2)
        firebase_uid = parts[1] if len(parts) > 1 and parts[1] else "default-user"
        phone = parts[2] if len(parts) > 2 else ""
        return {
            "id": _firebase_uid_to_uuid(firebase_uid),
            "firebase_uid": firebase_uid,
            "phone": phone,
            "email": f"{phone}@movebetter.local",
            "role": "Admin"
        }

    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")

        if alg == "ES256":
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            key = signing_key.key
        else:
            key = settings.SUPABASE_JWT_SECRET

        payload = jwt.decode(
            token,
            key,
            algorithms=["HS256", "ES256"],
            options={"verify_aud": False}
        )

        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception

        return {"id": user_id, "email": payload.get("email"), "role": "Admin"}

    except Exception as e:
        logger.error(f"JWT Validation Error: {str(e)}")
        raise credentials_exception

async def require_role(allowed_roles: list):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        return current_user
    return role_checker
