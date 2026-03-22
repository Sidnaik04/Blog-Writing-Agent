from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.services.chat_service import chat_with_blog

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    blog_id: int
    question: str
    api_key: str


@router.post("/")
def chat(req: ChatRequest, user=Depends(get_current_user)):
    answer = chat_with_blog(
        api_key=req.api_key,
        blog_id=req.blog_id,
        question=req.question
    )

    return {"answer": answer}