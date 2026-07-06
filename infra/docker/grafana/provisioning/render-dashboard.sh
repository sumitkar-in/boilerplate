#!/bin/sh
set -eu

dashboard_time_from="${GRAFANA_DASHBOARD_TIME_FROM:-now-24h}"
mkdir -p /var/lib/grafana/dashboards

sed "s|__GRAFANA_DASHBOARD_TIME_FROM__|${dashboard_time_from}|g" \
  /etc/grafana/provisioning/dashboards/json/api-overview.json \
  > /var/lib/grafana/dashboards/api-overview.json

if grep -q '__GRAFANA_DASHBOARD_TIME_FROM__' /var/lib/grafana/dashboards/api-overview.json; then
  echo "Grafana dashboard time placeholder was not rendered" >&2
  exit 1
fi

if [ -f /var/lib/grafana/grafana.db ] && [ -n "${GF_SECURITY_ADMIN_PASSWORD:-}" ]; then
  grafana cli \
    --homepath /usr/share/grafana \
    --config /etc/grafana/grafana.ini \
    admin reset-admin-password "$GF_SECURITY_ADMIN_PASSWORD"
fi

exec /run.sh
