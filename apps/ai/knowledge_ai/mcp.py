from typing import Any

from .models import TenantIdentity
from .storage import TenantStore


class ReadOnlyMcp:
    def __init__(self, store: TenantStore) -> None:
        self.store = store

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        method = payload.get("method")
        request_id = payload.get("id")
        try:
            if method == "initialize":
                result = {
                    "protocolVersion": "2024-11-05",
                    "serverInfo": {"name": "boilerplate-knowledge-ai", "version": "0.1.0"},
                    "capabilities": {"tools": {}},
                }
            elif method == "tools/list":
                result = {
                    "tools": [
                        {
                            "name": "tenant_knowledge_sources",
                            "description": "List abstract metadata for the current tenant's knowledge sources.",
                            "inputSchema": self._tenant_schema(),
                        },
                        {
                            "name": "tenant_knowledge_skills",
                            "description": "List configured read-only skill metadata for the current tenant.",
                            "inputSchema": self._tenant_schema(),
                        },
                        {
                            "name": "tenant_knowledge_search",
                            "description": "Search tenant knowledge sources through a read-only abstraction.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "tenant": self._tenant_schema()["properties"]["tenant"],
                                    "query": {"type": "string"},
                                },
                                "required": ["tenant", "query"],
                            },
                        },
                    ]
                }
            elif method == "tools/call":
                result = self._call_tool(payload.get("params") or {})
            else:
                return self._error(request_id, -32601, f"Unknown method: {method}")
            return {"jsonrpc": "2.0", "id": request_id, "result": result}
        except Exception as exc:
            return self._error(request_id, -32000, str(exc))

    def _call_tool(self, params: dict[str, Any]) -> dict[str, Any]:
        name = params.get("name")
        args = params.get("arguments") or {}
        tenant = TenantIdentity.model_validate(args.get("tenant"))
        if name == "tenant_knowledge_sources":
            sources = self.store.snapshot(tenant).sources
            content = [{"id": item.id, "name": item.name, "kind": item.kind} for item in sources]
        elif name == "tenant_knowledge_skills":
            skills = self.store.snapshot(tenant).skills
            content = [
                {"id": item.id, "name": item.name, "description": item.description, "enabled": item.enabled}
                for item in skills
            ]
        elif name == "tenant_knowledge_search":
            sources = self.store.search(tenant, str(args.get("query", "")))
            content = [{"id": item.id, "name": item.name, "kind": item.kind} for item in sources]
        else:
            raise ValueError(f"Unknown tool: {name}")
        return {"content": [{"type": "text", "text": str(content)}]}

    @staticmethod
    def _tenant_schema() -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "tenant": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "slug": {"type": "string"},
                        "schemaName": {"type": "string"},
                    },
                    "required": ["id", "slug", "schemaName"],
                }
            },
            "required": ["tenant"],
        }

    @staticmethod
    def _error(request_id: Any, code: int, message: str) -> dict[str, Any]:
        return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}
