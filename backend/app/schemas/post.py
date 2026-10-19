from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, StringConstraints

PostContent = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
CommentContent = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
ReportReason = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]


class PostCreate(BaseModel):
    content: PostContent


class CommentCreate(BaseModel):
    content: CommentContent


class ReportCreate(BaseModel):
    reason: ReportReason


class PostRead(BaseModel):
    id: UUID
    author_id: UUID
    author_name: str
    author_avatar: str | None = None
    content: str
    created_at: datetime
    like_count: int
    comment_count: int
    liked_by_me: bool


class ReportedPostRead(PostRead):
    report_count: int
    reasons: list[str]


class CommentRead(BaseModel):
    id: UUID
    post_id: UUID
    author_id: UUID
    author_name: str
    author_avatar: str | None = None
    content: str
    created_at: datetime


class PaginatedPosts(BaseModel):
    items: list[PostRead]
    total: int
    page: int
    page_size: int


class PaginatedReportedPosts(BaseModel):
    items: list[ReportedPostRead]
    total: int
    page: int
    page_size: int


class PaginatedComments(BaseModel):
    items: list[CommentRead]
    total: int
    page: int
    page_size: int


class LikeState(BaseModel):
    liked: bool
    like_count: int


class ReportAck(BaseModel):
    status: str


class DismissResult(BaseModel):
    dismissed: int
