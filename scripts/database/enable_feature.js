require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT id FROM tenants');
  const featureKey = 'visitors';
  for (const row of res.rows) {
    await client.query(
      'INSERT INTO feature_flags (tenant_id, feature_key, enabled, enabled_at) VALUES ($1, $2, true, now()) ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = true',
      [row.id, featureKey]
    );
    console.log(`Enabled ${featureKey} for tenant ${row.id}`);
  }
  await client.end();
}
main().catch(console.error);
