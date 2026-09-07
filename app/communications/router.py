import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.communications.models import WhatsAppEventTemplateMap, WhatsAppMessage, WhatsAppNotificationSetting, WhatsAppTemplate
from app.communications.schemas import (
    DashboardOut, EventTemplateMapIn, EventTemplateMapOut, MessageListOut, MessageOut, NotificationSettingOut,
    NotificationSettingsIn, SendMessageIn, SendResultOut, TemplateIn, TemplateOut, TestConnectionOut, TestMessageIn,
    TestSendResultOut,
)
from app.communications.service import queue_manual_message, retry_message, send_test_message, test_connection
from app.database import get_db
from app.deps import get_current_admin
from app.permissions import require_permission

router = APIRouter(prefix="/api/admin/communications", tags=["communications"])


def _parse_json_list(raw: str) -> list:
    try:
        return json.loads(raw) if raw else []
    except (ValueError, TypeError):
        return []


def _message_to_out(msg: WhatsAppMessage) -> MessageOut:
    # Built from explicit attribute access (not __dict__) so it works
    # correctly regardless of the session's expire-on-commit state --
    # __dict__ silently drops expired attributes right after a commit.
    return MessageOut(
        id=msg.id, event_type=msg.event_type, source_module=msg.source_module, source_id=msg.source_id,
        recipient_type=msg.recipient_type, customer_id=msg.customer_id, recipient_id=msg.recipient_id,
        customer_name=msg.customer_name, mobile=msg.mobile,
        template_name=msg.template_name, template_params=_parse_json_list(msg.template_params),
        message_type=msg.message_type, document_name=msg.document_name or "",
        status=msg.status, provider=msg.provider, provider_message_id=msg.provider_message_id,
        error_code=msg.error_code, error_message=msg.error_message, retry_count=msg.retry_count,
        created_at=msg.created_at, sent_at=msg.sent_at, delivered_at=msg.delivered_at,
        read_at=msg.read_at, failed_at=msg.failed_at, created_by=msg.created_by,
    )


def _template_to_out(row: WhatsAppTemplate) -> TemplateOut:
    return TemplateOut(
        id=row.id, name=row.name, aisensy_campaign_name=row.aisensy_campaign_name,
        category=row.category, language=row.language, preview=row.preview,
        variables=_parse_json_list(row.variables), status=row.status,
        last_error=row.last_error or "", updated_at=row.updated_at,
    )


