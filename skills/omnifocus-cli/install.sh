#!/usr/bin/env bash
#
# Install the omnifocus-cli skill for AI coding agents.
#
# What this does:
#   1. Registers the OmniFocus MCP server with mcporter (pinned to @latest)
#   2. Generates a standalone CLI bundle from the server's live tool schemas
#   3. Installs SKILL.md + the CLI into your agent skills directory
#   4. Verifies the generated CLI actually contains every server tool
#
# The CLI is generated on YOUR machine from YOUR installed server version, so it
# can never drift out of sync with the server the way a pre-built bundle would.

set -euo pipefail

SKILL_NAME="omnifocus-cli"
SERVER_NAME="omnifocus-enhanced"
PACKAGE="omnifocus-mcp-enhanced"

# Resolve this script's directory so we can find SKILL.md next to it.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info()  { printf '\033[36m==>\033[0m %s\n' "$1"; }
ok()    { printf '\033[32m  ✓\033[0m %s\n' "$1"; }
warn()  { printf '\033[33m  !\033[0m %s\n' "$1"; }
fail()  { printf '\033[31m  ✗\033[0m %s\n' "$1" >&2; exit 1; }

# Capture the caller's working directory. The default installation is local to
# this project; --global opts into the shared user-level skill and MCP config.
PROJECT_ROOT="$PWD"
INSTALL_GLOBAL=false

usage() {
  cat <<EOF
Install the omnifocus-cli agent skill.

Usage:
  npx $PACKAGE install-skill             Install in the current project
  npx $PACKAGE install-skill --global    Install for all projects

Default project locations:
  Skill:     ./.claude/skills/$SKILL_NAME
  mcporter:  ./config/mcporter.json

Global locations:
  Skill:     ~/.claude/skills/$SKILL_NAME
  mcporter:  ~/.mcporter/mcporter.json

Environment:
  CLAUDE_SKILLS_DIR  Override only the Claude skill installation root.
  AGENT_SKILLS_DIR   Legacy alias for CLAUDE_SKILLS_DIR.
EOF
}

while (( $# > 0 )); do
  case "$1" in
    --global|-g)
      INSTALL_GLOBAL=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1 (use --help for usage)."
      ;;
  esac
  shift
done

if [[ "$INSTALL_GLOBAL" == true ]]; then
  MCPORTER_SCOPE="home"
  DEFAULT_SKILLS_ROOT="$HOME/.claude/skills"
  INSTALL_LABEL="global"
else
  MCPORTER_SCOPE="project"
  DEFAULT_SKILLS_ROOT="$PROJECT_ROOT/.claude/skills"
  INSTALL_LABEL="project-local"
fi

SKILLS_ROOT="${CLAUDE_SKILLS_DIR:-${AGENT_SKILLS_DIR:-$DEFAULT_SKILLS_ROOT}}"
TARGET_DIR="$SKILLS_ROOT/$SKILL_NAME"

# --- Preflight ---------------------------------------------------------------

info "Checking prerequisites"

if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "OmniFocus is macOS-only; this skill cannot work on $(uname -s)."
fi
ok "macOS detected"

command -v node >/dev/null 2>&1 || fail "Node.js is required but was not found. Install Node 18+ and retry."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < 18 )); then
  fail "Node 18+ is required (found $(node -v))."
fi
ok "Node $(node -v)"

command -v npx >/dev/null 2>&1 || fail "npx is required but was not found."
ok "npx available"

if [[ ! -f "$SCRIPT_DIR/SKILL.md" ]]; then
  fail "SKILL.md not found next to this script (looked in $SCRIPT_DIR)."
fi
ok "SKILL.md found"
ok "$INSTALL_LABEL install selected"

# --- Register the MCP server -------------------------------------------------
#
# Pin the package to @latest. Without the tag, npx may serve a stale cached
# build, which silently produces a CLI missing the newest tools.

info "Registering MCP server '$SERVER_NAME' with mcporter ($MCPORTER_SCOPE scope)"

