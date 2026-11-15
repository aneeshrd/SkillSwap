#!/usr/bin/env bash
#
# One-shot Fly.io deploy for SkillSwap.
#
#   ./scripts/deploy.sh
#
# Creates the app, the volume and the secrets, then deploys. Safe to re-run:
# each step checks whether it has already been done. Running it again after a
# code change is just `fly deploy`.

set -euo pipefail

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
warn() { printf '\033[33m%s\033[0m\n' "$1"; }
die()  { printf '\033[31m%s\033[0m\n' "$1" >&2; exit 1; }

ask() { # ask VAR "prompt" "default"
  local __var=$1 __prompt=$2 __default=${3:-} __reply
  if [ -n "$__default" ]; then
    read -rp "$__prompt [$__default]: " __reply
    __reply=${__reply:-$__default}
  else
    read -rp "$__prompt: " __reply
  fi
  printf -v "$__var" '%s' "$__reply"
}

command -v fly >/dev/null || die "flyctl not found. Install it: curl -L https://fly.io/install.sh | sh"
command -v node >/dev/null || die "node not found — needed to generate SESSION_SECRET."
fly auth whoami >/dev/null 2>&1 || die "Not logged in. Run: fly auth login"

bold "SkillSwap deploy"
echo

ask APP_NAME "App name (becomes https://<name>.fly.dev)" "skillswap"
ask REGION   "Region" "iad"
echo
bold "Who may register"
ask DOMAINS  "School email domains, comma separated" "example.edu"
ask ADMINS   "Moderator emails, comma separated"
echo
bold "Email — without this nobody can verify an account, so nobody can sign up"
echo "Get a key at https://resend.com/api-keys"
ask RESEND   "RESEND_API_KEY (blank = codes only reach the server log)"
if [ -n "$RESEND" ]; then
  ask MAILFROM "EMAIL_FROM" "SkillSwap <onboarding@resend.dev>"
fi
echo
bold "TURN relay — without it, calls fail on networks that block peer-to-peer"
echo "Free credentials at https://www.metered.ca/tools/openrelay/  (Enter to skip)"
ask TURN_URL  "TURN_URL"
if [ -n "$TURN_URL" ]; then
  ask TURN_USER "TURN_USERNAME"
  ask TURN_PASS "TURN_CREDENTIAL"
fi
echo

# ---------------------------------------------------------------- app
if fly status --app "$APP_NAME" >/dev/null 2>&1; then
  echo "App $APP_NAME already exists — reusing it."
else
  bold "Creating the app"
  fly launch --no-deploy --copy-config --name "$APP_NAME" --region "$REGION" --yes
fi

# ------------------------------------------------------------- volume
# fly.toml mounts /data, so this must exist before the first deploy.
if fly volumes list --app "$APP_NAME" 2>/dev/null | grep -q skillswap_data; then
  echo "Volume skillswap_data already exists."
else
  bold "Creating the 1GB volume for the database"
  fly volumes create skillswap_data --size 1 --region "$REGION" --app "$APP_NAME" --yes
fi

# ------------------------------------------------------------ secrets
bold "Setting secrets"
SECRET_ARGS=(
  "SESSION_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
  "ALLOWED_EMAIL_DOMAINS=$DOMAINS"
  "ADMIN_EMAILS=$ADMINS"
)
if [ -n "$RESEND" ]; then
  SECRET_ARGS+=("RESEND_API_KEY=$RESEND" "EMAIL_FROM=$MAILFROM" "EMAIL_TRANSPORT=resend")
else
  SECRET_ARGS+=("EMAIL_TRANSPORT=console")
  warn "No mail key: verification codes will only appear in 'fly logs'."
fi
if [ -n "$TURN_URL" ]; then
  SECRET_ARGS+=("TURN_URL=$TURN_URL" "TURN_USERNAME=$TURN_USER" "TURN_CREDENTIAL=$TURN_PASS")
else
  warn "No TURN relay: calls will fail on networks that block peer-to-peer."
fi

# SESSION_SECRET must not be regenerated on a re-run — that logs everyone out.
if fly secrets list --app "$APP_NAME" 2>/dev/null | grep -q SESSION_SECRET; then
  echo "SESSION_SECRET already set — keeping the existing one."
  SECRET_ARGS=("${SECRET_ARGS[@]:1}")
fi
fly secrets set --app "$APP_NAME" --stage "${SECRET_ARGS[@]}"

# ------------------------------------------------------------- deploy
bold "Deploying"
fly deploy --app "$APP_NAME"

# The database and the call rooms are both per-process.
fly scale count 1 --app "$APP_NAME" --yes >/dev/null 2>&1 || true

echo
bold "Deployed: https://$APP_NAME.fly.dev"
echo
echo "Check it:"
echo "  curl https://$APP_NAME.fly.dev/health"
echo "  fly logs --app $APP_NAME"
echo
echo "The database starts empty with 55 skills and no students — that is correct."
echo "Do NOT run the seed in production; it creates seventeen fictional people."
