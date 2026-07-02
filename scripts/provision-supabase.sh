#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-timecity-rescue}"
SUPABASE_REGION="${SUPABASE_REGION:-eu-west-2}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required." >&2
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN or run: supabase login --token <token>" >&2
  exit 1
fi

if [[ -z "${SUPABASE_ORG_ID:-}" ]]; then
  echo "Set SUPABASE_ORG_ID. You can find it with: supabase orgs list" >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Set SUPABASE_DB_PASSWORD to a new database password for the project." >&2
  exit 1
fi

echo "Creating Supabase project: ${PROJECT_NAME} (${SUPABASE_REGION})"
supabase projects create "${PROJECT_NAME}" \
  --org-id "${SUPABASE_ORG_ID}" \
  --db-password "${SUPABASE_DB_PASSWORD}" \
  --region "${SUPABASE_REGION}"

echo
echo "Project creation can take a few minutes."
echo "When Supabase reports the project ref, run:"
echo "  supabase link --project-ref <project-ref>"
echo "  supabase db push"
echo "  supabase db query --linked --file supabase/seed/episode1_nodes.sql"
echo
echo "Then add these Vercel env vars and redeploy:"
echo "  NEXT_PUBLIC_SUPABASE_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo "  NEXT_PUBLIC_DEMO_MODE=false"
