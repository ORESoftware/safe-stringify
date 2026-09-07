#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)
default_root=$(cd -P "${script_dir}/.." && pwd)
repo_root=${1:-${REPO_ROOT:-$default_root}}

package_file="${repo_root}/package.json"
readme_file="${repo_root}/readme.md"
contract_file="${repo_root}/docs/distribution.md"
workflow_dir="${repo_root}/.github/workflows"

checks=0
failures=0

fail() {
  printf 'error: %s\n' "$*" >&2
  failures=$((failures + 1))
}

require_file() {
  local file=$1
  checks=$((checks + 1))
  [[ -f "$file" ]] || fail "required file is missing: ${file#"${repo_root}/"}"
}

require_literal() {
  local file=$1
  local literal=$2
  local label=$3
  checks=$((checks + 1))
  grep -Fq -- "$literal" "$file" || fail "$label"
}

reject_path() {
  local path=$1
  local label=$2
  checks=$((checks + 1))
  [[ ! -e "$path" ]] || fail "$label"
}

require_file "$package_file"
require_file "$readme_file"
require_file "$contract_file"

if (( failures == 0 )); then
  require_literal "$readme_file" \
    'This package is distributed through npm. It does not publish or support a container image.' \
    'README must state the npm-only distribution boundary'
  require_literal "$contract_file" 'Distribution channel: npm' \
    'distribution contract must identify npm as the supported channel'
  require_literal "$contract_file" 'Container/OCI status: not applicable' \
    'distribution contract must classify container/OCI support as not applicable'
  require_literal "$contract_file" 'DEN-323' \
    'distribution contract must retain its Linear governance anchor'
  require_literal "$contract_file" 'ORESoftware/safe-stringify#2' \
    'distribution contract must retain its GitHub issue anchor'
  require_literal "$contract_file" 'pull requests read-only and publication-free' \
    'future container review gate must keep pull requests publication-free'

  reject_path "${repo_root}/.dockerignore" \
    '.dockerignore must not imply a supported container build context'
  reject_path "${repo_root}/.circleci" \
    'legacy CircleCI container harness must remain retired'
  reject_path "${repo_root}/.travis.yml" \
    'legacy Travis runtime matrix must remain retired'
  reject_path "${repo_root}/scripts/travis" \
    'legacy Travis helper scripts must remain retired'

  while IFS= read -r -d '' path; do
    relative=${path#"${repo_root}/"}
    fail "container build descriptor is prohibited by the npm-only contract: ${relative}"
  done < <(
    find "$repo_root" \
      -type d \( -name .git -o -name node_modules -o -name tmp -o -name temp \) -prune -o \
      -type f \( \
        -name 'Dockerfile' -o -name 'Dockerfile.*' -o \
        -iname 'Containerfile' -o -iname 'Containerfile.*' -o \
        -iname '*.dockerfile' -o -name '*.dkf' -o \
        -iname 'docker-compose.yml' -o -iname 'docker-compose.yaml' -o \
        -iname 'docker-compose.*.yml' -o -iname 'docker-compose.*.yaml' -o \
        -iname 'compose.yml' -o -iname 'compose.yaml' -o \
        -iname 'compose.*.yml' -o -iname 'compose.*.yaml' \
      \) -print0
  )
  checks=$((checks + 1))

  if [[ -d "$workflow_dir" ]]; then
    while IFS= read -r -d '' workflow; do
      relative=${workflow#"${repo_root}/"}
      checks=$((checks + 1))
      if grep -Eiq -- '(docker/(build-push|login|setup-buildx)-action|docker[[:space:]]+(build|push|login)|podman[[:space:]]+(build|push|login)|buildah[[:space:]]+(bud|build|push|login)|ghcr\.io/|\.dkr\.ecr\.|artifactregistry|azurecr\.io|publish[^[:alnum:]]+image|image[^[:alnum:]]+publish)' "$workflow"; then
        fail "image build/publication behavior is prohibited in ${relative}"
      fi

      while IFS= read -r action; do
        checks=$((checks + 1))
        if [[ ! "$action" =~ @[0-9a-f]{40}$ ]]; then
          fail "workflow action is not pinned to a full commit SHA in ${relative}: ${action}"
        fi
      done < <(sed -nE 's/^[[:space:]]*-[[:space:]]*uses:[[:space:]]*([^[:space:]#]+).*$/\1/p' "$workflow")

      while IFS= read -r image; do
        major=${image##*:}
        checks=$((checks + 1))
        if (( major < 22 )); then
          fail "obsolete Node container major is prohibited in ${relative}: ${image}"
        fi
      done < <(grep -Eio -- 'node:[0-9]+' "$workflow" || true)
    done < <(find "$workflow_dir" -type f \( -name '*.yml' -o -name '*.yaml' \) -print0)
  fi

  checks=$((checks + 1))
  if ! node - "$package_file" <<'NODE'
const fs = require('node:fs');
const packageFile = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
const expected = {
  name: '@oresoftware/safe-stringify',
  repository: 'git+https://github.com/ORESoftware/safe-stringify.git',
  bugs: 'https://github.com/ORESoftware/safe-stringify/issues',
  homepage: 'https://github.com/ORESoftware/safe-stringify#readme',
  checkScript: 'bash scripts/check-distribution-contract.sh',
  testScript: 'bash scripts/tests/test-distribution-contract.sh',
};
const errors = [];
if (manifest.name !== expected.name) errors.push('package name');
if (manifest.repository?.url !== expected.repository) errors.push('repository URL');
if (manifest.bugs?.url !== expected.bugs) errors.push('bugs URL');
if (manifest.homepage !== expected.homepage) errors.push('homepage');
if (manifest.scripts?.['check:distribution'] !== expected.checkScript) errors.push('check:distribution script');
if (manifest.scripts?.['test:distribution'] !== expected.testScript) errors.push('test:distribution script');
for (const key of Object.keys(manifest.scripts ?? {})) {
  if (/(docker|container|image)/i.test(key)) errors.push(`prohibited package script: ${key}`);
}
if (errors.length > 0) {
  console.error(`package metadata violates the npm-only contract: ${errors.join(', ')}`);
  process.exit(1);
}
NODE
  then
    fail 'package metadata must identify this repository and expose both distribution checks'
  fi
fi

if (( failures > 0 )); then
  printf 'distribution contract failed: %d failure(s) across %d checks\n' "$failures" "$checks" >&2
  exit 1
fi

printf 'distribution contract ok: %d checks passed\n' "$checks"