@router.get("/dashboard", response_model=DashboardOut, dependencies=[Depends(require_permission("communications", "VIEW"))])
def get_dashboard(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def count(status=None, since=None):
        q = db.query(func.count(WhatsAppMessage.id))
        if status:
            q = q.filter(WhatsAppMessage.status == status)
        if since:
            q = q.filter(WhatsAppMessage.created_at >= since)
        return q.scalar() or 0

    by_module_rows = (
        db.query(WhatsAppMessage.source_module, func.count(WhatsAppMessage.id))
        .group_by(WhatsAppMessage.source_module)
        .all()
    )
    return DashboardOut(
        sent=count("SENT"), delivered=count("DELIVERED"), read=count("READ"),
        failed=count("FAILED"), queued=count("QUEUED"),
        today=count(since=today_start), this_month=count(since=month_start),
        by_module={m: c for m, c in by_module_rows},
    )


@router.post("/send", response_model=SendResultOut, dependencies=[Depends(require_permission("communications", "CREATE"))])
def send_message(payload: SendMessageIn, admin: str = Depends(get_current_admin)):
    result = queue_manual_message(
        mobile=payload.mobile, customer_name=payload.customer_name,
        template_name=payload.template_name, template_params=payload.template_params,
        customer_id=payload.customer_id, created_by=admin,
    )
    return SendResultOut(success=result.ok, message_id=result.message.id if result.message else None, reason=result.reason)


@router.post("/test", response_model=TestSendResultOut, dependencies=[Depends(require_permission("communications", "CREATE"))])
def send_test(payload: TestMessageIn):
    result = send_test_message(payload.mobile, payload.template_name, payload.template_params)
    return TestSendResultOut(success=result.ok, error_code=result.error_code, error_message=result.error_message)


@router.get("/test-connection", response_model=TestConnectionOut, dependencies=[Depends(require_permission("communications", "VIEW"))])
def check_connection():
    result = test_connection()
    if result.ok:
        return TestConnectionOut(status="CONNECTED")
    return TestConnectionOut(status=result.error_code or "PROVIDER_ERROR", message=result.error_message)


@router.get("/messages", response_model=MessageListOut, dependencies=[Depends(require_permission("communications", "VIEW"))])
def list_messages(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    source_module: Optional[str] = None,
    source_id: Optional[str] = None,
    customer_id: Optional[int] = None,
    recipient_type: Optional[str] = None,
    recipient_id: Optional[int] = None,
    mobile: Optional[str] = None,
    q: Optional[str] = Query(None, description="search customer name / mobile / source id"),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(WhatsAppMessage)
    if status:
        query = query.filter(WhatsAppMessage.status == status)
    if event_type:
        query = query.filter(WhatsAppMessage.event_type == event_type)
    if source_module:
        query = query.filter(WhatsAppMessage.source_module == source_module)
    if source_id:
        query = query.filter(WhatsAppMessage.source_id == source_id)
    if customer_id:
        query = query.filter(WhatsAppMessage.customer_id == customer_id)
    if recipient_type:
        query = query.filter(WhatsAppMessage.recipient_type == recipient_type)
    if recipient_id:
        query = query.filter(WhatsAppMessage.recipient_id == recipient_id)
    if mobile:
        query = query.filter(WhatsAppMessage.mobile.contains(mobile))
    if q:
        like = f"%{q}%"
        query = query.filter(
            (WhatsAppMessage.customer_name.contains(q))
            | (WhatsAppMessage.mobile.contains(q))
            | (WhatsAppMessage.source_id.contains(q))
        )
    total = query.count()
    rows = query.order_by(WhatsAppMessage.created_at.desc()).offset(offset).limit(limit).all()
    return MessageListOut(items=[_message_to_out(r) for r in rows], total=total)


@router.get("/messages/{message_id}", response_model=MessageOut, dependencies=[Depends(require_permission("communications", "VIEW"))])
def get_message(message_id: int, db: Session = Depends(get_db)):
    msg = db.query(WhatsAppMessage).filter(WhatsAppMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    return _message_to_out(msg)


@router.post("/messages/{message_id}/retry", response_model=SendResultOut, dependencies=[Depends(require_permission("communications", "APPROVE"))])
def retry(message_id: int):
    result = retry_message(message_id)
    if not result.ok:
        raise HTTPException(status_code=400, detail=f"Cannot retry: {result.reason}")
    return SendResultOut(success=True, message_id=result.message.id, reason=result.reason)


@router.get("/templates", response_model=list[TemplateOut], dependencies=[Depends(require_permission("communications", "VIEW"))])
def list_templates(db: Session = Depends(get_db)):
    rows = db.query(WhatsAppTemplate).order_by(WhatsAppTemplate.name).all()
    return [_template_to_out(r) for r in rows]


@router.post("/templates", response_model=TemplateOut, dependencies=[Depends(require_permission("communications", "CREATE"))])
def create_template(payload: TemplateIn, db: Session = Depends(get_db)):
    if db.query(WhatsAppTemplate).filter(WhatsAppTemplate.name == payload.name).first():
        raise HTTPException(status_code=400, detail="A template with this name already exists")
    row = WhatsAppTemplate(
        name=payload.name, aisensy_campaign_name=payload.aisensy_campaign_name or payload.name,
        category=payload.category, language=payload.language, preview=payload.preview,
        variables=json.dumps(payload.variables), status=payload.status, is_active=(payload.status == "ACTIVE"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _template_to_out(row)


@router.put("/templates/{template_id}", response_model=TemplateOut, dependencies=[Depends(require_permission("communications", "EDIT"))])
def update_template(template_id: int, payload: TemplateIn, db: Session = Depends(get_db)):
    row = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == template_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    row.aisensy_campaign_name = payload.aisensy_campaign_name or payload.name
    row.category = payload.category
    row.language = payload.language
    row.preview = payload.preview
    row.variables = json.dumps(payload.variables)
    row.status = payload.status
    row.is_active = payload.status == "ACTIVE"
    db.commit()
    db.refresh(row)
    return _template_to_out(row)


@router.delete("/templates/{template_id}", dependencies=[Depends(require_permission("communications", "DELETE"))])
def delete_template(template_id: int, db: Session = Depends(get_db)):
    row = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.id == template_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(row)
    db.commit()
    return {"success": True}


@router.get("/settings", response_model=list[NotificationSettingOut], dependencies=[Depends(require_permission("communications", "VIEW"))])
def get_settings_list(db: Session = Depends(get_db)):
    return db.query(WhatsAppNotificationSetting).order_by(WhatsAppNotificationSetting.event_type).all()


@router.put("/settings", dependencies=[Depends(require_permission("communications", "EDIT"))])
def update_settings(payload: NotificationSettingsIn, db: Session = Depends(get_db)):
    rows = {r.event_type: r for r in db.query(WhatsAppNotificationSetting).all()}
    for event_type, enabled in payload.settings.items():
        if event_type in rows:
            rows[event_type].enabled = enabled
    db.commit()
    return {"success": True}


@router.get("/event-map", response_model=list[EventTemplateMapOut], dependencies=[Depends(require_permission("communications", "VIEW"))])
def list_event_template_map(db: Session = Depends(get_db)):
    """The Admin 'Event | Template | Status | Last Error | Last Updated'
    table -- template_status is resolved live against the current
    WhatsAppTemplate row (NOT_CONFIGURED if the mapped template doesn't
    exist at all)."""
    rows = db.query(WhatsAppEventTemplateMap).order_by(WhatsAppEventTemplateMap.event_type).all()
    templates = {t.name: t for t in db.query(WhatsAppTemplate).all()}
    out = []
    for r in rows:
        template = templates.get(r.template_name)
        out.append(EventTemplateMapOut(
            event_type=r.event_type, template_name=r.template_name, enabled=r.enabled,
            template_status=template.status if template else "NOT_CONFIGURED",
            last_error=(template.last_error if template else "") or "",
            updated_at=r.updated_at,
        ))
    return out


@router.put("/event-map/{event_type}", response_model=EventTemplateMapOut, dependencies=[Depends(require_permission("communications", "EDIT"))])
def update_event_template_map(event_type: str, payload: EventTemplateMapIn, db: Session = Depends(get_db)):
    """Admin can reassign which template answers an event, or disable the
    mapping entirely -- this NEVER lets the system bypass Meta template
    approval, it only controls resolution; the ACTIVE-status safety gate in
    queue_message() still applies regardless of what's mapped here."""
    row = db.query(WhatsAppEventTemplateMap).filter(WhatsAppEventTemplateMap.event_type == event_type).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"No mapping exists for event '{event_type}'")
    if payload.template_name is not None:
        row.template_name = payload.template_name
    if payload.enabled is not None:
        row.enabled = payload.enabled
    db.commit()
    db.refresh(row)
    template = db.query(WhatsAppTemplate).filter(WhatsAppTemplate.name == row.template_name).first()
    return EventTemplateMapOut(
        event_type=row.event_type, template_name=row.template_name, enabled=row.enabled,
        template_status=template.status if template else "NOT_CONFIGURED",
        last_error=(template.last_error if template else "") or "",
        updated_at=row.updated_at,
    )
