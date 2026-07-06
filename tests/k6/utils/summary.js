function metricValue(data, name, key) {
  const metric = data.metrics?.[name];
  if (!metric?.values) return undefined;
  return metric.values[key];
}

function formatNumber(value, suffix = '') {
  if (value === undefined || value === null || Number.isNaN(value)) return 'n/a';
  if (typeof value !== 'number') return String(value);
  return `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`;
}

function checkRate(data) {
  return metricValue(data, 'checks', 'rate') ?? 0;
}

function failedRate(data) {
  return metricValue(data, 'http_req_failed', 'rate') ?? 0;
}

export function textSummary(data) {
  const checksRate = checkRate(data);
  const httpFailedRate = failedRate(data);
  const checksPass = checksRate === 1;
  const httpPass = httpFailedRate === 0;
  const status = checksPass && httpPass ? 'PASS' : 'FAIL';

  return [
    '',
    `k6 result: ${status}`,
    `checks: ${formatNumber(checksRate * 100, '%')}`,
    `http_req_failed: ${formatNumber(httpFailedRate * 100, '%')}`,
    `http_reqs: ${formatNumber(metricValue(data, 'http_reqs', 'count'))}`,
    `http_req_duration avg: ${formatNumber(metricValue(data, 'http_req_duration', 'avg'), 'ms')}`,
    `http_req_duration p95: ${formatNumber(metricValue(data, 'http_req_duration', 'p(95)'), 'ms')}`,
    '',
  ].join('\n');
}

export function htmlSummary(data) {
  const rows = [
    ['Result', checkRate(data) === 1 && failedRate(data) === 0 ? 'PASS' : 'FAIL'],
    ['Checks', `${formatNumber(checkRate(data) * 100)}%`],
    ['HTTP failures', `${formatNumber(failedRate(data) * 100)}%`],
    ['HTTP requests', formatNumber(metricValue(data, 'http_reqs', 'count'))],
    ['Avg request duration', `${formatNumber(metricValue(data, 'http_req_duration', 'avg'))} ms`],
    ['P95 request duration', `${formatNumber(metricValue(data, 'http_req_duration', 'p(95)'))} ms`],
  ];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>k6 summary</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 32px; color: #111827; }
      table { border-collapse: collapse; min-width: 420px; }
      th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
      th { background: #f3f4f6; }
    </style>
  </head>
  <body>
    <h1>k6 summary</h1>
    <table>
      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        ${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('\n        ')}
      </tbody>
    </table>
  </body>
</html>`;
}
