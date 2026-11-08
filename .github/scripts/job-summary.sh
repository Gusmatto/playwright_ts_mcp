#!/usr/bin/env bash
# Writes a short pass/fail summary of a Playwright JSON report to $GITHUB_STEP_SUMMARY.
# Usage: job-summary.sh "<title>" [path/to/results.json]
set -uo pipefail

title="${1:?usage: job-summary.sh <title> [results.json]}"
report="${2:-test-results/results.json}"
out="${GITHUB_STEP_SUMMARY:-/dev/stdout}"

if [ ! -f "$report" ]; then
  printf '## %s\n\n:warning: No results file at `%s` — the run likely failed before any test executed (install, type check or config error). See the step logs.\n' "$title" "$report" >> "$out"
  exit 0
fi

read -r passed failed flaky skipped < <(
  jq -r '.stats | "\(.expected) \(.unexpected) \(.flaky) \(.skipped)"' "$report"
)

if [ "$failed" -gt 0 ]; then verdict=":x: **Failed**"; else verdict=":white_check_mark: **Passed**"; fi

{
  printf '## %s\n\n%s\n\n' "$title" "$verdict"
  printf '| Passed | Failed | Flaky (passed on retry) | Skipped |\n|---:|---:|---:|---:|\n'
  printf '| %s | %s | %s | %s |\n' "$passed" "$failed" "$flaky" "$skipped"

  if [ "$failed" -gt 0 ]; then
    printf '\n### Failed tests\n\n'
    jq -r '[.. | objects | select(has("specs")) | .specs[] | select(.ok == false) | .title] | unique[] | "- " + .' "$report"
    printf '\nThe HTML report and traces are attached to this run as artifacts.\n'
  fi
  if [ "$flaky" -gt 0 ]; then
    printf '\n### Flaky tests\n\n'
    jq -r '[.. | objects | select(has("specs")) | .specs[] | select(.tests[0].status == "flaky") | .title] | unique[] | "- " + .' "$report"
  fi
} >> "$out"
