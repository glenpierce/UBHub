#!/usr/bin/env bash
#
# Build an Elastic Beanstalk source bundle (nodeServer/.appArchives/app-<N>.zip).
#
# The bundle holds the contents of nodeServer/ at the zip root (no node_modules;
# Elastic Beanstalk runs `npm install` and then `npm start`). It contains:
#   - every git-tracked file under nodeServer/ except tests and dev-only files
#   - the gitignored runtime secrets config.js and routes/preApprovedUser.json
#
# Nothing here calls AWS. Deploy the result with deploy-to-elastic-beanstalk.sh.
#
# Usage: deploy/build-bundle.sh [--skip-tests] [--allow-dirty]

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
server_directory="$repository_root/nodeServer"
archive_directory="$server_directory/.appArchives"

# Gitignored files the server needs at runtime. They are copied into the bundle
# from your local checkout; they must never be committed.
runtime_secret_files="config.js routes/preApprovedUser.json"

# Tracked files that are only for development and testing.
development_only_pattern='^(test/|Dockerfile$|\.dockerignore$|vitest\.config\.js$|.*\.md$)'

skip_tests=false
allow_dirty=false

print_usage() {
  # Print the header comment block (everything after the shebang up to the first code line).
  awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print; next } NR > 2 { exit }' "${BASH_SOURCE[0]}"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-tests) skip_tests=true ;;
    --allow-dirty) allow_dirty=true ;;
    -h|--help) print_usage; exit 0 ;;
    *) print_usage >&2; fail "Unknown option: $1" ;;
  esac
  shift
done

command -v zip >/dev/null || fail "zip is not installed"
command -v git >/dev/null || fail "git is not installed"

# --- 1. Source checks --------------------------------------------------------

uncommitted_changes="$(git -C "$repository_root" status --porcelain --untracked-files=no -- nodeServer)"
if [ -n "$uncommitted_changes" ]; then
  if [ "$allow_dirty" = true ]; then
    echo "WARNING: bundling uncommitted changes in nodeServer/:"
    echo "$uncommitted_changes"
  else
    echo "$uncommitted_changes" >&2
    fail "nodeServer/ has uncommitted changes. Commit them, or pass --allow-dirty."
  fi
fi

untracked_files="$(git -C "$repository_root" ls-files --others --exclude-standard -- nodeServer)"
if [ -n "$untracked_files" ]; then
  echo "NOTE: these untracked files will NOT be in the bundle (git add them if they should be):"
  echo "$untracked_files" | sed 's/^/  /'
fi

for secret_file in $runtime_secret_files; do
  [ -f "$server_directory/$secret_file" ] || fail "Missing nodeServer/$secret_file (required at runtime)."
done
if grep -q "ci-session-secret" "$server_directory/config.js"; then
  fail "nodeServer/config.js is the CI stub, not the real production config."
fi

# --- 2. Tests (in Docker, never on the host) ---------------------------------

if [ "$skip_tests" = true ]; then
  echo "WARNING: skipping tests."
else
  echo "Running tests in Docker..."
  test_compose_file="$repository_root/docker-compose.test.yml"
  tests_passed=true
  docker compose -f "$test_compose_file" up --build --exit-code-from node-server-test node-server-test || tests_passed=false
  docker compose -f "$test_compose_file" down --volumes --remove-orphans >/dev/null 2>&1 || true
  [ "$tests_passed" = true ] || fail "Tests failed; not building a bundle."
fi

# --- 3. Next version number (continues the existing app-<N>.zip sequence) ----

highest_version_number=0
for existing_bundle in "$server_directory"/app-*.zip "$archive_directory"/app-*.zip; do
  [ -e "$existing_bundle" ] || continue
  bundle_number="$(basename "$existing_bundle" .zip)"
  bundle_number="${bundle_number#app-}"
  case "$bundle_number" in
    ''|*[!0-9]*) continue ;;
  esac
  if [ "$bundle_number" -gt "$highest_version_number" ]; then
    highest_version_number="$bundle_number"
  fi
done
version_label="app-$((highest_version_number + 1))"
bundle_path="$archive_directory/$version_label.zip"

# --- 4. Build the zip ---------------------------------------------------------

mkdir -p "$archive_directory"
file_list="$(mktemp)"
trap 'rm -f "$file_list"' EXIT

git -C "$server_directory" ls-files \
  | grep -Ev "$development_only_pattern" \
  | while IFS= read -r tracked_file; do
      # Skip tracked files deleted in the working tree (only possible with --allow-dirty).
      if [ -f "$server_directory/$tracked_file" ]; then
        echo "$tracked_file"
      fi
    done > "$file_list"
for secret_file in $runtime_secret_files; do
  echo "$secret_file" >> "$file_list"
done

commit_description="$(git -C "$repository_root" log -1 --format='%h %s')"
if [ -n "$uncommitted_changes" ]; then
  commit_description="$commit_description (+ uncommitted changes)"
fi
bundle_comment="$version_label built $(date -u +%Y-%m-%dT%H:%M:%SZ) from $commit_description"

# -X: no macOS extended attributes; -@: read file names from stdin.
(cd "$server_directory" && zip -X -q "$bundle_path" -@ < "$file_list")
echo "$bundle_comment" | zip -q -z "$bundle_path"

# --- 5. Verify ------------------------------------------------------------------

bundle_listing="$(unzip -Z1 "$bundle_path")"
for required_file in package.json package-lock.json bin/www app.js $runtime_secret_files; do
  # Here-string, not a pipe: with pipefail, grep -q exiting early would fail the pipeline.
  grep -qx "$required_file" <<< "$bundle_listing" || fail "Bundle is missing $required_file"
done
if grep -Eq '^(node_modules/|test/|__MACOSX/)' <<< "$bundle_listing"; then
  fail "Bundle unexpectedly contains node_modules/, test/, or __MACOSX/"
fi

echo
echo "Built $bundle_path"
echo "  $(echo "$bundle_listing" | wc -l | tr -d ' ') files, $(du -h "$bundle_path" | cut -f1)"
echo "  $bundle_comment"
echo
echo "This bundle contains production secrets (config.js). Do not share or commit it."
echo "To deploy:  deploy/deploy-to-elastic-beanstalk.sh $bundle_path"
