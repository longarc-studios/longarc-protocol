# Conformance fixtures

Each v0 protocol has one valid fixture and one deliberately invalid fixture.

Valid fixtures demonstrate the smallest useful positive path. Invalid fixtures
target a load-bearing boundary:

- adapter product binding;
- capability scope broadening through a wildcard;
- effect-truth collapse from unknown to success;
- an unknown receipt field;
- a run-plan step using an undeclared capability.

Run `npm test` from the repository root. A valid fixture must be accepted, and
its paired invalid fixture must be rejected for the intended reason.

Conformance is bounded to these schemas and semantic checks. It is not
execution, integration, security, publication, release, or production proof.
