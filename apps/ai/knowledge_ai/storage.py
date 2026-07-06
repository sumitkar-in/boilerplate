import json
import os
import re
from pathlib import Path
from typing import Iterable

from .models import DataSource, Skill, TenantIdentity, TenantSnapshot

SAFE_TENANT_KEY = re.compile(r"[^a-zA-Z0-9_.-]+")


def tenant_key(tenant: TenantIdentity) -> str:
    raw = tenant.slug or tenant.id
    return SAFE_TENANT_KEY.sub("_", raw).strip("._") or tenant.id


class TenantStore:
    def __init__(self, root: str | None = None) -> None:
        self.root = Path(root or os.getenv("AI_DATA_DIR", "data")).resolve()

    def tenant_dir(self, tenant: TenantIdentity) -> Path:
        path = self.root / "tenants" / tenant_key(tenant)
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _json_path(self, tenant: TenantIdentity, name: str) -> Path:
        return self.tenant_dir(tenant) / name

    def _read_many(self, tenant: TenantIdentity, name: str) -> list[dict]:
        path = self._json_path(tenant, name)
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, list) else []

    def _write_many(self, tenant: TenantIdentity, name: str, rows: Iterable[dict]) -> None:
        path = self._json_path(tenant, name)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(list(rows), handle, indent=2, sort_keys=True)

    def upsert_source(self, tenant: TenantIdentity, source: DataSource) -> DataSource:
        rows = self._read_many(tenant, "sources.json")
        rows = [row for row in rows if row.get("id") != source.id]
        rows.append(source.model_dump())
        self._write_many(tenant, "sources.json", rows)
        return source

    def upsert_skill(self, tenant: TenantIdentity, skill: Skill) -> Skill:
        rows = self._read_many(tenant, "skills.json")
        rows = [row for row in rows if row.get("id") != skill.id]
        rows.append(skill.model_dump())
        self._write_many(tenant, "skills.json", rows)
        return skill

    def remove_source(self, tenant: TenantIdentity, source_id: str) -> None:
        rows = self._read_many(tenant, "sources.json")
        rows = [row for row in rows if row.get("id") != source_id]
        self._write_many(tenant, "sources.json", rows)

    def remove_skill(self, tenant: TenantIdentity, skill_id: str) -> None:
        rows = self._read_many(tenant, "skills.json")
        rows = [row for row in rows if row.get("id") != skill_id]
        self._write_many(tenant, "skills.json", rows)

    def snapshot(self, tenant: TenantIdentity) -> TenantSnapshot:
        sources = [DataSource.model_validate(row) for row in self._read_many(tenant, "sources.json")]
        skills = [Skill.model_validate(row) for row in self._read_many(tenant, "skills.json")]
        return TenantSnapshot(sources=sources, skills=skills)

    def search(self, tenant: TenantIdentity, query: str, limit: int = 5) -> list[DataSource]:
        needle = query.lower().strip()
        sources = self.snapshot(tenant).sources
        if not needle:
            return sources[:limit]
        scored: list[tuple[int, DataSource]] = []
        for source in sources:
            haystack = f"{source.name}\n{source.kind}\n{source.content}".lower()
            score = haystack.count(needle)
            for token in needle.split():
                score += haystack.count(token)
            if score > 0:
                scored.append((score, source))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [source for _, source in scored[:limit]]
