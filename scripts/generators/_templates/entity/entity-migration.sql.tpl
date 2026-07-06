-- Adds the "{{entitySnake}}" table to the {{moduleKey}} module.
-- Keep this in sync with entities/{{entityKey}}.ts.
-- See: skills/migrations/SKILL.md
CREATE TABLE IF NOT EXISTS {{entitySnake}} (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now()
  -- TODO: add this table's columns, matching entities/{{entityKey}}.ts.
);
