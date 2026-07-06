import json
import logging
import os
from typing import Any, AsyncIterator

import httpx
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from .graph import KnowledgeGraph
from .mcp import ReadOnlyMcp
from .models import (
    ChatRequest,
    IngestRequest,
    RemoveSkillRequest,
    RemoveSourceRequest,
    SkillRequest,
)
from .storage import TenantStore

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

store = TenantStore()
graph = KnowledgeGraph(store)
mcp = ReadOnlyMcp(store)

app = FastAPI(title="Boilerplate Knowledge AI", version="0.1.0")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/v1/sources")
def upsert_source(payload: IngestRequest) -> dict[str, Any]:
    source = store.upsert_source(payload.tenant, payload.source)
    return {"source": source.model_dump()}


@app.post("/v1/sources/remove")
def remove_source(payload: RemoveSourceRequest) -> dict[str, bool]:
    store.remove_source(payload.tenant, payload.id)
    logger.info("remove_source: tenant=%s id=%s", payload.tenant.slug, payload.id)
    return {"ok": True}


@app.post("/v1/skills")
def upsert_skill(payload: SkillRequest) -> dict[str, Any]:
    skill = store.upsert_skill(payload.tenant, payload.skill)
    return {"skill": skill.model_dump()}


@app.post("/v1/skills/remove")
def remove_skill(payload: RemoveSkillRequest) -> dict[str, bool]:
    store.remove_skill(payload.tenant, payload.id)
    logger.info("remove_skill: tenant=%s id=%s", payload.tenant.slug, payload.id)
    return {"ok": True}


@app.get("/v1/models")
async def list_models() -> dict[str, list[str]]:
    """Proxies Ollama's native model list so the frontend can offer a
    dropdown instead of a free-text model name field. Returns an empty
    list (not an error) when Ollama is unreachable — the chat model field
    just falls back to free text in that case."""
    base_url = os.getenv("OLLAMA_BASE_URL", "http://192.168.0.178:11434")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base_url}/api/tags")
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("list_models: could not reach Ollama at %s: %s", base_url, exc)
        return {"models": []}
    names = [model["name"] for model in payload.get("models", [])]
    logger.info("list_models: found %d model(s) at %s", len(names), base_url)
    return {"models": names}


@app.post("/v1/chat")
def chat(payload: ChatRequest) -> dict[str, Any]:
    return graph.chat(payload.tenant, payload.message, payload.history, payload.model).model_dump()


@app.post("/v1/chat/stream")
async def chat_stream(payload: ChatRequest) -> StreamingResponse:
    async def event_source() -> AsyncIterator[str]:
        async for chunk in graph.chat_stream(payload.tenant, payload.message, payload.history, payload.model):
            yield f"data: {json.dumps(chunk.model_dump())}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/mcp")
def mcp_endpoint(payload: dict[str, Any]) -> dict[str, Any]:
    return mcp.handle(payload)
