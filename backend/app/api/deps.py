from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.user import User
from app.core.config import settings

security = HTTPBearer()

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Token")
