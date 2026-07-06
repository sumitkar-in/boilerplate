import logging
import os
from typing import AsyncIterator, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, START, StateGraph

from .models import ChatMessage, ChatResponse, ChatStreamChunk, TenantIdentity
from .storage import TenantStore

logger = logging.getLogger(__name__)


class KnowledgeState(TypedDict):
    tenant: TenantIdentity
    message: str
    history: list[ChatMessage]
    model: str
    context: str
    citations: list[dict[str, str]]
    answer: str


def _resolve_model(model: str | None) -> str:
    return model or os.getenv("OLLAMA_MODEL", "qwen3:0.6b")


def _ollama(model: str) -> ChatOllama:
    return ChatOllama(
        model=model,
        base_url=os.getenv("OLLAMA_BASE_URL", "http://192.168.0.178:11434"),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.2")),
    )


def _retrieve(store: TenantStore, tenant: TenantIdentity, message: str) -> tuple[str, list[dict[str, str]]]:
    """Shared retrieval step used by both the compiled graph node and the
    streaming path below — kept as a plain function (not a graph node) so
    the streaming path can call it directly without going through
    graph.invoke(), which only returns a whole final state, not partial
    progress."""
    sources = store.search(tenant, message, limit=5)
    context_parts = []
    citations = []
    for source in sources:
        context_parts.append(f"[{source.id}] {source.name}\n{source.content[:2400]}")
        citations.append({"id": source.id, "name": source.name, "kind": source.kind})
    return "\n\n".join(context_parts), citations


def _system_prompt(store: TenantStore, tenant: TenantIdentity, context: str) -> str:
    snapshot = store.snapshot(tenant)
    skills = "\n".join(
        f"- {skill.name}: {skill.instruction or skill.description}"
        for skill in snapshot.skills
        if skill.enabled
    )
    return (
        "You are this workspace's knowledge assistant. Answer questions using ONLY "
        "the provided context and skills below — do not invent facts, personas, or "
        "details that aren't in the context. Be clear, direct, and concise. "
        "If the context doesn't contain the answer, say so plainly (e.g. \"I don't "
        "have information about that in this workspace yet\") instead of guessing "
        "or making something up. Use basic markdown (**bold**, *italics*, `code`, "
        "and \"- \" bullet lists) where it improves readability, but don't overuse it.\n\n"
        f"Skills:\n{skills or '- General knowledge-base Q&A'}\n\n"
        f"Context:\n{context or 'No matching tenant sources were found.'}"
    )


def build_graph(store: TenantStore):
    graph = StateGraph(KnowledgeState)

    def retrieve(state: KnowledgeState) -> KnowledgeState:
        context, citations = _retrieve(store, state["tenant"], state["message"])
        return {**state, "context": context, "citations": citations}

    def answer(state: KnowledgeState) -> KnowledgeState:
        system = _system_prompt(store, state["tenant"], state["context"])
        response = _ollama(state["model"]).invoke(
            [SystemMessage(content=system), HumanMessage(content=state["message"])]
        )
        return {**state, "answer": str(response.content)}

    graph.add_node("retrieve", retrieve)
    graph.add_node("answer", answer)
    graph.add_edge(START, "retrieve")
    graph.add_edge("retrieve", "answer")
    graph.add_edge("answer", END)
    return graph.compile()


class KnowledgeGraph:
    def __init__(self, store: TenantStore) -> None:
        self.store = store
        self.graph = build_graph(store)

    def chat(self, tenant: TenantIdentity, message: str, history: list[ChatMessage], model: str | None) -> ChatResponse:
        resolved_model = _resolve_model(model)
        logger.info("chat: tenant=%s model=%s", tenant.slug, resolved_model)
        state = self.graph.invoke(
            {
                "tenant": tenant,
                "message": message,
                "history": history,
                "model": resolved_model,
                "context": "",
                "citations": [],
                "answer": "",
            }
        )
        return ChatResponse(answer=state["answer"], model=resolved_model, citations=state["citations"])

    async def chat_stream(
        self,
        tenant: TenantIdentity,
        message: str,
        history: list[ChatMessage],
        model: str | None,
    ) -> AsyncIterator[ChatStreamChunk]:
        """Token-by-token variant of chat(). Retrieval stays synchronous
        (local file search, effectively instant) — only the Ollama call
        itself is streamed, via langchain-ollama's ChatOllama.astream(),
        which yields incremental AIMessageChunks instead of the final
        AIMessage that .invoke()/.ainvoke() return.
        """
        resolved_model = _resolve_model(model)
        logger.info("chat_stream: tenant=%s model=%s starting", tenant.slug, resolved_model)
        context, citations = _retrieve(self.store, tenant, message)
        system = _system_prompt(self.store, tenant, context)
        ollama = _ollama(resolved_model)
        messages = [SystemMessage(content=system), HumanMessage(content=message)]

        chunk_count = 0
        try:
            async for chunk in ollama.astream(messages):
                delta = str(chunk.content)
                if delta:
                    chunk_count += 1
                    yield ChatStreamChunk(delta=delta, done=False)
        except Exception as exc:  # noqa: BLE001 - any Ollama/connection failure should surface as a stream error, not kill the SSE response mid-flight
            logger.error(
                "chat_stream: tenant=%s model=%s failed after %d chunk(s): %s",
                tenant.slug, resolved_model, chunk_count, exc,
            )
            yield ChatStreamChunk(
                delta=f"\n\nAI backend unreachable ({exc}). Check OLLAMA_BASE_URL and that Ollama is running.",
                done=True,
                model=resolved_model,
                citations=citations,
                error=True,
            )
            return

        logger.info(
            "chat_stream: tenant=%s model=%s completed (%d chunk(s))",
            tenant.slug, resolved_model, chunk_count,
        )
        yield ChatStreamChunk(
            delta="",
            done=True,
            model=resolved_model,
            citations=citations,
        )
