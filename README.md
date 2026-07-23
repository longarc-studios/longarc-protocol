# Long Arc Protocol

Open protocol schemas and conformance tools for bounded agent and automation
systems.

Long Arc Protocol gives framework authors, platform engineers, adapter
developers, and reviewers a product-neutral way to exchange plans, scoped
capabilities, effect observations, adapter declarations, and receipts without
confusing evidence with authority or an attempt with completion.

## Status

Long Arc Protocol is a v0 candidate. This repository defines public
interoperability contracts, a deterministic reference verifier, and a bounded
offline CLI for validating one local protocol document.

It is not a runtime, authorization service, judgment system, security boundary,
integration claim, or production-readiness claim.

## Verify locally

Requires Node.js 22.14 or newer. No dependency installation is needed. The
verifier makes no network calls, reads no environment configuration, runs no
subprocesses, sends no telemetry, and writes no files.

```sh
git clone https://github.com/longarc-studios/longarc-protocol.git
cd longarc-protocol
npm test
```

## Validate a protocol object

The candidate CLI requires no install, account, configuration, or network
access:

```sh
node bin/longarc-protocol.mjs list
node bin/longarc-protocol.mjs validate \
  conformance/v0/valid/run-plan.json
node bin/longarc-protocol.mjs validate \
  conformance/v0/valid/run-plan.json --json
```

It reads the selected local file and retains nothing. Its result belongs to the
user running it and contains no creator, project-owner, or user identity. The
result is bounded conformance evidence, not a receipt, authorization, execution
record, judgment, or production claim. Input is limited to a stable regular
UTF-8 file no larger than 1 MiB; diagnostics do not reflect private input
content.

See the [CLI reference](docs/CLI.md) for commands, exit codes, and the exact
failure boundary.

## Protocol objects

- [Receipt envelope](schemas/v0/receipt-envelope.schema.json): Keeps event
  facts, evidence, authority, judgment, signature state, and non-claims
  distinct.
- [Capability grant](schemas/v0/capability-grant.schema.json): Binds one subject
  to one operation, bounded scope, budget, expiry, and single-use posture.
- [Effect observation](schemas/v0/effect-observation.schema.json): Separates
  authorization, attempt, observation, and completion truth without
  normalizing uncertainty.
- [Run plan](schemas/v0/run-plan.schema.json): Describes finite ordered work
  without becoming execution authority.
- [Adapter manifest](schemas/v0/adapter-manifest.schema.json): Declares a
  product-neutral adapter and its bounded capabilities without granting policy
  ownership.

See the [conformance fixtures](conformance/README.md) for accepted and
deliberately rejected examples.

## What the verifier checks

The repository verifier checks:

- the expected tracked repository surface;
- dependency-free package and lock metadata;
- schema identity and fail-closed object shapes;
- positive and negative fixtures for every protocol;
- cross-field protocol invariants;
- absence of symlinks, opaque binaries, local machine paths,
  credential-shaped text, and Git metadata in tracked content.

A pass is bounded conformance evidence for this v0 repository. It does not
prove that an external system executed or that an implementation is secure or
production-ready.

## Repository boundary

This repository contains schemas, conformance fixtures, documentation, a
deterministic reference verifier, and the bounded offline validation CLI.

Private implementations, orchestration, policy, product adapters, credentials,
provider configuration, deployment machinery, and commercial services remain
separate.

Implementations may use these contracts under Apache-2.0. Compatibility does
not imply endorsement, official status, authority, or conformance unless the
stated conformance evidence passes.

Read the [trust model](docs/TRUST_MODEL.md), the
[open and closed boundary](docs/OPEN_CLOSED_BOUNDARY.md), and
[versioning policy](docs/VERSIONING.md).

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change.

Report security concerns privately through GitHub Private Vulnerability
Reporting as described in [SECURITY.md](SECURITY.md). Do not publish sensitive
security details in a pull request or public report.

## License and marks

The code and documentation are licensed under Apache-2.0. The license does not
grant general permission to use Long Arc names, marks, or logos. Truthful
origin and compatibility descriptions must not imply endorsement, affiliation,
or sponsorship.
