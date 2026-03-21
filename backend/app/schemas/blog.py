from pydantic import BaseModel
from datetime import datetime

class BlogCreate(BaseModel):
    title: str
    content_md: str


class BlogResponse(BaseModel):
    id: int
    title: str
    content_md: str
    created_at: datetime

    class Config:
        from_attributes = True