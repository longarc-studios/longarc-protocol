# Long Arc Protocol CLI

The v0 CLI is a small, dependency-free way to validate one local JSON document
against the public Long Arc Protocol contracts.

## Run from a clone

No dependency installation is required.

```sh
node bin/longarc-protocol.mjs help
node bin/longarc-protocol.mjs list
node bin/longarc-protocol.mjs validate \
  conformance/v0/valid/receipt-envelope.json
node bin/longarc-protocol.mjs validate \
  conformance/v0/valid/receipt-envelope.json --json
```

The future package command is `longarc-protocol`. Package publication is a
separate boundary and has not occurred.

## Commands

- `help` prints the bounded command surface.
- `list` prints the five supported v0 protocol identifiers.
- `validate <json-file>` validates one local document and prints a human result.
- `validate <json-file> --json` emits the same bounded result as JSON.

No configuration file, account, token, network access, or install step is
needed. v0 intentionally has no plugin, provider, model, adapter, execution,
receipt-writing, signing, telemetry, update, or promotion command.

Input must be a stable regular UTF-8 file no larger than 1 MiB. Files that are
too large, malformed, unreadable, non-regular, or changed during the read are
rejected without exposing their path or contents.

## Exit codes

- `0`: valid input or a successful informational command.
- `1`: well-formed JSON that does not conform.
- `2`: invalid command shape, unreadable input, or malformed JSON.

## Output ownership and claim boundary

Input remains on the user's machine. The CLI reads the selected file, returns
the validation result to that user, and retains nothing.

The JSON result is deterministic conformance evidence, not a receipt,
authorization, judgment, signature, execution record, or production claim. It
contains only a fixed public protocol identifier, a bounded claim ceiling, and
public-validator diagnostics. It contains no creator identity, project-owner
identity, user identity, timestamp, local path, arbitrary field name, or field
value. A later receipt workflow must use the user's own authority, evidence,
storage, and signing context; it must not inherit a Long Arc project receipt or
identity.

## Failure posture

Unknown commands, extra arguments, unsupported protocol identifiers, unknown
object fields, malformed JSON, and unreadable input fail closed. Diagnostics
are bounded and do not echo unknown field names, unsupported discriminator
values, the selected path, file contents, or underlying exception message.
