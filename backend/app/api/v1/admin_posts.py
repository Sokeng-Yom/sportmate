from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import ReportStatus
from app.core.deps import require_profile_role
from app.db.session import get_db
from app.models.community import Post, PostReport
from app.models.profile import Profile
from app.schemas.post import DismissResult, PaginatedReportedPosts
from app.services.post_queries import post_dict, posts_query
from app.services.security_log import log_security_event

router = APIRouter(prefix="/api/v1/admin/posts", tags=["admin"])


@router.get("/reported", response_model=PaginatedReportedPosts, summary="Posts with open reports, most reported first")
def reported_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    open_reports = (
        db.query(PostReport.post_id.label("post_id"), func.count(PostReport.id).label("n"))
        .filter(PostReport.status == ReportStatus.OPEN)
        .group_by(PostReport.post_id)
        .subquery()
    )
    total = db.query(func.count()).select_from(open_reports).scalar()
    rows = (
        posts_query(db, admin.id)
        .join(open_reports, open_reports.c.post_id == Post.id)
        .add_columns(open_reports.c.n)
        .order_by(open_reports.c.n.desc(), Post.created_at.desc(), Post.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    reasons: dict = {}
    ids = [row[0].id for row in rows]
    if ids:
        for post_id, reason in (
            db.query(PostReport.post_id, PostReport.reason)
            .filter(PostReport.post_id.in_(ids), PostReport.status == ReportStatus.OPEN)
            .order_by(PostReport.created_at)
            .all()
        ):
            reasons.setdefault(post_id, []).append(reason)

    items = []
    for row in rows:
        item = post_dict(row)
        item["report_count"] = row[6]
        item["reasons"] = reasons.get(row[0].id, [])[:5]
        items.append(item)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/{post_id}/dismiss-reports", response_model=DismissResult, summary="Dismiss all open reports on a post")
def dismiss_reports(
    post_id: UUID,
    request: Request,
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    if db.query(Post.id).filter(Post.id == post_id).first() is None:
        raise HTTPException(status_code=404, detail="Post not found")
    dismissed = (
        db.query(PostReport)
        .filter(PostReport.post_id == post_id, PostReport.status == ReportStatus.OPEN)
        .update({"status": ReportStatus.DISMISSED}, synchronize_session=False)
    )
    log_security_event(db, "REPORTS_DISMISSED", user_id=admin.id, request=request, details=f"post_id={post_id}")
    db.commit()
    return {"dismissed": dismissed}


@router.delete("/{post_id}", status_code=204, summary="Remove a post as a moderator")
def admin_delete_post(
    post_id: UUID,
    request: Request,
    admin: Profile = Depends(require_profile_role("ADMIN")),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    log_security_event(
        db, "POST_REMOVED_BY_ADMIN", user_id=admin.id, request=request,
        details=f"post_id={post.id}; author_id={post.author_id}",
    )
    db.delete(post)
    db.commit()