npx -y mcporter@latest config add "$SERVER_NAME" \
  --command npx --arg -y --arg "${PACKAGE}@latest" \
  --scope "$MCPORTER_SCOPE" >/dev/null
ok "Registered '$SERVER_NAME' -> npx -y ${PACKAGE}@latest ($MCPORTER_SCOPE scope)"

# --- Generate the CLI --------------------------------------------------------

info "Generating CLI from the server's live tool schemas (this takes ~20s)"

mkdir -p "$TARGET_DIR/bin"

npx -y mcporter@latest generate-cli \
  --server "$SERVER_NAME" \
  --output "$TARGET_DIR/bin/omnifocus-enhanced.ts" \
  --bundle "$TARGET_DIR/bin/omnifocus-enhanced.js" >/dev/null

chmod +x "$TARGET_DIR/bin/omnifocus-enhanced.js"
ok "CLI bundled at $TARGET_DIR/bin/omnifocus-enhanced.js"

# --- Install the skill manifest ----------------------------------------------

cp "$SCRIPT_DIR/SKILL.md" "$TARGET_DIR/SKILL.md"
ok "Installed SKILL.md"

# --- Verify ------------------------------------------------------------------
#
# A stale or partial CLI is the most common failure mode, so confirm the
# generated command set covers the tools this skill documents.

info "Verifying the generated CLI"

REQUIRED_COMMANDS=(
  dump-database add-omnifocus-task add-project remove-item edit-item move-task
  batch-add-items batch-remove-items get-task-by-id read-task-attachment
  get-today-completed-tasks set-repetition-rule get-inbox-tasks get-flagged-tasks
  get-forecast-tasks get-tasks-by-tag list-tags filter-tasks
  list-custom-perspectives get-custom-perspective-tasks
  add-folder edit-folder remove-folder list-folders get-folder
  append-to-note count-tasks duplicate-task
  add-tag edit-tag remove-tag search-tags
  list-task-notifications add-task-notification remove-task-notification
)

HELP_OUTPUT="$("$TARGET_DIR/bin/omnifocus-enhanced.js" --help 2>&1 || true)"

MISSING=()
for cmd in "${REQUIRED_COMMANDS[@]}"; do
  grep -qE "(^|[[:space:]])${cmd}([[:space:]]|$)" <<<"$HELP_OUTPUT" || MISSING+=("$cmd")
done

if (( ${#MISSING[@]} > 0 )); then
  warn "The generated CLI is missing ${#MISSING[@]} expected command(s):"
  printf '      %s\n' "${MISSING[@]}" >&2
  fail "Your installed $PACKAGE is probably older than this skill. Run 'npm cache clean --force' and retry."
fi

ok "All ${#REQUIRED_COMMANDS[@]} tools present"

# Confirm the CLI can actually reach OmniFocus, but do not hard-fail: the user
# may simply not have OmniFocus running right now.
if "$TARGET_DIR/bin/omnifocus-enhanced.js" count-tasks --perspective inbox >/dev/null 2>&1; then
  ok "Live connection to OmniFocus confirmed"
else
  warn "Could not reach OmniFocus. Make sure it is running and that automation"
  warn "permission is granted (System Settings > Privacy & Security > Automation)."
fi

# --- Done --------------------------------------------------------------------

cat <<EOF

$(printf '\033[32mSkill installed.\033[0m')

  Scope:     $INSTALL_LABEL
  Location:  $TARGET_DIR
  CLI:       $TARGET_DIR/bin/omnifocus-enhanced.js

Try it:
  $TARGET_DIR/bin/omnifocus-enhanced.js get-inbox-tasks
  $TARGET_DIR/bin/omnifocus-enhanced.js count-tasks --flagged true

After upgrading $PACKAGE, re-run this installer to refresh the CLI:
  npx $PACKAGE install-skill$([[ "$INSTALL_GLOBAL" == true ]] && printf ' --global')

EOF
