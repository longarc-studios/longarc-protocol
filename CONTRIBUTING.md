# Contributing

Contributions are welcome when they preserve the protocol boundary and include
reproducible evidence.

## Before submitting

1. Keep the change inside the public schemas, fixtures, verifier, or
   documentation.
2. Do not copy private source, private tests, internal names, product material,
   credentials, provider configuration, or unpublished history.
3. Describe the source and provenance of the contribution.
4. Explain any license compatibility considerations.
5. Run `npm test` and report the result.
6. State whether the change affects conformance, the public/private boundary,
   or compatibility.

Material AI assistance must be disclosed. An accountable human must inspect,
understand, and accept responsibility for every submitted change. A tool or
model cannot be the rights holder, reviewer, or accountable approver.

## Project sign-off

Every contributed commit must include:

```text
Signed-off-by: <legal name> <email address>
```

By signing off, the contributor attests that:

- they created the contribution or have the right to submit it;
- they can submit it under Apache-2.0;
- they understand the contribution and sign-off become public records;
- they disclosed material third-party sources and licenses;
- the contribution contains no private source, credentials, or unapproved
  product material.

This is a project-specific sign-off. It does not claim compatibility with a
third-party contributor certificate. No contributor license agreement is
required for v0.

## Protocol changes

A protocol change must include:

- the schema change;
- at least one valid fixture;
- at least one fixture that demonstrates the rejected boundary;
- verifier coverage for both accepting and rejecting cases;
- a versioning analysis;
- explicit non-claims and migration impact.

Unknown fields remain rejected. Indeterminate effect truth must never become
success. A plan must never become execution authority.

## Public and private implementations

Acceptance here does not admit a contribution into any separate private
implementation. Any such use requires its own review and provenance decision.

## Marks

Contribution does not grant rights to Long Arc names, marks, or logos beyond
reasonable origin description and truthful compatibility language that does
not imply endorsement.
