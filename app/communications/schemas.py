from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

TEMPLATE_STATUSES = ["ACTIVE", "PENDING", "REJECTED", "DISABLED"]


class SendMessageIn(BaseModel):
    customer_id: Optional[int] = None
    mobile: str
    customer_name: str = ""
    template_name: str
    template_params: list[str] = []

    @field_validator("mobile")
    @classmethod
    def _not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("mobile is required")
        return v


class TestMessageIn(BaseModel):
    mobile: str
    template_name: str
    template_params: list[str] = []


class MessageOut(BaseModel):
    id: int
    event_type: str
    source_module: str
    source_id: str
    customer_id: Optional[int]
    customer_name: str
    mobile: str
    template_name: str
    template_params: list
    status: str
    provider: str
    provider_message_id: str
    error_code: str
    error_message: str
    retry_count: int
    created_at: datetime
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    failed_at: Optional[datetime]
    created_by: str

    class Config:
        from_attributes = True


class MessageListOut(BaseModel):
    items: list[MessageOut]
    total: int


class TemplateIn(BaseModel):
    name: str
    aisensy_campaign_name: str = ""
    category: str = ""
    language: str = "en"
    preview: str = ""
    variables: list[str] = []
    status: str = "PENDING"  # ACTIVE|PENDING|REJECTED|DISABLED -- an admin can only ever set these 4

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v not in TEMPLATE_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(TEMPLATE_STATUSES)}")
        return v


class TemplateOut(BaseModel):
    id: int
    name: str
    aisensy_campaign_name: str
    category: str
    language: str
    preview: str
    variables: list
    status: str
    last_error: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EventTemplateMapOut(BaseModel):
    event_type: str
    template_name: str
    enabled: bool
    template_status: str  # resolved live from the WhatsAppTemplate row (or NOT_CONFIGURED)
    last_error: str = ""
    updated_at: Optional[datetime] = None


class EventTemplateMapIn(BaseModel):
    template_name: Optional[str] = None
    enabled: Optional[bool] = None


class NotificationSettingOut(BaseModel):
    event_type: str
    label: str
    enabled: bool

    class Config:
        from_attributes = True


class NotificationSettingsIn(BaseModel):
    settings: dict[str, bool]


class DashboardOut(BaseModel):
    sent: int
    delivered: int
    read: int
    failed: int
    queued: int
    today: int
    this_month: int
    by_module: dict[str, int]


class TestConnectionOut(BaseModel):
    status: str  # CONNECTED | CONFIGURATION_ERROR | AUTHENTICATION_ERROR | PROVIDER_ERROR | TIMEOUT
    message: str = ""


class SendResultOut(BaseModel):
    success: bool
    message_id: Optional[int] = None
    reason: str = ""


class TestSendResultOut(BaseModel):
    success: bool
    error_code: str = ""
    error_message: str = ""
