# Versioning

Protocol identities carry an explicit major version, such as
`longarc.protocol.receipt-envelope.v0`.

## v0 posture

v0 is a candidate interoperability surface. Compatibility may change while the
candidate is reviewed. Every change must update fixtures and the reference
verifier in the same review.

## Change classes

- Clarification: documentation changes without contract or verifier change.
- Compatible addition: not available inside v0 objects because unknown fields
  are rejected; use a separately versioned object or a new protocol version.
- Breaking change: any required-field, meaning, enum, invariant, or rejection
  behavior change. Create a new protocol identity.
- Security correction: narrow or reject unsafe behavior immediately, document
  the affected versions, and preserve the prior evidence record.

## Canonical time

All v0 date-time fields use whole-second UTC text in the form
`YYYY-MM-DDTHH:mm:ssZ`. Numeric offsets and fractional seconds are rejected so
schemas, fixtures, and reference verification share one acceptance rule.
Conformance validators must assert both the `date-time` format for calendar
validity and the pattern for canonical serialization. Impossible calendar
dates and leap-second text are rejected in v0.

## Stability rule

Once a protocol version is released, its accepted and rejected object sets are
immutable. Corrections that alter those sets require a new version.

Package versions describe repository releases. They do not replace the
protocol identity and do not grant publication, integration, or execution
authority.
