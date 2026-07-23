# Open and Closed Boundary

Long Arc Protocol uses a narrow open-interface model.

## Open in this repository

- five versioned JSON Schemas;
- positive and negative conformance fixtures;
- a dependency-free reference verifier;
- a dependency-free offline CLI that validates one local protocol document;
- protocol, trust, contribution, security, and versioning documentation;
- Apache-2.0 license and attribution.

These materials let independent implementations exchange bounded objects and
test the same fail-closed rules.

## Outside this repository

- private implementation source and tests;
- orchestration, routing, evaluation, and judgment policy;
- runtime safety controls and privileged execution;
- receipt creation, authority issuance, signing, and identity custody;
- product-specific adapters, interfaces, and user data;
- secrets, credentials, provider configuration, and deployment state;
- commercial services, support systems, and operational telemetry;
- private history, receipts, and internal governance records.

Outside does not mean ungoverned or permanently closed. It means this protocol
repository neither contains nor grants authority over those surfaces.

## Direction of dependency

Public or private implementations may depend on these published contracts.
The protocol must not depend on private implementation details. Public
contributions do not automatically enter a separate private implementation.

Compatibility is a technical claim supported by conformance evidence.
Official status, endorsement, publication authority, integration, release, and
production readiness are separate claims.
