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
C_SESSION="\033[1;37m" # bold white

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
    str(get(j, "rate_limits.five_hour.resets_at")),
    str(get(j, "rate_limits.seven_day.resets_at")),
    str(get(j, "session_name")),
  ].join("\t"));
});
' 2>/dev/null)

IFS=$'\t' read -r model_name effort cwd ctx_used five week five_reset week_reset session_name <<< "$fields"

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

# ---- 3) git branch (+ dirty file count) ----
git_branch=""
if [ -n "$cwd" ] && git -C "$cwd" --no-optional-locks rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_branch=$(git -C "$cwd" --no-optional-locks branch --show-current 2>/dev/null)
  dirty_count=$(git -C "$cwd" --no-optional-locks status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ -n "$dirty_count" ] && [ "$dirty_count" -gt 0 ] 2>/dev/null; then
    git_branch="${git_branch} ●${dirty_count}"
  fi
fi

# ---- 4) context usage % ----
ctx_part=""
if [ -n "$ctx_used" ]; then
  ctx_part=$(printf "Ctx %.0f%%" "$ctx_used" 2>/dev/null)
fi

# ---- 5) rate limits % (5h / 7d) + reset countdown ----
fmt_countdown() {
  local target="$1"
  [ -z "$target" ] && return
  local now diff
  now=$(date +%s 2>/dev/null) || return
  diff=$(( target - now ))
  if [ "$diff" -le 0 ]; then
    printf "곧"
    return
  fi
  local days=$(( diff / 86400 ))
  local hours=$(( (diff % 86400) / 3600 ))
  local mins=$(( (diff % 3600) / 60 ))
  if [ "$days" -gt 0 ]; then
    printf "%dd%dh" "$days" "$hours"
  elif [ "$hours" -gt 0 ]; then
    printf "%dh%dm" "$hours" "$mins"
  else
    printf "%dm" "$mins"
  fi
}
five_reset_fmt=$(fmt_countdown "$five_reset")
week_reset_fmt=$(fmt_countdown "$week_reset")

rate_part=""
if [ -n "$five" ]; then
  rate_part="5h:$(printf '%.0f' "$five" 2>/dev/null)%"
  [ -n "$five_reset_fmt" ] && rate_part="${rate_part}(${five_reset_fmt})"
fi
if [ -n "$week" ]; then
  week_str="7d:$(printf '%.0f' "$week" 2>/dev/null)%"
  [ -n "$week_reset_fmt" ] && week_str="${week_str}(${week_reset_fmt})"
  if [ -n "$rate_part" ]; then
    rate_part="${rate_part} ${week_str}"
  else
    rate_part="$week_str"
  fi
fi

# ---- assemble with colored " | " separators ----
parts=()
[ -n "$session_name" ] && parts+=("$(printf "${C_SESSION}%s${C_RESET}" "$session_name")")
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
