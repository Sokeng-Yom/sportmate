import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.constants import ReportStatus
from app.core.deps import get_current_profile
from app.db.session import get_db
from app.models.community import Comment, Post, PostLike, PostReport
from app.models.profile import Profile
from app.schemas.post import (
    CommentCreate, CommentRead, LikeState, PaginatedComments, PaginatedPosts,
    PostCreate, PostRead, ReportAck, ReportCreate,
)
from app.services.post_queries import post_dict, posts_query
from app.services.rate_limit import count_recent
from app.services.security_log import log_security_event

router = APIRouter(prefix="/api/v1/posts", tags=["community"])

POST_RATE_LIMIT = 5  # posts per user per minute
COMMENT_RATE_LIMIT = 10  # comments per user per minute
RATE_WINDOW_SECONDS = 60


def _require_post(db: Session, post_id: UUID) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


def _like_state(db: Session, post_id: UUID, liked: bool) -> dict:
    count = db.query(func.count(PostLike.id)).filter(PostLike.post_id == post_id).scalar()
    return {"liked": liked, "like_count": count}


@router.post("", response_model=PostRead, status_code=201, summary="Create a community post")
def create_post(
    payload: PostCreate,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    if count_recent(db, Post.author_id, Post.created_at, profile.id, RATE_WINDOW_SECONDS) >= POST_RATE_LIMIT:
        log_security_event(db, "POST_RATE_LIMITED", user_id=profile.id, request=request)
        db.commit()
        raise HTTPException(status_code=429, detail="You are posting too quickly. Please wait a moment.")

    post = Post(id=uuid.uuid4(), author_id=profile.id, content=payload.content)
    db.add(post)
    db.commit()
    return post_dict(posts_query(db, profile.id).filter(Post.id == post.id).one())


@router.get("", response_model=PaginatedPosts, summary="Community feed, newest first")
def list_posts(
    mine: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    query = posts_query(db, profile.id)
    total_query = db.query(func.count(Post.id))
    if mine:
        query = query.filter(Post.author_id == profile.id)
        total_query = total_query.filter(Post.author_id == profile.id)
    rows = query.order_by(Post.created_at.desc(), Post.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [post_dict(r) for r in rows], "total": total_query.scalar(), "page": page, "page_size": page_size}


@router.get("/{post_id}", response_model=PostRead, summary="Get one post")
def get_post(post_id: UUID, profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    row = posts_query(db, profile.id).filter(Post.id == post_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post_dict(row)


@router.delete("/{post_id}", status_code=204, summary="Delete a post (author, or an admin)")
def delete_post(
    post_id: UUID,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    post = _require_post(db, post_id)
    if post.author_id != profile.id and profile.role != "ADMIN":
        raise HTTPException(status_code=403, detail="You can only delete your own posts")
    if post.author_id != profile.id:
        log_security_event(
            db, "POST_REMOVED_BY_ADMIN", user_id=profile.id, request=request,
            details=f"post_id={post.id}; author_id={post.author_id}",
        )
    db.delete(post)  # comments, likes and reports are removed by ON DELETE CASCADE
    db.commit()


@router.post("/{post_id}/like", response_model=LikeState, summary="Like a post (safe to repeat)")
def like_post(post_id: UUID, profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    _require_post(db, post_id)
    db.execute(
        pg_insert(PostLike)
        .values(id=uuid.uuid4(), post_id=post_id, user_id=profile.id)
        .on_conflict_do_nothing(index_elements=["post_id", "user_id"])
    )
    db.commit()
    return _like_state(db, post_id, True)


@router.delete("/{post_id}/like", response_model=LikeState, summary="Remove my like (safe to repeat)")
def unlike_post(post_id: UUID, profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    _require_post(db, post_id)
    db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.user_id == profile.id).delete()
    db.commit()
    return _like_state(db, post_id, False)


def _comment_dict(comment: Comment, name: str, avatar: str | None) -> dict:
    return {
        "id": comment.id, "post_id": comment.post_id, "author_id": comment.author_id,
        "author_name": name or "", "author_avatar": avatar,
        "content": comment.content, "created_at": comment.created_at,
    }


@router.get("/{post_id}/comments", response_model=PaginatedComments, summary="Comments on a post, oldest first")
def list_comments(
    post_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    _require_post(db, post_id)
    total = db.query(func.count(Comment.id)).filter(Comment.post_id == post_id).scalar()
    rows = (
        db.query(Comment, Profile.name, Profile.avatar)
        .join(Profile, Profile.id == Comment.author_id)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at, Comment.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": [_comment_dict(*r) for r in rows], "total": total, "page": page, "page_size": page_size}


@router.post("/{post_id}/comments", response_model=CommentRead, status_code=201, summary="Comment on a post")
def create_comment(
    post_id: UUID,
    payload: CommentCreate,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    _require_post(db, post_id)
    if count_recent(db, Comment.author_id, Comment.created_at, profile.id, RATE_WINDOW_SECONDS) >= COMMENT_RATE_LIMIT:
        log_security_event(db, "COMMENT_RATE_LIMITED", user_id=profile.id, request=request)
        db.commit()
        raise HTTPException(status_code=429, detail="You are commenting too quickly. Please wait a moment.")

    comment = Comment(id=uuid.uuid4(), post_id=post_id, author_id=profile.id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_dict(comment, profile.name, profile.avatar)


@router.delete("/{post_id}/comments/{comment_id}", status_code=204, summary="Delete a comment (author, or an admin)")
def delete_comment(
    post_id: UUID,
    comment_id: UUID,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.post_id == post_id).first()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_id != profile.id and profile.role != "ADMIN":
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    db.delete(comment)
    db.commit()


@router.post("/{post_id}/report", response_model=ReportAck, status_code=201, summary="Report inappropriate content")
def report_post(
    post_id: UUID,
    payload: ReportCreate,
    request: Request,
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    post = _require_post(db, post_id)
    if post.author_id == profile.id:
        raise HTTPException(status_code=400, detail="You cannot report your own post")

    db.add(PostReport(
        id=uuid.uuid4(), post_id=post_id, reporter_id=profile.id,
        reason=payload.reason, status=ReportStatus.OPEN,
    ))
    log_security_event(db, "POST_REPORTED", user_id=profile.id, request=request, details=f"post_id={post_id}")
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already reported this post")
    return {"status": "reported"}
