CREATE TABLE IF NOT EXISTS menu_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  item_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS menu_preferences_global_idx
  ON menu_preferences ((tenant_id IS NULL))
  WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS menu_preferences_tenant_idx
  ON menu_preferences (tenant_id)
  WHERE tenant_id IS NOT NULL;
