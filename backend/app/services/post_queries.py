from uuid import UUID

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.models.community import Comment, Post, PostLike
from app.models.profile import Profile


def posts_query(db: Session, user_id: UUID):
    """Posts with author, like count, comment count and 'liked by me' in ONE query (no N+1)."""
    like_count = select(func.count(PostLike.id)).where(PostLike.post_id == Post.id).correlate(Post).scalar_subquery()
    comment_count = select(func.count(Comment.id)).where(Comment.post_id == Post.id).correlate(Post).scalar_subquery()
    liked = exists().where(PostLike.post_id == Post.id, PostLike.user_id == user_id).correlate(Post)
    return (
        db.query(Post, Profile.name, Profile.avatar, like_count, comment_count, liked.label("liked_by_me"))
        .join(Profile, Profile.id == Post.author_id)
    )


def post_dict(row) -> dict:
    post, name, avatar, likes, comments, liked = row[:6]
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_name": name or "",
        "author_avatar": avatar,
        "content": post.content,
        "created_at": post.created_at,
        "like_count": likes,
        "comment_count": comments,
        "liked_by_me": bool(liked),
    }
