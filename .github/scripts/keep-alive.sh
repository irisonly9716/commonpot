#!/usr/bin/env bash
# Sends one small request to the production Supabase REST API so the free project
# is not paused for inactivity (issue #49). Needs SUPABASE_URL and SUPABASE_ANON_KEY.
# Warns and exits 0 while they are not set yet. Never prints the key.
set -euo pipefail

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "::warning::SUPABASE_URL or SUPABASE_ANON_KEY is not set yet, so nothing was pinged. Add both as repository secrets."
  exit 0
fi

# Row level security returns an empty list for the anonymous role, but the
# request still runs a query on the database, which counts as activity.
url="${SUPABASE_URL%/}/rest/v1/default_categories?select=id&limit=1"

status=$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --max-time 20 --retry 2 --retry-delay 5 \
  --header "apikey: ${SUPABASE_ANON_KEY}" \
  --header "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  "$url" 2>/dev/null) || status="000"

case "$status" in
  2??)
    echo "Supabase answered ${status}. The project saw activity."
    ;;
  000)
    echo "::error::Could not reach Supabase at the configured URL. Check the SUPABASE_URL secret and whether the project is paused."
    exit 1
    ;;
  *)
    echo "::error::Supabase answered ${status}. Check the SUPABASE_ANON_KEY secret and whether the project is paused."
    exit 1
    ;;
esac
