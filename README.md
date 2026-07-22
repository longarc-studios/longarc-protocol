# Long Arc Protocol

Long Arc Protocol is a small, dependency-free set of interoperability
contracts for bounded agent and automation systems.

The v0 candidate defines five independent protocol objects:

| Protocol | Purpose |
| --- | --- |
| Receipt envelope | Keeps event facts, evidence, authority, judgment, signature state, and non-claims distinct. |
| Capability grant | Binds one subject to one operation, bounded scope, budget, expiry, and single-use posture. |
| Effect observation | Separates authorization, attempt, observation, and completion truth without normalizing uncertainty. |
| Run plan | Describes finite ordered work without becoming execution authority. |
| Adapter manifest | Declares a product-neutral adapter and its bounded capabilities without granting policy ownership. |

## Status

This is a v0 candidate. Its schemas and fixtures are public interoperability
contracts, not a runtime, security boundary, authorization service, judgment
system, integration claim, or production-readiness claim.

## Verify locally

The verifier uses only the Node.js standard library. It performs no network
calls, environment reads, subprocess execution, telemetry, or filesystem
writes.

```sh
npm test
```

The command verifies:

- the exact thirty-path tracked repository surface;
- package and lock metadata;
- schema identity and fail-closed object shapes;
- one positive and one negative fixture for every protocol;
- cross-field protocol invariants;
- absence of symlinks, opaque binaries, local machine paths, credential-shaped
  text, and Git metadata in tracked content.

## Boundary

This repository is intentionally limited to schemas, conformance fixtures,
documentation, and a deterministic reference verifier. Private implementations,
orchestration, policy, product adapters, credentials, provider configuration,
deployment machinery, and commercial services are separate.

Implementations may use these contracts under Apache-2.0. Compatibility does
not imply endorsement, official status, authority, or conformance unless the
stated conformance evidence actually passes.

See [the trust model](docs/TRUST_MODEL.md),
[the open/closed boundary](docs/OPEN_CLOSED_BOUNDARY.md), and
[versioning](docs/VERSIONING.md).

## License and marks

The code and documentation in this repository are licensed under Apache-2.0.
The license does not grant general permission to use Long Arc names, marks, or
logos. Truthful origin and compatibility descriptions must not imply
endorsement, affiliation, or sponsorship.
