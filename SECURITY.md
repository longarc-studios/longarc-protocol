# Security

Long Arc Protocol publishes data contracts and a local reference verifier. It
does not provide a hosted service, credential store, authorization runtime, or
production security boundary.

## Reporting

Use this repository's **Report a vulnerability** control to submit a private
security report through GitHub Private Vulnerability Reporting. Keep security
details in that private workflow until the project owner and reporter agree
that disclosure is safe.

If the control is unavailable, do not open a public issue or route the report
through another public channel. The publication and announcement gates must
verify the control before inviting security reports.

This public reporting route is only for Long Arc Protocol. It does not open any
private implementation, internal intake, or private runtime surface to public
submissions.

A useful report identifies:

- the affected protocol or verifier behavior;
- the smallest reproducible input;
- expected and observed behavior;
- impact within this repository's stated scope;
- any information that must remain confidential.

## Supported surface

Security review covers the files present in this repository. Claims about
downstream implementations, integrations, deployments, or products require
their own evidence.

The reference verifier is deterministic and dependency-free. It rejects
unknown paths and fields, does not use the network, does not read environment
configuration, does not spawn subprocesses, and does not write files.

## Disclosure boundary

Do not include secrets or third-party private material in a report. A test pass
is bounded conformance evidence; it is not a guarantee that every
implementation or deployment is secure.
