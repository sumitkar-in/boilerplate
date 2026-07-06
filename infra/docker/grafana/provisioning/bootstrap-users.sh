#!/bin/sh
set -eu

until curl -fsS http://grafana:3000/api/health >/dev/null; do
  sleep 2
done

status="$(
  curl -sS \
    -o /tmp/grafana-viewer-create.json \
    -w '%{http_code}' \
    -u "$GRAFANA_ADMIN_USER:$GRAFANA_ADMIN_PASSWORD" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$GRAFANA_VIEWER_USER\",\"email\":\"$GRAFANA_VIEWER_EMAIL\",\"login\":\"$GRAFANA_VIEWER_USER\",\"password\":\"$GRAFANA_VIEWER_PASSWORD\",\"OrgId\":1}" \
    http://grafana:3000/api/admin/users
)"

if [ "$status" = "200" ] || [ "$status" = "412" ]; then
  echo "Grafana viewer user is ready"
  exit 0
fi

cat /tmp/grafana-viewer-create.json
exit 1
