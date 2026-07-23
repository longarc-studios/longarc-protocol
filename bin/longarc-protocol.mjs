#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { open } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  SUPPORTED_PROTOCOL_IDS,
  validateV0Document,
} from '../src/validate-v0.mjs';

export const HELP_TEXT = [
  'Long Arc Protocol CLI — offline v0 conformance candidate',
  '',
  'Usage:',
  '  longarc-protocol help',
  '  longarc-protocol list',
  '  longarc-protocol validate <json-file> [--json]',
  '',
  'Commands:',
  '  help      Show this help text.',
  '  list      List supported v0 protocol identifiers.',
  '  validate  Validate one local JSON document without changing it.',
  '',
  'Exit codes:',
  '  0  Valid input or successful informational command.',
  '  1  Well-formed JSON that does not conform.',
  '  2  Usage error, unreadable input, or malformed JSON.',
  '',
  'The CLI does not execute plans, grant authority, write receipts, retain input,',
  'read environment configuration, access the network, or modify files.',
].join('\n');

export const MAX_INPUT_BYTES = 1024 * 1024;

function writeLine(stream, value) {
  stream.write(String(value) + '\n');
}

export async function readBoundedText(inputPath, openFile = open) {
  const handle = await openFile(inputPath, 'r');
  try {
    const before = await handle.stat();
    if (!before.isFile()
      || !Number.isSafeInteger(before.size)
      || before.size < 0
      || before.size > MAX_INPUT_BYTES) {
      throw new Error('unsupported input');
    }

    const bytes = Buffer.alloc(MAX_INPUT_BYTES + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset > MAX_INPUT_BYTES) throw new Error('input too large');

    const after = await handle.stat();
    if (!after.isFile()
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
      || offset !== after.size) {
      throw new Error('input changed while reading');
    }

    return new TextDecoder('utf-8', { fatal: true }).decode(
      bytes.subarray(0, offset),
    );
  } finally {
    await handle.close();
  }
}

function failedResult(error) {
  return Object.freeze({
    protocol: null,
    valid: false,
    claimCeiling: 'no_conformance_claim',
    errors: Object.freeze([error]),
  });
}

function renderHuman(result, { stdout, stderr }) {
  if (result.valid) {
    writeLine(
      stdout,
      'PASS: ' + result.protocol + ' conforms (local conformance only).',
    );
    return;
  }

  writeLine(stderr, 'FAIL: no conformance claim.');
  for (const error of result.errors) {
    writeLine(stderr, '- ' + error);
  }
}

export async function runCli(
  argv,
  {
    stdout = process.stdout,
    stderr = process.stderr,
    readText = readBoundedText,
    validateDocument = validateV0Document,
  } = {},
) {
  const [command = 'help', ...rest] = argv;

  if (command === 'help' || command === '--help' || command === '-h') {
    if (rest.length !== 0) {
      writeLine(stderr, 'Usage error: help accepts no arguments.');
      return 2;
    }
    writeLine(stdout, HELP_TEXT);
    return 0;
  }

  if (command === 'list') {
    if (rest.length !== 0) {
      writeLine(stderr, 'Usage error: list accepts no arguments.');
      return 2;
    }
    SUPPORTED_PROTOCOL_IDS.forEach((id) => writeLine(stdout, id));
    return 0;
  }

  if (command !== 'validate') {
    writeLine(stderr, 'Unknown command. Run longarc-protocol help.');
    return 2;
  }

  const jsonOutput = rest.length === 2 && rest[1] === '--json';
  if (!((rest.length === 1) || jsonOutput) || rest[0].startsWith('-')) {
    writeLine(
      stderr,
      'Usage error: longarc-protocol validate <json-file> [--json]',
    );
    return 2;
  }

  let value;
  try {
    value = JSON.parse(await readText(rest[0]));
  } catch {
    const failed = failedResult('input: unreadable or malformed JSON');
    if (jsonOutput) {
      writeLine(stdout, JSON.stringify(failed));
    } else {
      renderHuman(failed, { stdout, stderr });
    }
    return 2;
  }

  let validation;
  try {
    validation = await validateDocument(value);
  } catch {
    const failed = failedResult('validator: unavailable');
    if (jsonOutput) {
      writeLine(stdout, JSON.stringify(failed));
    } else {
      renderHuman(failed, { stdout, stderr });
    }
    return 2;
  }
  if (jsonOutput) {
    writeLine(stdout, JSON.stringify(validation));
  } else {
    renderHuman(validation, { stdout, stderr });
  }
  return validation.valid ? 0 : 1;
}

const isDirectEntry = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectEntry) {
  process.exitCode = await runCli(process.argv.slice(2));
}
