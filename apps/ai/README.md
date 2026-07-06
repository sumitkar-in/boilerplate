# Knowledge AI

Tenant-scoped Python service for the knowledge bot. It uses LangGraph for a small retrieve-and-answer graph and Ollama for local models such as `gemma4`, `qwen3`, or any model installed in the local Ollama runtime.

## Endpoints

- `POST /v1/chat` — buffered: one JSON response with the full answer.
- `POST /v1/chat/stream` — Server-Sent Events: the answer streams token-by-token as `data: {"delta": "...", "done": false}` frames, ending with a `done: true` frame carrying `model`/`citations`, then `data: [DONE]`. The Nest API (`apps/api/src/modules/knowledge-bot`) proxies this at `POST /knowledge-bot/chat/stream`, and the web chat UI consumes it via `askKnowledgeBotStream` (`apps/web/src/modules/knowledge-bot/api`).
- `GET /v1/models` — proxies Ollama's own `GET /api/tags` and returns `{"models": [...]}`, the list of models pulled into the local Ollama runtime. Used to populate the chat model dropdown (`KnowledgeChatPanel`) and the tenant-admin default-model picker (Tenant settings → Integrations → **Default AI chat model**). Returns an empty list — not an error — if Ollama is unreachable, so the UI falls back to a free-text model field.

## Setting up Ollama locally

The knowledge bot needs a running [Ollama](https://ollama.com) instance to actually generate answers — without it, chat falls back to a canned "AI is disabled" message (or, if `AI_ENABLED=true` but Ollama is unreachable, a fast error frame instead of a real answer).

1. **Install Ollama** on the machine that will run it (usually your host machine, not inside Docker):
   ```bash
   # macOS
   brew install ollama
   # or download from https://ollama.com/download
   ```
   Start it (`ollama serve`, or just open the desktop app — it listens on `:11434` by default).

2. **Pull the default small model.** This boilerplate defaults to `qwen3:0.6b` — a ~0.6B-parameter model that runs comfortably on CPU with no GPU required, chosen specifically so the knowledge bot works out of the box on a laptop. Pull it once:
   ```bash
   ollama pull qwen3:0.6b
   ```
   Verify it's available: `curl http://localhost:11434/api/tags`.

3. **Point the AI service at Ollama.** In `.env`:
   ```bash
   OLLAMA_BASE_URL=http://host.docker.internal:11434  # Ollama on the host, AI service in Docker (default dev setup)
   OLLAMA_MODEL=qwen3:0.6b
   ```
   If you instead run `apps/ai` outside Docker (see "Run locally" below) with Ollama also on the host, use `OLLAMA_BASE_URL=http://localhost:11434` instead. If Ollama runs on a different machine on your network, use that machine's LAN IP — just make sure it's actually reachable from wherever the AI service runs (a stale/unreachable IP here is the most common cause of the chat silently hanging before erroring out).

4. **Rebuild/restart the `ai` container** after changing `.env` (env vars are baked in at container start, not live-reloaded):
   ```bash
   docker compose -f infra/docker/docker-compose.yml --env-file .env up -d --build ai
   ```

### Using a larger model

The default `qwen3:0.6b` prioritizes speed and low resource usage over answer quality — expect it to occasionally misfollow instructions or give generic answers, especially with little tenant context. If you want better answers and have the hardware for it:

1. Pull the model you want, e.g. `ollama pull qwen3:8b` or `ollama pull llama3.1:8b`.
2. Check compatibility before switching:
   - **RAM**: roughly 1GB of RAM per billion parameters at 4-bit quantization (a 8B model needs ~6-8GB free) — check with `ollama ps` after a test run, or the model's page on [ollama.com/library](https://ollama.com/library) for the recommended minimum.
   - **Context length**: longer tenant context (many sources) needs a model with enough context window; check the model's `context_length` via `ollama show <model>`.
   - **Speed**: bigger models are meaningfully slower on CPU — test with a real chat before rolling it out broadly.
3. Set the new default either via `OLLAMA_MODEL` in `.env` (requires an `ai` container restart), or — without touching `.env` — as a **tenant setting**: Tenant settings → Integrations → **Default AI chat model**, which lists every model currently pulled into Ollama (via `GET /v1/models`) and lets each tenant admin pick their own default. Users can also override the model for a single conversation directly in the chat panel's model dropdown.

## Run locally

```bash
cd apps/ai
python -m venv .venv
. .venv/bin/activate
pip install -e .
uvicorn knowledge_ai.main:app --host 0.0.0.0 --port 8000
```

Set `AI_ENABLED=true` and `AI_SERVICE_URL=http://localhost:8000` for the Nest API.

## Tenant storage

Each tenant is stored under `apps/ai/data/tenants/<tenant-key>/`. The service only reads and writes within that tenant directory. MCP tools are read-only and return abstracted source/skill/search data instead of raw database access.

Sources and skills are mirrored here from Postgres when created via the API (`POST /v1/sources`, `POST /v1/skills`) and removed here too on delete (`POST /v1/sources/remove`, `POST /v1/skills/remove`) — this file store is the AI service's own retrieval index, separate from the tenant's Postgres tables, so both sides need to stay in sync on every create/delete.

## Logging

The service logs to stdout at `INFO` level by default (chat/chat_stream start and completion, model resolution, `/v1/models` lookups). Set `LOG_LEVEL=DEBUG` (or `WARNING`/`ERROR`) in `.env` to change verbosity; view logs with `docker logs docker-ai-1 -f`. The Nest API side logs the same lifecycle events via its own `Logger` (`docker logs docker-api-1 -f`), which is usually the more useful place to look first since it also logs the local-fallback path and per-tenant timing.
