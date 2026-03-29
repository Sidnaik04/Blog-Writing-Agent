from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.db.base import Base
from app.db.session import engine
from app.api import auth, blog, generation, chat
from app.api.deps import get_current_user
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://blog-writing-agent-m99p.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routes
app.include_router(auth.router)
app.include_router(blog.router)
app.include_router(generation.router)
app.include_router(chat.router)


@app.get("/")
def root():
    return {"message": "Blog Agent API is running"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"status": "DB connected successfully"}


@app.get("/protected")
def protected(user=Depends(get_current_user)):
    return {"message": f"Hello {user}"}
