#!/usr/bin/env bash
# Claude Code statusline
# Shows: 1) model + effort  2) cwd  3) git branch  4) context usage %  5) rate limits %
# JSON parsing uses node (jq is NOT required — jq is absent on this machine).

input=$(cat)

# ---- colors (dim-friendly for terminal) ----
C_RESET="\033[0m"
C_DIM="\033[2m"
C_MODEL="\033[36m"   # cyan
C_DIR="\033[34m"     # blue
C_GIT="\033[32m"     # green
C_CTX="\033[33m"     # yellow
C_RATE="\033[35m"    # magenta

# ---- parse every field in one node pass (tab-separated) ----
fields=$(printf '%s' "$input" | node -e '
let s = "";
process.stdin.on("data", d => s += d).on("end", () => {
  let j = {};
  try { j = JSON.parse(s); } catch (e) {}
  const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  const str = x => (x === undefined || x === null) ? "" : String(x);
  process.stdout.write([
    str(get(j, "model.display_name")),
    str(get(j, "effort.level")),
    str(get(j, "workspace.current_dir")) || str(get(j, "cwd")),
    str(get(j, "context_window.used_percentage")),
    str(get(j, "rate_limits.five_hour.used_percentage")),
    str(get(j, "rate_limits.seven_day.used_percentage")),
  ].join("\t"));
});
' 2>/dev/null)

IFS=$'\t' read -r model_name effort cwd ctx_used five week <<< "$fields"

# never render an empty status line, even if parsing failed
[ -z "$model_name" ] && model_name="Claude"

# ---- 1) model + effort ----
model_part="$model_name"
[ -n "$effort" ] && model_part="${model_part} · ${effort}"

# ---- 2) cwd (shortened to ~ when under home) ----
display_cwd="$cwd"
for candidate in "$HOME" "$USERPROFILE"; do
  if [ -n "$candidate" ] && [[ "$cwd" == "$candidate"* ]]; then
    display_cwd="~${cwd#$candidate}"
    break
  fi
done

# ---- 3) git branch ----
git_branch=""
if [ -n "$cwd" ] && git -C "$cwd" --no-optional-locks rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null)
fi

# ---- 4) context usage % ----
ctx_part=""
if [ -n "$ctx_used" ]; then
  ctx_part=$(printf "Ctx %.0f%%" "$ctx_used" 2>/dev/null)
fi

# ---- 5) rate limits % (5h / 7d) ----
rate_part=""
if [ -n "$five" ]; then
  rate_part="5h:$(printf '%.0f' "$five" 2>/dev/null)%"
fi
if [ -n "$week" ]; then
  if [ -n "$rate_part" ]; then
    rate_part="${rate_part} 7d:$(printf '%.0f' "$week" 2>/dev/null)%"
  else
    rate_part="7d:$(printf '%.0f' "$week" 2>/dev/null)%"
  fi
fi

# ---- assemble with colored " | " separators ----
parts=()
[ -n "$model_part" ] && parts+=("$(printf "${C_MODEL}%s${C_RESET}" "$model_part")")
[ -n "$display_cwd" ] && parts+=("$(printf "${C_DIR}%s${C_RESET}" "$display_cwd")")
[ -n "$git_branch" ] && parts+=("$(printf "${C_GIT}%s${C_RESET}" "$git_branch")")
[ -n "$ctx_part" ] && parts+=("$(printf "${C_CTX}%s${C_RESET}" "$ctx_part")")
[ -n "$rate_part" ] && parts+=("$(printf "${C_RATE}%s${C_RESET}" "$rate_part")")

output=""
for p in "${parts[@]}"; do
  if [ -z "$output" ]; then
    output="$p"
  else
    output="${output}$(printf "${C_DIM} | ${C_RESET}")${p}"
  fi
done

printf "%s\n" "$output"
