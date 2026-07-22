# Trust Model

Long Arc Protocol treats evidence, authority, judgment, and effects as separate
surfaces.

## Principles

1. Evidence supports a claim but cannot grant authority.
2. A schema validates shape and stated invariants; it cannot authorize an
   action.
3. A capability grant is bounded by subject, operation, scope, budget, expiry,
   and single-use posture.
4. Authorization is not an attempt. An attempt is not an observation. An
   observation is not completion.
5. Unknown or unavailable effect truth remains indeterminate and cannot be
   normalized to success or automatic retry.
6. A run plan describes finite work but carries no execution authority.
7. An adapter declares capabilities but owns no global policy.
8. Unknown fields, paths, capabilities, and source provenance fail closed.

## Evidence ceiling

A passing fixture proves only that the fixture conforms to the checked v0
contract under the reference verifier. It does not prove that an external
system executed, that a deployment is secure, or that publication, integration,
release, or production authority exists.

The verifier checks evidence locator and digest shape but does not fetch or
authenticate referenced evidence. Capability-grant validation checks the
declared scope and no-broadening posture; an unsigned JSON object cannot prove
its origin or that its scope never changed. Authenticity and historical
immutability require separately verified signatures, receipts, or comparison
against an authoritative prior object. An adapter manifest declares a surface;
it does not prove that the adapter exists or behaves as declared.

## Signature state

Signature presence and verification state are recorded independently. An
unsigned object is not verified. A present signature may be unchecked, valid,
or failed. Presence alone must never be rendered as verification.

## Failure posture

Malformed objects, extra fields, wildcard scope, unknown capabilities, truth
collapse, and product bindings are rejected. Rejection returns an explicit
diagnostic and does not modify the candidate.
