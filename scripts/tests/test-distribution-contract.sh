#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_root=$(cd -P "${script_dir}/../.." && pwd)
guard="${repo_root}/scripts/check-distribution-contract.sh"

tmp_root=$(mktemp -d)
trap 'rm -rf "$tmp_root"' EXIT

passed=0
failed=0

new_fixture() {
  local name=$1
  local root="${tmp_root}/${name}"
  mkdir -p "$root/scripts/tests" "$root/docs" "$root/.github/workflows"
  cp "$repo_root/package.json" "$root/package.json"
  cp "$repo_root/readme.md" "$root/readme.md"
  cp "$repo_root/docs/distribution.md" "$root/docs/distribution.md"
  cp "$guard" "$root/scripts/check-distribution-contract.sh"
  cp "$repo_root/.github/workflows/distribution-contract.yml" "$root/.github/workflows/distribution-contract.yml"
  printf '%s\n' "$root"
}

replace_once() {
  local file=$1
  local old=$2
  local new=$3
  local content
  content=$(<"$file")
  if [[ "$content" != *"$old"* ]]; then
    printf 'test setup error: literal not found in %s: %s\n' "$file" "$old" >&2
    exit 2
  fi
  content=${content/"$old"/"$new"}
  printf '%s\n' "$content" > "$file"
}

expect_pass() {
  local name=$1
  local root=$2
  if bash "$guard" "$root" >/dev/null 2>&1; then
    passed=$((passed + 1))
  else
    printf 'not ok - %s (expected pass)\n' "$name" >&2
    failed=$((failed + 1))
  fi
}

expect_fail() {
  local name=$1
  local root=$2
  if bash "$guard" "$root" >/dev/null 2>&1; then
    printf 'not ok - %s (expected failure)\n' "$name" >&2
    failed=$((failed + 1))
  else
    passed=$((passed + 1))
  fi
}

fixture=$(new_fixture baseline)
expect_pass 'approved npm-only distribution contract' "$fixture"

fixture=$(new_fixture dockerfile)
printf 'FROM node:10\n' > "$fixture/Dockerfile"
expect_fail 'root Dockerfile is rejected' "$fixture"

fixture=$(new_fixture generated-dkf)
printf 'FROM node:22\n' > "$fixture/Dockerfile.arm64.dkf"
expect_fail 'generated architecture Dockerfile is rejected' "$fixture"

fixture=$(new_fixture compose)
printf 'services: {}\n' > "$fixture/docker-compose.yml"
expect_fail 'Compose descriptor is rejected' "$fixture"

fixture=$(new_fixture circleci)
mkdir -p "$fixture/.circleci"
printf 'version: 2.1\n' > "$fixture/.circleci/config.yml"
expect_fail 'legacy CircleCI directory is rejected' "$fixture"

fixture=$(new_fixture travis)
printf 'language: node_js\n' > "$fixture/.travis.yml"
expect_fail 'legacy Travis configuration is rejected' "$fixture"

fixture=$(new_fixture image-publish)
cat > "$fixture/.github/workflows/publish-image.yml" <<'MUTATION'
name: publish image
on: workflow_dispatch
jobs:
  publish:
    runs-on: ubuntu-24.04
    steps:
      - run: docker push ghcr.io/example/image:tag
MUTATION
expect_fail 'image publication workflow is rejected' "$fixture"

fixture=$(new_fixture mutable-action)
replace_once "$fixture/.github/workflows/distribution-contract.yml" \
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1' \
  'actions/checkout@v7'
expect_fail 'mutable workflow action is rejected' "$fixture"

fixture=$(new_fixture old-node-image)
cat > "$fixture/.github/workflows/old-node.yml" <<'MUTATION'
name: old node
on: workflow_dispatch
jobs:
  test:
    runs-on: ubuntu-24.04
    container: node:10
    steps:
      - run: node --version
MUTATION
expect_fail 'obsolete Node container is rejected' "$fixture"

fixture=$(new_fixture missing-classification)
replace_once "$fixture/docs/distribution.md" \
  'Container/OCI status: not applicable' \
  'Container status: unspecified'
expect_fail 'missing not-applicable classification is rejected' "$fixture"

fixture=$(new_fixture wrong-repository)
replace_once "$fixture/package.json" \
  'git+https://github.com/ORESoftware/safe-stringify.git' \
  'git+https://github.com/ORESoftware/typescript-library-skeleton.git'
expect_fail 'stale repository metadata is rejected' "$fixture"

fixture=$(new_fixture docker-script)
replace_once "$fixture/package.json" \
  '"test:distribution": "bash scripts/tests/test-distribution-contract.sh",' \
  '"test:distribution": "bash scripts/tests/test-distribution-contract.sh",\n    "docker:publish": "docker push example.invalid/safe-stringify:latest",'
expect_fail 'container package script is rejected' "$fixture"

if (( failed > 0 )); then
  printf 'distribution contract regressions failed: %d failed, %d passed\n' "$failed" "$passed" >&2
  exit 1
fi

printf 'distribution contract regressions ok: %d tests passed\n' "$passed"
