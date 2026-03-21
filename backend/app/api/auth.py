from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.models.user import User
from app.services.google_auth import verify_google_token
from app.core.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/google")
def google_login(token: str, db: Session = Depends(get_db)):
    user_info = verify_google_token(token)

    if not user_info:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")

    user = db.query(User).filter(user.email == email).first()

    if not user:
        user = User(email=email, name=name, picture=picture)
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"email": user.email, "name": user.name, "picture": user.picture},
    }
