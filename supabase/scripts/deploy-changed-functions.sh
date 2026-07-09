#!/usr/bin/env bash
# Deploy only Supabase Edge Functions affected by the current change set.
# Used by .github/workflows/deploy-supabase-functions.yml
#
# Usage:
#   ./supabase/scripts/deploy-changed-functions.sh              # deploy changed
#   ./supabase/scripts/deploy-changed-functions.sh --plan-only  # print list, exit
#
# Local dry-run against last commit:
#   GITHUB_EVENT_BEFORE=HEAD~1 GITHUB_SHA=HEAD ./supabase/scripts/deploy-changed-functions.sh --plan-only

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-flpzqbvbymoluoeeeofg}"
PLAN_ONLY=false

if [[ "${1:-}" == "--plan-only" ]]; then
  PLAN_ONLY=true
fi

# Functions managed by CI (keep in sync with deploy-supabase-functions.yml)
ALL_FUNCTIONS=(
  send-reminder-emails
  send-contact-email
  send-new-user-email
  verify-captcha
  verify-unsubscribe-token
  process-recurring-transactions
  process-email-request
  get-monitoring-data
  get-posthog-analytics
  send-cron-alerts
)

# Redeploy when supabase/functions/_shared changes
SHARED_DEPENDENT=(
  send-reminder-emails
  send-contact-email
  send-new-user-email
  verify-captcha
  verify-unsubscribe-token
  process-email-request
  get-monitoring-data
  get-posthog-analytics
  send-cron-alerts
)

is_managed_function() {
  local name="$1"
  for fn in "${ALL_FUNCTIONS[@]}"; do
    if [[ "$fn" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

declare -A DEPLOY_SET=()

add_function() {
  local name="$1"
  if is_managed_function "$name"; then
    DEPLOY_SET["$name"]=1
  else
    echo "Warning: changed function '$name' is not in ALL_FUNCTIONS ג€” skipping (update deploy-changed-functions.sh to manage it)." >&2
  fi
}

collect_from_changed_files() {
  local files=("$@")

  if ((${#files[@]} == 0)); then
    echo "No changed files under supabase/functions or supabase/config.toml."
    return
  fi

  local redeploy_all=false

  for file in "${files[@]}"; do
    if [[ "$file" == "supabase/config.toml" ]]; then
      redeploy_all=true
      break
    fi
    if [[ "$file" == supabase/functions/_shared/* ]]; then
      for fn in "${SHARED_DEPENDENT[@]}"; do
        DEPLOY_SET["$fn"]=1
      done
    elif [[ "$file" == supabase/functions/*/* ]]; then
      local rest="${file#supabase/functions/}"
      local fn_name="${rest%%/*}"
      if [[ "$fn_name" != "_shared" ]]; then
        add_function "$fn_name"
      fi
    fi
  done

  if [[ "$redeploy_all" == true ]]; then
    DEPLOY_SET=()
    for fn in "${ALL_FUNCTIONS[@]}"; do
      DEPLOY_SET["$fn"]=1
    done
    echo "supabase/config.toml changed ג€” scheduling all managed functions."
  fi
}

get_changed_files() {
  local before="${GITHUB_EVENT_BEFORE:-}"
  local after="${GITHUB_SHA:-HEAD}"

  if [[ -n "$before" && "$before" != "0000000000000000000000000000000000000000" ]]; then
    git diff --name-only "$before" "$after" -- supabase/functions/ supabase/config.toml
  else
    echo "No GITHUB_EVENT_BEFORE (or initial push) ג€” diff against HEAD~1." >&2
    git diff --name-only HEAD~1 HEAD -- supabase/functions/ supabase/config.toml
  fi
}

mapfile -t CHANGED_FILES < <(get_changed_files)
collect_from_changed_files "${CHANGED_FILES[@]}"

if ((${#DEPLOY_SET[@]} == 0)); then
  echo "No managed functions to deploy."
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "deploy=false" >> "$GITHUB_OUTPUT"
    echo "functions=" >> "$GITHUB_OUTPUT"
  fi
  exit 0
fi

mapfile -t TO_DEPLOY < <(printf '%s\n' "${!DEPLOY_SET[@]}" | sort)

echo "Functions to deploy (${#TO_DEPLOY[@]}): ${TO_DEPLOY[*]}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "deploy=true" >> "$GITHUB_OUTPUT"
  echo "functions=${TO_DEPLOY[*]}" >> "$GITHUB_OUTPUT"
fi

if [[ "$PLAN_ONLY" == true ]]; then
  exit 0
fi

for fn in "${TO_DEPLOY[@]}"; do
  echo "--- Deploying $fn ---"
  if [[ "$fn" == "process-email-request" ]]; then
    # Cloudflare Email Routing uses a shared secret, not a Supabase JWT.
    supabase functions deploy "$fn" --no-verify-jwt --project-ref "$PROJECT_REF"
  else
    supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
  fi
done

echo "Done. Deployed ${#TO_DEPLOY[@]} function(s)."
