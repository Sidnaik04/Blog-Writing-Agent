from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.api.deps import get_current_user
from app.models.blog import Blog
from app.schemas.blog import BlogCreate, BlogResponse
from app.models.user import User
from app.services.rag_service import store_blog

router = APIRouter(prefix="/blogs", tags=["Blogs"])


# create blog
@router.post("/", response_model=BlogResponse)
def create_blog(
    blog: BlogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        new_blog = Blog(title=blog.title, content_md=blog.content_md, user_id=user.id)

        # Commit first to ensure ID is assigned
        db.add(new_blog)
        db.commit()
        db.refresh(new_blog)

        # Then store in RAG system (ChromaDB) - don't fail if this fails
        try:
            store_blog(new_blog.id, new_blog.content_md)
        except Exception as rag_error:
            print(f"⚠️ Warning: Failed to store blog in RAG system: {rag_error}")
            # Don't fail the whole request if RAG fails

        return new_blog

    except Exception as db_error:
        # Rollback on any error
        db.rollback()
        print(f"❌ Error creating blog: {db_error}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create blog: {str(db_error)}"
        )


# Get All Blogs (for logged-in user)
@router.get("/", response_model=list[BlogResponse])
def get_blogs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    blogs = db.query(Blog).filter(Blog.user_id == user.id).all()
    return blogs


# Get Single Blog
@router.get("/{blog_id}", response_model=BlogResponse)
def get_blog(
    blog_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    blog = db.query(Blog).filter(Blog.id == blog_id, Blog.user_id == user.id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    return blog


# Delete Blog
@router.delete("/{blog_id}")
def delete_blog(
    blog_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    blog = db.query(Blog).filter(Blog.id == blog_id, Blog.user_id == user.id).first()

    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    db.delete(blog)
    db.commit()

    return {"message": "Blog deleted successfully"}
