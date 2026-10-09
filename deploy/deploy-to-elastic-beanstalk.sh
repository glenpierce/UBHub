#!/usr/bin/env bash
#
# Deploy a bundle from build-bundle.sh to AWS Elastic Beanstalk.
# Meant to be run by a human with AWS credentials (AWS CLI v2).
#
# Steps: upload the zip to Elastic Beanstalk's S3 bucket, register it as an
# application version, point the environment at it, and wait for the result.
#
# Settings come from the environment or from deploy/deploy.env (gitignored;
# copy deploy/deploy.env.example):
#   EB_APPLICATION_NAME  Elastic Beanstalk application name   (required)
#   EB_ENVIRONMENT_NAME  Elastic Beanstalk environment name   (required)
#   AWS_REGION           e.g. us-west-2                       (required)
#   AWS_PROFILE          AWS CLI profile to use               (optional)
#   EB_S3_BUCKET         bucket for bundles (optional; defaults to Elastic
#                        Beanstalk's own elasticbeanstalk-<region>-<account>)
#
# Usage: deploy/deploy-to-elastic-beanstalk.sh [--dry-run] nodeServer/.appArchives/app-<N>.zip
#   --dry-run  print the AWS commands without running any of them

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
settings_file="$script_directory/deploy.env"

dry_run=false
bundle_path=""

print_usage() {
  sed -n '3,22p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=true ;;
    -h|--help) print_usage; exit 0 ;;
    -*) print_usage >&2; fail "Unknown option: $1" ;;
    *) [ -z "$bundle_path" ] || fail "Only one bundle path may be given."; bundle_path="$1" ;;
  esac
  shift
done

# --- Settings -------------------------------------------------------------------

if [ -f "$settings_file" ]; then
  # shellcheck source=/dev/null
  . "$settings_file"
fi
[ -n "${EB_APPLICATION_NAME:-}" ] || fail "EB_APPLICATION_NAME is not set (see deploy/deploy.env.example)."
[ -n "${EB_ENVIRONMENT_NAME:-}" ] || fail "EB_ENVIRONMENT_NAME is not set (see deploy/deploy.env.example)."
[ -n "${AWS_REGION:-}" ] || fail "AWS_REGION is not set (see deploy/deploy.env.example)."
if [ -n "${AWS_PROFILE:-}" ]; then
  export AWS_PROFILE
fi

[ -n "$bundle_path" ] || { print_usage >&2; fail "No bundle given. Build one with deploy/build-bundle.sh."; }
[ -f "$bundle_path" ] || fail "Bundle not found: $bundle_path"

version_label="$(basename "$bundle_path" .zip)"
case "$version_label" in
  app-[0-9]*) ;;
  *) fail "Bundle must be named app-<N>.zip (got $(basename "$bundle_path"))." ;;
esac

# The build script stores provenance in the zip comment; it becomes the version description.
version_description="$(unzip -z "$bundle_path" | tail -n +2 | head -1 | cut -c1-200)"
[ -n "$version_description" ] || version_description="$version_label"

# --- AWS helpers ----------------------------------------------------------------

# Print every AWS command; run it unless this is a dry run.
run_aws() {
  echo "+ aws $*" >&2
  if [ "$dry_run" = true ]; then
    return 0
  fi
  aws --region "$AWS_REGION" "$@"
}

# Read-only AWS queries whose output the script needs. In a dry run, print the
# command and return the given placeholder instead.
query_aws() {
  local placeholder="$1"
  shift
  if [ "$dry_run" = true ]; then
    echo "+ aws $*" >&2
    echo "$placeholder"
    return 0
  fi
  aws --region "$AWS_REGION" "$@"
}

if [ "$dry_run" = false ]; then
  command -v aws >/dev/null || fail "The AWS CLI (v2) is not installed."
fi

# --- 1. Confirm target ------------------------------------------------------------

aws_account="$(query_aws "<account-id>" sts get-caller-identity --query Account --output text)"
current_version_label="$(query_aws "<current-version>" elasticbeanstalk describe-environments \
  --application-name "$EB_APPLICATION_NAME" --environment-names "$EB_ENVIRONMENT_NAME" \
  --query 'Environments[0].VersionLabel' --output text)"
[ "$current_version_label" != "None" ] || fail "Environment $EB_ENVIRONMENT_NAME not found in application $EB_APPLICATION_NAME."

