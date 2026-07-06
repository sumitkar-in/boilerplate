ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS brand_color text NOT NULL DEFAULT '#35abc0',
  ADD COLUMN IF NOT EXISTS logo_url text;
