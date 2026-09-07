# Distribution contract

- **Distribution channel: npm**
- **Container/OCI status: not applicable**
- **Tracking:** Linear `DEN-323`; GitHub `ORESoftware/safe-stringify#2`

`@oresoftware/safe-stringify` is a library, not a network service, executable workload, or independently deployable application. Consumers install it from npm and execute it inside their own supported runtime.

The retired `node:10` Docker scaffold installed a global test harness but copied no package source and declared no command or entrypoint. It was neither a runnable product image nor a supported package-validation contract. The repository-local `.r2g/` fixtures remain package test assets; they do not imply container support.

## Fail-closed boundary

The repository intentionally has no Dockerfile, Containerfile, Compose file, architecture-derived `.dkf`, legacy CircleCI/Travis container harness, or image-publication workflow. `scripts/check-distribution-contract.sh` enforces that classification.

A future container may be introduced only with a separate reviewed issue and PR that replaces this document and checker together. That change must define a real workload, use a supported digest-pinned base, run non-root, install deterministically, declare an entrypoint, prove ARM64/x86_64 parity, keep pull requests read-only and publication-free, and retain exact-head build, signature, SBOM, provenance, and vulnerability evidence.