echo
echo "About to deploy:"
echo "  bundle       $bundle_path ($(du -h "$bundle_path" | cut -f1))"
echo "  version      $version_label: $version_description"
echo "  account      $aws_account (profile: ${AWS_PROFILE:-default})"
echo "  region       $AWS_REGION"
echo "  application  $EB_APPLICATION_NAME"
echo "  environment  $EB_ENVIRONMENT_NAME (currently running: $current_version_label)"
echo

if [ "$dry_run" = false ]; then
  read -r -p "Type the environment name ($EB_ENVIRONMENT_NAME) to continue: " confirmation
  [ "$confirmation" = "$EB_ENVIRONMENT_NAME" ] || fail "Confirmation did not match; nothing was deployed."
fi

# --- 2. Upload to S3 --------------------------------------------------------------

if [ -n "${EB_S3_BUCKET:-}" ]; then
  bundle_bucket="$EB_S3_BUCKET"
else
  # Idempotent: returns (creating it on first use) Elastic Beanstalk's own bucket.
  bundle_bucket="$(query_aws "elasticbeanstalk-$AWS_REGION-<account-id>" elasticbeanstalk create-storage-location \
    --query S3Bucket --output text)"
fi
bundle_key="$EB_APPLICATION_NAME/$version_label.zip"

run_aws s3 cp "$bundle_path" "s3://$bundle_bucket/$bundle_key" --only-show-errors

# --- 3. Register the application version -------------------------------------------

run_aws elasticbeanstalk create-application-version \
  --application-name "$EB_APPLICATION_NAME" \
  --version-label "$version_label" \
  --description "$version_description" \
  --source-bundle "S3Bucket=$bundle_bucket,S3Key=$bundle_key" \
  --process \
  --output text --query 'ApplicationVersion.Status'

# --process validates the bundle asynchronously; wait until it is PROCESSED.
if [ "$dry_run" = false ]; then
  echo "Waiting for Elastic Beanstalk to process $version_label..."
  for attempt in $(seq 1 60); do
    version_status="$(aws --region "$AWS_REGION" elasticbeanstalk describe-application-versions \
      --application-name "$EB_APPLICATION_NAME" --version-labels "$version_label" \
      --query 'ApplicationVersions[0].Status' --output text)"
    case "$version_status" in
      PROCESSED) break ;;
      FAILED) fail "Elastic Beanstalk rejected the bundle (status FAILED). Check the Events tab in the console." ;;
    esac
    [ "$attempt" -lt 60 ] || fail "Timed out waiting for $version_label to be processed (status $version_status)."
    sleep 5
  done
fi

# --- 4. Deploy ----------------------------------------------------------------------

run_aws elasticbeanstalk update-environment \
  --environment-name "$EB_ENVIRONMENT_NAME" \
  --version-label "$version_label" \
  --output text --query 'Status'

echo "Waiting for the environment update to finish (this can take several minutes)..."
# The waiter gives up after about 7 minutes; fall through to the health report either way.
run_aws elasticbeanstalk wait environment-updated \
  --application-name "$EB_APPLICATION_NAME" \
  --environment-names "$EB_ENVIRONMENT_NAME" \
  || echo "WARNING: stopped waiting before the environment reported Ready."

# --- 5. Report ------------------------------------------------------------------------

rollback_command="aws --region $AWS_REGION elasticbeanstalk update-environment --environment-name $EB_ENVIRONMENT_NAME --version-label $current_version_label"

if [ "$dry_run" = true ]; then
  echo
  echo "Dry run complete; nothing was uploaded or deployed."
  exit 0
fi

read -r deployed_version_label environment_health environment_url <<< "$(aws --region "$AWS_REGION" elasticbeanstalk describe-environments \
  --application-name "$EB_APPLICATION_NAME" --environment-names "$EB_ENVIRONMENT_NAME" \
  --query 'Environments[0].[VersionLabel,Health,CNAME]' --output text)"

echo
echo "Environment $EB_ENVIRONMENT_NAME is running $deployed_version_label (health: $environment_health)"
echo "  http://$environment_url"
if [ "$deployed_version_label" != "$version_label" ] || [ "$environment_health" != "Green" ]; then
  echo
  echo "WARNING: deployment did not end Green on $version_label. Check the Events and Logs tabs."
  echo "To roll back to the previous version:"
  echo "  $rollback_command"
  exit 1
fi
echo "To roll back if needed:"
echo "  $rollback_command"
