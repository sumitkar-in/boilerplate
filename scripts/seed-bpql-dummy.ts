/**
 * Script to seed dummy BPQL data (Tables, Rows, Charts, Saved Queries)
 * via the local API.
 * 
 * Run with: npm run seed:bpql
 */
import * as https from 'https';

// Standard demo tenant auth credentials
const API_URL = process.env.API_URL || 'https://localhost/api';
const TENANT_SLUG = 'demo';
const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASSWORD = 'password123'; // Default seed password

async function makeRequest(
  method: string,
  path: string,
  token?: string,
  body?: any
) {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    // @ts-ignore
    agent
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  console.log(`Authenticating as ${ADMIN_EMAIL}...`);
  const authResponse = await makeRequest('POST', '/v1/auth/login', undefined, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  const token = authResponse.accessToken;

  if (!token) {
    throw new Error('Failed to retrieve access token');
  }

  const prefix = `/v1/tenant-${TENANT_SLUG}/bpql`;

  console.log('Creating BPQL table "Website Traffic"...');
  const trafficTable = await makeRequest('POST', `${prefix}/tables`, token, {
    name: 'Website Traffic',
    slug: 'website_traffic',
    description: 'Daily traffic stats for our main properties.',
    fields: [
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'visitors', label: 'Unique Visitors', type: 'number', required: true },
      { key: 'pageviews', label: 'Pageviews', type: 'number', required: true },
      { key: 'bounceRate', label: 'Bounce Rate', type: 'number', required: false },
      { key: 'source', label: 'Traffic Source', type: 'select', options: ['Direct', 'Organic Search', 'Social', 'Referral'] },
    ]
  });

  console.log('Creating BPQL table "Sales CRM"...');
  const salesTable = await makeRequest('POST', `${prefix}/tables`, token, {
    name: 'Sales CRM',
    slug: 'sales_crm',
    description: 'Lead generation and pipeline stats.',
    fields: [
      { key: 'leadName', label: 'Lead Name', type: 'text', required: true },
      { key: 'status', label: 'Status', type: 'select', required: true, options: ['New', 'Contacted', 'Qualified', 'Lost', 'Closed Won'] },
      { key: 'dealSize', label: 'Deal Size ($)', type: 'number', required: false },
      { key: 'isEnterprise', label: 'Enterprise?', type: 'boolean', required: false },
    ]
  });

  console.log('Populating traffic rows...');
  const sources = ['Direct', 'Organic Search', 'Social', 'Referral'];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    await makeRequest('POST', `${prefix}/tables/${trafficTable.slug}/rows`, token, {
      data: {
        date: d.toISOString().split('T')[0],
        visitors: Math.floor(Math.random() * 5000) + 1000,
        pageviews: Math.floor(Math.random() * 12000) + 3000,
        bounceRate: Number((Math.random() * 0.4 + 0.3).toFixed(2)),
        source: sources[Math.floor(Math.random() * sources.length)]
      }
    });
  }

  console.log('Populating sales CRM rows...');
  const statuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Closed Won'];
  const companies = ['Acme Corp', 'Globex', 'Soylent', 'Initech', 'Umbrella Corp', 'Stark Ind.', 'Wayne Ent.'];
  for (let i = 0; i < 20; i++) {
    const stat = statuses[Math.floor(Math.random() * statuses.length)];
    const dealSize = stat === 'Lost' ? 0 : Math.floor(Math.random() * 50000) + 10000;
    await makeRequest('POST', `${prefix}/tables/${salesTable.slug}/rows`, token, {
      data: {
        leadName: companies[Math.floor(Math.random() * companies.length)] + ` #${i}`,
        status: stat,
        dealSize,
        isEnterprise: dealSize > 35000
      }
    });
  }

  console.log('Creating BPQL Dashboard Charts...');
  await makeRequest('POST', `${prefix}/charts`, token, {
    table: salesTable.slug,
    name: 'Total Pipeline Value',
    description: 'Sum of all deals in the CRM',
    chartType: 'number',
    aggFunction: 'sum',
    metricField: 'dealSize',
    placement: 'dashboard',
    order: 1,
    color: 'emerald'
  });

  await makeRequest('POST', `${prefix}/charts`, token, {
    table: salesTable.slug,
    name: 'Deals by Status',
    description: 'Count of leads per CRM status',
    chartType: 'pie',
    aggFunction: 'count',
    groupByField: 'status',
    placement: 'dashboard',
    order: 2
  });

  await makeRequest('POST', `${prefix}/charts`, token, {
    table: trafficTable.slug,
    name: 'Traffic Sources',
    description: 'Total visitors by source',
    chartType: 'bar',
    aggFunction: 'sum',
    metricField: 'visitors',
    groupByField: 'source',
    placement: 'dashboard',
    order: 3
  });

  console.log('Successfully seeded BPQL dummy data!');
}

run().catch((err) => {
  console.error('Error seeding BPQL data:', err);
  process.exit(1);
});
