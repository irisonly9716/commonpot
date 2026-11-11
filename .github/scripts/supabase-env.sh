#!/usr/bin/env bash
# Reads the local Supabase status and exports the variable names the tests use (.env.example).
# These are the throwaway keys of the local test stack, never production values.
set -euo pipefail
npx supabase status -o env > "$RUNNER_TEMP/supabase.env"
set -a
# shellcheck disable=SC1091
source "$RUNNER_TEMP/supabase.env"
set +a
: "${API_URL:?API_URL missing from supabase status}"
: "${ANON_KEY:?ANON_KEY missing from supabase status}"
: "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY missing from supabase status}"
{
  echo "NEXT_PUBLIC_SUPABASE_URL=$API_URL"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
  echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
} >> "$GITHUB_ENV"
