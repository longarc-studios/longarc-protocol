// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  HELP_TEXT,
  MAX_INPUT_BYTES,
  readBoundedText,
  runCli,
} from '../bin/longarc-protocol.mjs';
import {
  MAX_VALIDATION_ERRORS,
  SUPPORTED_PROTOCOL_IDS,
  validateV0Document,
} from '../src/validate-v0.mjs';

const root = new URL('../', import.meta.url);
const cliPath = fileURLToPath(new URL('bin/longarc-protocol.mjs', root));
const validFixturePath = fileURLToPath(
  new URL('conformance/v0/valid/run-plan.json', root),
);
const invalidFixturePath = fileURLToPath(
  new URL('conformance/v0/invalid/run-plan-unknown-capability.json', root),
);

function memoryStream() {
  let value = '';
  return {
    stream: {
      write(chunk) {
        value += String(chunk);
      },
    },
    read() {
      return value;
    },
  };
}

test('help exposes a deliberately narrow offline surface', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  assert.equal(
    await runCli(['help'], {
      stdout: stdout.stream,
      stderr: stderr.stream,
    }),
    0,
  );
  assert.equal(stderr.read(), '');
  assert.equal(stdout.read(), HELP_TEXT + '\n');
  assert.match(HELP_TEXT, /does not execute plans, grant authority, write receipts/);
});

test('list returns exactly the five public protocol identifiers', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  assert.equal(
    await runCli(['list'], {
      stdout: stdout.stream,
      stderr: stderr.stream,
    }),
    0,
  );
  assert.equal(stderr.read(), '');
  assert.deepEqual(
    stdout.read().trim().split('\n'),
    [...SUPPORTED_PROTOCOL_IDS],
  );
});

test('validate accepts a conforming document with bounded JSON output', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  assert.equal(
    await runCli(['validate', 'fixture.json', '--json'], {
      stdout: stdout.stream,
      stderr: stderr.stream,
      readText: () => readFile(validFixturePath, 'utf8'),
    }),
    0,
  );
  assert.equal(stderr.read(), '');
  assert.deepEqual(JSON.parse(stdout.read()), {
    protocol: 'longarc.protocol.run-plan.v0',
    valid: true,
    claimCeiling: 'local_conformance_only',
    errors: [],
  });
});

test('the default reader accepts a stable bounded UTF-8 fixture', async () => {
  const text = await readBoundedText(validFixturePath);
  assert.equal(JSON.parse(text).protocol, 'longarc.protocol.run-plan.v0');
  assert.equal(MAX_INPUT_BYTES, 1048576);
});

test('the bounded reader rejects oversized input and still closes the handle', async () => {
  let closed = false;
  let readCalled = false;
  const fakeHandle = {
    async stat() {
      return {
        isFile: () => true,
        size: MAX_INPUT_BYTES + 1,
        mtimeMs: 1,
      };
    },
    async read() {
      readCalled = true;
      return { bytesRead: 0 };
    },
    async close() {
      closed = true;
    },
  };
  await assert.rejects(
    readBoundedText('fixture.json', async () => fakeHandle),
    /unsupported input/,
  );
  assert.equal(readCalled, false);
  assert.equal(closed, true);
});

test('validate rejects the boundary-specific invalid fixture', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  assert.equal(
    await runCli(['validate', 'fixture.json'], {
      stdout: stdout.stream,
      stderr: stderr.stream,
      readText: () => readFile(invalidFixturePath, 'utf8'),
    }),
    1,
  );
  assert.equal(stdout.read(), '');
  assert.match(stderr.read(), /undeclared capability/);
});

test('arbitrary malformed objects fail closed without throwing', async () => {
  for (const value of [
    null,
    {},
    { protocol: 'longarc.protocol.adapter-manifest.v0' },
    { protocol: 'unknown.protocol.v0' },
    { protocol: 'longarc.protocol.run-plan.v0', steps: [null] },
  ]) {
    const result = await validateV0Document(value);
    assert.equal(result.valid, false);
    assert.equal(result.claimCeiling, 'no_conformance_claim');
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.errors), true);
  }
});

