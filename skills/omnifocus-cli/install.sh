#!/usr/bin/env bash
#
# Install the omnifocus-cli skill for AI coding agents.
#
# What this does:
#   1. Registers the OmniFocus MCP server with mcporter (pinned to this package version)
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

# Use the exact package version that shipped this installer. Pinning the version
# keeps generated schemas deterministic and avoids npm propagation/cache races
# immediately after a new release. If package metadata is unavailable (for a
# manually copied installer), fall back to @latest.
PACKAGE_VERSION="$(node -p "require('${SCRIPT_DIR}/../../package.json').version" 2>/dev/null || true)"
PACKAGE_SPEC="${PACKAGE}@${PACKAGE_VERSION:-latest}"

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
  npx -y ${PACKAGE}@latest install-skill             Install in the current project
  npx -y ${PACKAGE}@latest install-skill --global    Install for all projects

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
  MCPORTER_CONFIG="$HOME/.mcporter/mcporter.json"
  DEFAULT_SKILLS_ROOT="$HOME/.claude/skills"
  INSTALL_LABEL="global"
else
  MCPORTER_SCOPE="project"
  MCPORTER_CONFIG="$PROJECT_ROOT/config/mcporter.json"
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
# The package is pinned to this installer's version. Without the pin, npx may
# serve a stale cached build, which silently produces a CLI missing the newest
# tools.

info "Registering MCP server '$SERVER_NAME' with mcporter ($MCPORTER_SCOPE scope)"

npx -y mcporter@latest config add "$SERVER_NAME" \
  --command npx --arg -y --arg "$PACKAGE_SPEC" \
  --scope "$MCPORTER_SCOPE" >/dev/null
ok "Registered '$SERVER_NAME' -> npx -y $PACKAGE_SPEC ($MCPORTER_SCOPE scope)"

# mcporter only keeps a server process alive when its config entry asks for it.
# The built-in keep-alive defaults cover a handful of browser-automation servers
# and nothing else, so without this every CLI call re-resolves `npx -y` and cold
# starts a fresh server — measured at roughly 2x the wall time of a warm daemon.
# `config add` has no --lifecycle flag, so patch the entry we just wrote.

if ! node -e '
  const fs = require("node:fs");
  const [file, server] = process.argv.slice(1);
  const raw = fs.readFileSync(file, "utf8");
  const config = JSON.parse(raw);
  const entry = config.mcpServers?.[server];
  if (!entry) throw new Error(`no ${server} entry in ${file}`);
  entry.lifecycle = "keep-alive";
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
' "$MCPORTER_CONFIG" "$SERVER_NAME" 2>/dev/null; then
  warn "Could not set lifecycle=keep-alive in $MCPORTER_CONFIG."
  warn "The CLI still works, but every call cold starts a server (~2x slower)."
  warn "Add '\"lifecycle\": \"keep-alive\"' to the '$SERVER_NAME' entry by hand."
else
  ok "Enabled keep-alive so repeat calls reuse one warm server"
fi

# --- Generate the CLI --------------------------------------------------------

info "Generating CLI from the server's live tool schemas (this takes ~20s)"

mkdir -p "$TARGET_DIR/bin"

# --runtime node is deliberate. Without it mcporter picks the runtime from
# whatever is on PATH at generation time, emitting a `#!/usr/bin/env bun`
# shebang whenever Bun happens to be installed. Agents routinely invoke the CLI
# from a shell with a narrower PATH than the installing shell, and there the bun
# shebang fails to exec. Node 18+ is already a hard requirement above.
npx -y mcporter@latest generate-cli \
  --server "$SERVER_NAME" \
  --runtime node \
  --output "$TARGET_DIR/bin/omnifocus-enhanced.ts" \
  --bundle "$TARGET_DIR/bin/omnifocus-enhanced.cjs" >/dev/null

chmod +x "$TARGET_DIR/bin/omnifocus-enhanced.cjs"
ok "CLI bundled at $TARGET_DIR/bin/omnifocus-enhanced.cjs"

# mcporter bakes the resolved lifecycle into the bundle as a constant, so a
# bundle generated from an entry without keep-alive is permanently ephemeral --
# no environment variable can switch it on afterwards. Regenerating with
# `generate-cli --from <bundle>` also silently drops it, because the replay
# metadata omits lifecycle. Assert it landed rather than trusting the config.
if grep -q '"lifecycle"' "$TARGET_DIR/bin/omnifocus-enhanced.ts"; then
  ok "Keep-alive baked into the generated CLI"
else
  warn "The generated CLI did not inherit keep-alive; calls will be ~2x slower."
  warn "Re-run this installer to regenerate it. Never refresh the CLI with"
  warn "'mcporter generate-cli --from' -- that path drops keep-alive silently."
