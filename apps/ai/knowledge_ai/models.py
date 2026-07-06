from typing import Any, Literal

from pydantic import BaseModel, Field


class TenantIdentity(BaseModel):
    id: str
    slug: str
    schema_name: str = Field(alias="schemaName")


class DataSource(BaseModel):
    id: str
    name: str
    kind: Literal["text", "url", "file", "database", "api"]
    content: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class Skill(BaseModel):
    id: str
    name: str
    description: str = ""
    instruction: str = ""
    enabled: bool = True


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class IngestRequest(BaseModel):
    tenant: TenantIdentity
    source: DataSource


class SkillRequest(BaseModel):
    tenant: TenantIdentity
    skill: Skill


class RemoveSourceRequest(BaseModel):
    tenant: TenantIdentity
    id: str


class RemoveSkillRequest(BaseModel):
    tenant: TenantIdentity
    id: str


class ChatRequest(BaseModel):
    tenant: TenantIdentity
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    model: str | None = None


class ChatResponse(BaseModel):
    answer: str
    model: str
    citations: list[dict[str, str]] = Field(default_factory=list)


class ChatStreamChunk(BaseModel):
    """One SSE frame from POST /v1/chat/stream. `delta` carries the next
    slice of answer text; the terminal chunk has done=True with an empty
    delta and carries model/citations (mirroring ChatResponse's shape) so
    the client's last frame is enough to reconstruct the full record.
    """

    delta: str = ""
    done: bool = False
    model: str | None = None
    citations: list[dict[str, str]] = Field(default_factory=list)
    error: bool = False


class TenantSnapshot(BaseModel):
    sources: list[DataSource]
    skills: list[Skill]