test('validation output is bounded and does not echo unknown input fields', async () => {
  const unknownField = '/' + ['Users', 'example', 'private-field'].join('/');
  const fixture = JSON.parse(await readFile(validFixturePath, 'utf8'));
  fixture[unknownField] = 'not rendered';
  fixture.steps = Array.from({ length: 128 }, () => null);
  const result = await validateV0Document(fixture);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, MAX_VALIDATION_ERRORS + 1);
  assert.match(result.errors.at(-1), /error limit reached/);
  assert.doesNotMatch(JSON.stringify(result), /private-field/u);
});

test('unsupported protocol values are not reflected into output', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const unsupported = '/' + ['private', 'tmp', 'internal-protocol'].join('/');
  assert.equal(
    await runCli(['validate', 'fixture.json', '--json'], {
      stdout: stdout.stream,
      stderr: stderr.stream,
      readText: () => JSON.stringify({ protocol: unsupported }),
    }),
    1,
  );
  assert.equal(stderr.read(), '');
  const rendered = stdout.read();
  assert.doesNotMatch(rendered, /internal-protocol/u);
  assert.deepEqual(JSON.parse(rendered), {
    protocol: null,
    valid: false,
    claimCeiling: 'no_conformance_claim',
    errors: ['$.protocol: unsupported protocol'],
  });
});

test('input failures do not echo paths, content, or exception details', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const syntheticPath = '/' + ['Users', 'example', 'secret.json'].join('/');
  assert.equal(
    await runCli(['validate', 'fixture.json'], {
      stdout: stdout.stream,
      stderr: stderr.stream,
      readText: () => {
        throw new Error('failed at ' + syntheticPath);
      },
    }),
    2,
  );
  const rendered = stdout.read() + stderr.read();
  assert.doesNotMatch(rendered, /secret\.json/u);
  assert.equal(rendered.includes(['Us', 'ers'].join('')), false);
  assert.match(rendered, /unreadable or malformed JSON/);
});

test('validator failures fail closed without exposing internal paths', async () => {
  const stdout = memoryStream();
  const stderr = memoryStream();
  const syntheticPath = '/' + ['private', 'tmp', 'schema.json'].join('/');
  assert.equal(
    await runCli(['validate', 'fixture.json', '--json'], {
      stdout: stdout.stream,
      stderr: stderr.stream,
      readText: () => '{"protocol":"longarc.protocol.run-plan.v0"}',
      validateDocument: () => {
        throw new Error('schema failure at ' + syntheticPath);
      },
    }),
    2,
  );
  assert.equal(stderr.read(), '');
  const result = JSON.parse(stdout.read());
  assert.deepEqual(result, {
    protocol: null,
    valid: false,
    claimCeiling: 'no_conformance_claim',
    errors: ['validator: unavailable'],
  });
});

test('unknown and over-broad command shapes fail closed', async () => {
  for (const argv of [
    ['run'],
    ['validate'],
    ['validate', '--json'],
    ['validate', 'one.json', '--json', '--verbose'],
    ['list', '--json'],
  ]) {
    const stdout = memoryStream();
    const stderr = memoryStream();
    assert.equal(
      await runCli(argv, {
        stdout: stdout.stream,
        stderr: stderr.stream,
      }),
      2,
    );
    assert.equal(stdout.read(), '');
    assert.notEqual(stderr.read(), '');
  }
});

test('direct execution preserves valid, invalid, and usage exit classes', () => {
  const valid = spawnSync(
    process.execPath,
    [cliPath, 'validate', validFixturePath, '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).valid, true);

  const invalid = spawnSync(
    process.execPath,
    [cliPath, 'validate', invalidFixturePath, '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.equal(JSON.parse(invalid.stdout).valid, false);

  const usage = spawnSync(
    process.execPath,
    [cliPath, 'validate'],
    { encoding: 'utf8' },
  );
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /Usage error/);
});
