#!/usr/bin/env bash
# Prints a link that imports the ops metrics settings of every municipality
# into the tracker. Needs the AWS CLI with the profiles below, and jq.
# Progress goes to stderr, so `scripts/metrics-import-link.sh prod | pbcopy`
# copies only the link.
set -euo pipefail

usage() {
  echo "Usage: $0 staging|prod" >&2
  exit 2
}

[[ $# -eq 1 ]] || usage
case "$1" in
staging)
  espoo_env=staging
  other_env="test"
  ;;
prod)
  espoo_env=prod
  other_env=prod
  ;;
*) usage ;;
esac

tracker_url="${TRACKER_URL:-https://espoon-voltti.github.io/evaka-update-tracker/}"

# Fields: city id in the tracker, AWS profile, region, reader function, token
# parameter. The function and parameter names must match the ops-metrics
# module block in each municipality's infra repo.
municipalities=(
  "espoo voltti-evaka-$espoo_env eu-north-1 evaka-$espoo_env-ops-metrics-reader /$espoo_env/evaka/ops-metrics-token"
  "oulu evakaoulu-$other_env eu-west-1 evakaoulu-$other_env-ops-metrics-reader /evakaoulu-$other_env/ops-metrics/token"
  "turku evakaturku-$other_env eu-west-1 evakaturku-$other_env-ops-metrics-reader /evakaturku-$other_env/ops-metrics/token"
)

errors=$(mktemp)
trap 'rm -f "$errors"' EXIT

skip() {
  echo "Skipping $1: $2" >&2
}

aws_error() {
  grep -m1 . "$errors" || echo "aws failed without an error message"
}

payload=$(jq -nc --arg env "$1" '{v: 1, env: $env, cities: {}}')
for entry in "${municipalities[@]}"; do
  read -r city profile region function parameter <<<"$entry"

  if ! url=$(aws lambda get-function-url-config --profile "$profile" \
    --region "$region" --function-name "$function" \
    --query FunctionUrl --output text 2>"$errors"); then
    skip "$city" "$(aws_error)"
    continue
  fi

  if ! token=$(aws ssm get-parameter --profile "$profile" --region "$region" \
    --name "$parameter" --with-decryption \
    --query Parameter.Value --output text 2>"$errors"); then
    skip "$city" "$(aws_error)"
    continue
  fi
  if [[ -z $token || $token == changeit ]]; then
    skip "$city" "token in $parameter is not set"
    continue
  fi

  payload=$(jq -c --arg city "$city" --arg url "$url" --arg token "$token" \
    '.cities[$city] = {url: $url, token: $token}' <<<"$payload")
  echo "Added $city" >&2
done

if [[ $(jq '.cities | length' <<<"$payload") -eq 0 ]]; then
  echo "No municipality was added" >&2
  exit 1
fi

encoded=$(printf '%s' "$payload" | base64 | tr -d '\n=' | tr '+/' '-_')
echo "${tracker_url}#/settings?import=${encoded}"
