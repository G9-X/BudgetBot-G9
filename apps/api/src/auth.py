import json
import urllib.request
from typing import Optional
from jose import jwt
from jose.exceptions import JWTError
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.config import config

security = HTTPBearer()

_jwks = None

def get_jwks():
    global _jwks
    if _jwks is None:
        if not config.cognito_user_pool_id or not config.aws_region:
            return None
        url = f"https://cognito-idp.{config.aws_region}.amazonaws.com/{config.cognito_user_pool_id}/.well-known/jwks.json"
        try:
            with urllib.request.urlopen(url) as response:
                _jwks = json.loads(response.read().decode('utf-8'))
        except Exception as e:
            print(f"Failed to fetch JWKS: {e}")
    return _jwks

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> str:
    # 1. API Gateway injected authorizer (production)
    if hasattr(request, "scope"):
        aws_event = request.scope.get("aws.event")
        if aws_event and isinstance(aws_event, dict):
            req_ctx = aws_event.get("requestContext", {})
            auth = req_ctx.get("authorizer", {})
            claims = auth.get("jwt", {}).get("claims", {}) or auth.get("claims", {})
            uid = claims.get("sub") or claims.get("username") or claims.get("cognito:username")
            if uid:
                return uid

    # 2. Local fallback if deployed without API Gateway or in dev mode
    if not credentials:
        # allow default user in dev if Cognito isn't set up
        if not config.cognito_user_pool_id:
            return config.default_user_id
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    keys = get_jwks()
    
    if not keys:
        if config.default_user_id:
            return config.default_user_id
        raise HTTPException(status_code=401, detail="Cognito not configured")

    try:
        headers = jwt.get_unverified_headers(token)
        kid = headers.get("kid")
        key = next((k for k in keys["keys"] if k["kid"] == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token signature")
            
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=config.cognito_client_id if config.cognito_client_id else None,
            issuer=f"https://cognito-idp.{config.aws_region}.amazonaws.com/{config.cognito_user_pool_id}"
        )
        
        user_id = payload.get("sub") or payload.get("cognito:username")
        if not user_id:
            raise HTTPException(status_code=401, detail="No user identity in token")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Token verification failed")