fi

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
  batch-move-tasks batch-complete-tasks batch-add-items batch-remove-items
  create-project-from-outline get-task-by-id read-task-attachment get-tasks
  set-repetition-rule manage-tags filter-tasks get-projects
  mark-projects-reviewed manage-perspectives manage-folders append-to-note
  count-tasks duplicate-task manage-task-notifications
)

HELP_OUTPUT="$("$TARGET_DIR/bin/omnifocus-enhanced.cjs" --help 2>&1 || true)"

MISSING=()
for cmd in "${REQUIRED_COMMANDS[@]}"; do
  grep -qE "(^|[[:space:]])${cmd}([[:space:]]|$)" <<<"$HELP_OUTPUT" || MISSING+=("$cmd")
done

if (( ${#MISSING[@]} > 0 )); then
  warn "The generated CLI is missing ${#MISSING[@]} expected command(s):"
  printf '      %s\n' "${MISSING[@]}" >&2
  warn "This installer pins the server to $PACKAGE_SPEC, so the server cannot be"
  warn "older than this skill. The checklist above is out of sync with the tools"
  warn "$PACKAGE actually registers -- please report this with the list above:"
  fail "https://github.com/jqlts1/omnifocus-mcp-enhanced/issues"
fi

ok "All ${#REQUIRED_COMMANDS[@]} tools present"

TASK_TREE_COMMANDS=(
  get-tasks filter-tasks get-task-by-id
)
for cmd in "${TASK_TREE_COMMANDS[@]}"; do
  TASK_TREE_HELP="$($TARGET_DIR/bin/omnifocus-enhanced.cjs "$cmd" --help 2>&1 || true)"
  if ! grep -q -- "--show-subtasks" <<<"$TASK_TREE_HELP" ||
     ! grep -q -- "--max-subtask-depth" <<<"$TASK_TREE_HELP"; then
    fail "The generated CLI command '$cmd' is missing v1.13 task-tree flags. Refresh the package and retry."
  fi
done
ok "Task-tree flags present on all ${#TASK_TREE_COMMANDS[@]} read commands"

FILTER_HELP="$("$TARGET_DIR/bin/omnifocus-enhanced.cjs" filter-tasks --help 2>&1 || true)"
if ! grep -q -- "--output-mode" <<<"$FILTER_HELP"; then
  fail "The generated filter-tasks command is missing the v1.16 compact output flag. Refresh the package and retry."
fi
ok "Compact output flag present on filter-tasks"
if ! grep -q -- "--cursor" <<<"$FILTER_HELP"; then
  fail "The generated filter-tasks command is missing the v1.17 cursor flag. Refresh the package and retry."
fi
ok "Pagination cursor flag present on filter-tasks"

OUTLINE_HELP="$($TARGET_DIR/bin/omnifocus-enhanced.cjs create-project-from-outline --help 2>&1 || true)"
if ! grep -q -- "--project" <<<"$OUTLINE_HELP" ||
   ! grep -q -- "--raw" <<<"$OUTLINE_HELP"; then
  fail "The generated create-project-from-outline command is missing its nested project input. Refresh the package and retry."
fi
ok "Nested project outline input present"

REPETITION_HELP="$($TARGET_DIR/bin/omnifocus-enhanced.cjs add-omnifocus-task --help 2>&1 || true)"
if ! grep -q -- "--repetition" <<<"$REPETITION_HELP" &&
   ! grep -q -- "--raw" <<<"$REPETITION_HELP"; then
  fail "The generated add-omnifocus-task command cannot accept the v1.20 repetition input. Refresh the package and retry."
fi
ok "Creation-time repetition input present"

# Confirm the CLI can actually reach OmniFocus, but do not hard-fail: the user
# may simply not have OmniFocus running right now.
if "$TARGET_DIR/bin/omnifocus-enhanced.cjs" count-tasks --perspective inbox >/dev/null 2>&1; then
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
  CLI:       $TARGET_DIR/bin/omnifocus-enhanced.cjs

Try it:
  $TARGET_DIR/bin/omnifocus-enhanced.cjs get-tasks --source inbox
  $TARGET_DIR/bin/omnifocus-enhanced.cjs count-tasks --flagged true

After upgrading $PACKAGE, re-run this installer to refresh the CLI:
  npx -y ${PACKAGE}@latest install-skill$([[ "$INSTALL_GLOBAL" == true ]] && printf ' --global')

Do not refresh it with 'mcporter generate-cli --from' -- that replays metadata
which omits lifecycle, so it silently drops keep-alive and doubles call latency.

The CLI runs its keep-alive daemon against its own generated config, not
$MCPORTER_CONFIG. Plain 'mcporter daemon status' therefore always reports
"not running" for it. Inspect the real daemon with:
  npx -y mcporter@latest --config \$(ls -t ~/.mcporter/generated/*.json | head -1) daemon status

EOF
