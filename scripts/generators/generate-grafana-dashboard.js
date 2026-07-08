#!/usr/bin/env node
//
// generate-grafana-dashboard.js
//
// Scaffolds a provisioned Grafana dashboard for one module: request rate,
// p95 latency, error-rate stats, and recent logs — all filtered to the
// module's routes. Written to
// infra/docker/grafana/provisioning/dashboards/json/<module>.json and picked
// up automatically by render-dashboard.sh on the next grafana container start.
//
// Usage:
//   node scripts/generators/generate-grafana-dashboard.js --module=employees
//   node scripts/generators/generate-grafana-dashboard.js --module=sales-orders --title="Sales Orders"

const path = require('path');
const { toKebabCase, toTitleCase } = require('./_lib/casing');
const { fail, log, ok } = require('./_lib/log');
const { parseArgs } = require('./_lib/parse-args');
const { repoRoot, writeFile } = require('./_lib/fs-helpers');

const ROOT = repoRoot(__filename);
const DASHBOARD_DIR = 'infra/docker/grafana/provisioning/dashboards/json';

const prometheus = { type: 'prometheus', uid: 'prometheus' };
const loki = { type: 'loki', uid: 'loki' };

function printUsageAndExit() {
  console.log(`
Usage:
  node scripts/generators/generate-grafana-dashboard.js --module=<feature> [--title="<Title>"] [--route-regex="<regex>"]

Examples:
  node scripts/generators/generate-grafana-dashboard.js --module=employees
  node scripts/generators/generate-grafana-dashboard.js --module=sales-orders --title="Sales Orders"
`);
  process.exit(1);
}

function buildDashboard({ moduleKey, title, routeRegex }) {
  const routeFilter = `route=~"${routeRegex}", tenant_slug=~"$tenant"`;
  let panelId = 0;
  const panel = (overrides) => ({ id: ++panelId, ...overrides });

  return {
    title,
    uid: `mod-${moduleKey}`.slice(0, 40),
    editable: true,
    timezone: 'browser',
    schemaVersion: 39,
    time: { from: '__GRAFANA_DASHBOARD_TIME_FROM__', to: 'now' },
    refresh: '10s',
    templating: {
      list: [
        {
          name: 'tenant',
          label: 'Tenant',
          type: 'query',
          datasource: prometheus,
          query: 'label_values(http_requests_total, tenant_slug)',
          refresh: 1,
          includeAll: true,
          allValue: '.*',
          multi: true,
          current: { selected: true, text: 'All', value: '$__all' },
        },
        {
          name: 'env',
          label: 'Environment',
          type: 'query',
          datasource: loki,
          query: 'label_values({app="api"}, env)',
          refresh: 1,
          includeAll: true,
          allValue: '.*',
          multi: true,
          current: { selected: true, text: 'All', value: '$__all' },
        },
      ],
    },
    panels: [
      panel({
        title: 'Request rate',
        type: 'stat',
        datasource: prometheus,
        gridPos: { h: 4, w: 6, x: 0, y: 0 },
        fieldConfig: { defaults: { unit: 'reqps' }, overrides: [] },
        options: { reduceOptions: { calcs: ['lastNotNull'] } },
        targets: [
          {
            datasource: prometheus,
            expr: `sum(rate(http_requests_total{${routeFilter}}[5m]))`,
            legendFormat: 'requests/sec',
          },
        ],
      }),
      panel({
        title: 'Error rate (5xx %)',
        type: 'stat',
        datasource: prometheus,
        gridPos: { h: 4, w: 6, x: 6, y: 0 },
        fieldConfig: { defaults: { unit: 'percent' }, overrides: [] },
        options: { reduceOptions: { calcs: ['lastNotNull'] } },
        targets: [
          {
            datasource: prometheus,
            expr: `100 * sum(rate(http_requests_total{${routeFilter}, status_code=~"5.."}[5m])) / clamp_min(sum(rate(http_requests_total{${routeFilter}}[5m])), 1e-9)`,
            legendFormat: 'error %',
          },
        ],
      }),
      panel({
        title: 'p95 request duration',
        type: 'stat',
        datasource: prometheus,
        gridPos: { h: 4, w: 6, x: 12, y: 0 },
        fieldConfig: { defaults: { unit: 's' }, overrides: [] },
        options: { reduceOptions: { calcs: ['lastNotNull'] } },
        targets: [
          {
            datasource: prometheus,
            expr: `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{${routeFilter}}[5m])))`,
            legendFormat: 'p95',
          },
        ],
      }),
      panel({
        title: 'Request rate by route',
        type: 'timeseries',
        datasource: prometheus,
        gridPos: { h: 8, w: 12, x: 0, y: 4 },
        targets: [
          {
            datasource: prometheus,
            expr: `sum by (route, status_code) (rate(http_requests_total{${routeFilter}}[5m]))`,
            legendFormat: '{{route}} [{{status_code}}]',
          },
        ],
      }),
      panel({
        title: 'p95 duration by route',
        type: 'timeseries',
        datasource: prometheus,
        gridPos: { h: 8, w: 12, x: 12, y: 4 },
        fieldConfig: { defaults: { unit: 's' }, overrides: [] },
        targets: [
          {
            datasource: prometheus,
            expr: `histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket{${routeFilter}}[5m])))`,
            legendFormat: '{{route}}',
          },
        ],
      }),
      panel({
        title: 'Tenant request rate',
        type: 'timeseries',
        datasource: prometheus,
        gridPos: { h: 8, w: 12, x: 0, y: 12 },
        targets: [
          {
            datasource: prometheus,
            expr: `sum by (tenant_slug) (rate(http_requests_total{${routeFilter}}[5m]))`,
            legendFormat: '{{tenant_slug}}',
          },
        ],
      }),
      panel({
        title: 'Recent logs',
        type: 'logs',
        datasource: loki,
        gridPos: { h: 10, w: 24, x: 0, y: 20 },
        targets: [
          {
            datasource: loki,
            expr: `{app="api", env=~"$env"} | json | req_url=~"${routeRegex}"`,
          },
        ],
      }),
    ],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.module || args.module === true) printUsageAndExit();

  const moduleKey = toKebabCase(String(args.module));
  const title = args.title && args.title !== true ? String(args.title) : toTitleCase(moduleKey);
  const routeRegex =
    args['route-regex'] && args['route-regex'] !== true
      ? String(args['route-regex'])
      : `.*/${moduleKey}.*`;

  const dashboard = buildDashboard({ moduleKey, title, routeRegex });
  const target = path.join(ROOT, DASHBOARD_DIR, `${moduleKey}.json`);

  log(`Generating Grafana dashboard ${DASHBOARD_DIR}/${moduleKey}.json (uid ${dashboard.uid})`);
  const created = writeFile(target, JSON.stringify(dashboard, null, 2), { rootForLog: ROOT });
  if (!created) fail(`${DASHBOARD_DIR}/${moduleKey}.json already exists — refusing to overwrite.`);

  ok('Done. Restart the grafana container to provision it: docker compose -f infra/docker/docker-compose.yml --env-file .env restart grafana');
}

main();
