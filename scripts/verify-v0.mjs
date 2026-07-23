// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateV0Document } from '../src/validate-v0.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedLicenseSha256 = 'c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4';
const expectedCiWorkflowSha256 = 'acaedd64ae79d671550d5fcf08a2618ea96ca42f658dc0cc0357686959cdef31';
const expectedPaths = Object.freeze([
  '.gitattributes',
  '.github/workflows/offline-conformance.yml',
  '.gitignore',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'NOTICE',
  'README.md',
  'SECURITY.md',
  'bin/longarc-protocol.mjs',
  'conformance/README.md',
  'conformance/v0/invalid/adapter-manifest-product-binding.json',
  'conformance/v0/invalid/capability-grant-scope-broadening.json',
  'conformance/v0/invalid/effect-observation-truth-collapse.json',
  'conformance/v0/invalid/receipt-envelope-unknown-field.json',
  'conformance/v0/invalid/run-plan-unknown-capability.json',
  'conformance/v0/valid/adapter-manifest.json',
  'conformance/v0/valid/capability-grant.json',
  'conformance/v0/valid/effect-observation.json',
  'conformance/v0/valid/receipt-envelope.json',
  'conformance/v0/valid/run-plan.json',
  'docs/CLI.md',
  'docs/OPEN_CLOSED_BOUNDARY.md',
  'docs/TRUST_MODEL.md',
  'docs/VERSIONING.md',
  'package-lock.json',
  'package.json',
  'schemas/v0/adapter-manifest.schema.json',
  'schemas/v0/capability-grant.schema.json',
  'schemas/v0/effect-observation.schema.json',
  'schemas/v0/receipt-envelope.schema.json',
  'schemas/v0/run-plan.schema.json',
  'scripts/verify-v0.mjs',
  'src/validate-v0.mjs',
  'test/cli.test.mjs',
]);
const expectedPackage = Object.freeze({
  name: 'longarc-protocol',
  version: '0.0.0-v0',
  private: true,
  type: 'module',
  license: 'Apache-2.0',
  bin: {
    'longarc-protocol': 'bin/longarc-protocol.mjs',
  },
  engines: {
    node: '>=22.14.0',
  },
  scripts: {
    test: 'node scripts/verify-v0.mjs && node --test test/*.test.mjs',
    verify: 'npm test',
    cli: 'node bin/longarc-protocol.mjs',
  },
  dependencies: {},
  devDependencies: {},
});
const protocolSpecs = Object.freeze([
  {
    id: 'longarc.protocol.adapter-manifest.v0',
    schemaPath: 'schemas/v0/adapter-manifest.schema.json',
    schemaUrn: 'urn:longarc:protocol:adapter-manifest:v0',
    validPath: 'conformance/v0/valid/adapter-manifest.json',
    invalidPath: 'conformance/v0/invalid/adapter-manifest-product-binding.json',
    invalidSignal: 'productBinding',
  },
  {
    id: 'longarc.protocol.capability-grant.v0',
    schemaPath: 'schemas/v0/capability-grant.schema.json',
    schemaUrn: 'urn:longarc:protocol:capability-grant:v0',
    validPath: 'conformance/v0/valid/capability-grant.json',
    invalidPath: 'conformance/v0/invalid/capability-grant-scope-broadening.json',
    invalidSignal: 'pattern',
  },
  {
    id: 'longarc.protocol.effect-observation.v0',
    schemaPath: 'schemas/v0/effect-observation.schema.json',
    schemaUrn: 'urn:longarc:protocol:effect-observation:v0',
    validPath: 'conformance/v0/valid/effect-observation.json',
    invalidPath: 'conformance/v0/invalid/effect-observation-truth-collapse.json',
    invalidSignal: 'oneOf',
  },
  {
    id: 'longarc.protocol.receipt-envelope.v0',
    schemaPath: 'schemas/v0/receipt-envelope.schema.json',
    schemaUrn: 'urn:longarc:protocol:receipt-envelope:v0',
    validPath: 'conformance/v0/valid/receipt-envelope.json',
    invalidPath: 'conformance/v0/invalid/receipt-envelope-unknown-field.json',
    invalidSignal: 'promoted',
  },
  {
    id: 'longarc.protocol.run-plan.v0',
    schemaPath: 'schemas/v0/run-plan.schema.json',
    schemaUrn: 'urn:longarc:protocol:run-plan:v0',
    validPath: 'conformance/v0/valid/run-plan.json',
    invalidPath: 'conformance/v0/invalid/run-plan-unknown-capability.json',
    invalidSignal: 'undeclared capability',
  },
]);
const supportedSchemaKeywords = new Set([
  '$id',
  '$schema',
  'additionalProperties',
  'allOf',
  'const',
  'description',
  'enum',
  'format',
  'items',
  'maximum',
  'maxItems',
  'maxLength',
  'minimum',
  'minItems',
  'minLength',
  'oneOf',
  'pattern',
  'properties',
  'required',
  'title',
  'type',
  'uniqueItems',
  'x-longarc-protocol',
]);
const credentialPatterns = Object.freeze([
  /AKIA[0-9A-Z]{16}/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\b(?:sk|rk)-[A-Za-z0-9_-]{20,}\b/u,
  /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["']?[A-Za-z0-9_+/=-]{20,}/iu,
]);
const localIdentityPatterns = Object.freeze([
  /(?:^|[\s"'=(])\/Users\/[^/\s]+(?:\/|$)/u,
  /(?:^|[\s"'=(])\/home\/[^/\s]+(?:\/|$)/u,
  /(?:^|[\s"'=(])[A-Za-z]:\\Users\\[^\\\s]+(?:\\|$)/u,
  /file:\/\/(?:\/|[A-Za-z]:)/iu,
  /\/private\/(?:tmp|var\/folders)\//u,
]);

function sorted(values) {
  return [...values].sort();
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype
      || Object.getPrototypeOf(value) === null);
}

function sameValue(left, right) {
  if (left === right) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => sameValue(item, right[index]));
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false;
    const leftKeys = sorted(Object.keys(left));
    const rightKeys = sorted(Object.keys(right));
    return sameValue(leftKeys, rightKeys)
      && leftKeys.every((key) => sameValue(left[key], right[key]));
  }

  return false;
}

function isCanonicalDateTime(value) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/u.test(value)) {
    return false;
  }
  const instant = new Date(value);
  return !Number.isNaN(instant.getTime())
    && instant.toISOString() === value.slice(0, -1) + '.000Z';
}

function typeMatches(type, value) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isPlainObject(value);
  if (type === 'integer') return Number.isSafeInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function validateSchema(schema, value, at = '$') {
  const errors = [];
  const add = (message) => errors.push(at + ': ' + message);

  if (!isPlainObject(schema)) {
    add('schema node is not an object');
    return errors;
  }

  if (Array.isArray(schema.allOf)) {
    for (const part of schema.allOf) {
      errors.push(...validateSchema(part, value, at));
    }
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf
      .map((part) => validateSchema(part, value, at))
      .filter((partErrors) => partErrors.length === 0)
      .length;
    if (matches !== 1) add('oneOf matched ' + matches + ' branches');
  }

  if (Object.hasOwn(schema, 'const') && !sameValue(value, schema.const)) {
    add('value does not match const');
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameValue(item, value))) {
    add('value is outside enum');
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(type, value))) {
      add('type mismatch');
      return errors;
    }
  }

  if (typeof value === 'string') {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) {
      add('string shorter than minLength');
    }
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) {
      add('string longer than maxLength');
    }
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value)) {
      add('string failed pattern');
    }
    if (schema.format === 'date-time') {
      if (!isCanonicalDateTime(value)) add('invalid date-time');
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      add('number below minimum');
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      add('number above maximum');
    }
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems) && value.length < schema.minItems) {
      add('array shorter than minItems');
    }
    if (Number.isInteger(schema.maxItems) && value.length > schema.maxItems) {
      add('array longer than maxItems');
    }
    if (schema.uniqueItems === true) {
      const hasDuplicate = value.some((item, index) => (
        value.slice(0, index).some((prior) => sameValue(prior, item))
      ));
      if (hasDuplicate) add('array items are not unique');
    }
    if (isPlainObject(schema.items)) {
      value.forEach((item, index) => {
        errors.push(...validateSchema(schema.items, item, at + '[' + index + ']'));
      });
    }
  }

  if (isPlainObject(value)) {
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.hasOwn(value, key)) errors.push(at + '.' + key + ': required property missing');
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        errors.push(...validateSchema(properties[key], child, at + '.' + key));
      } else if (schema.additionalProperties === false) {
        errors.push(at + '.' + key + ': additional property rejected');
      } else if (isPlainObject(schema.additionalProperties)) {
        errors.push(...validateSchema(schema.additionalProperties, child, at + '.' + key));
      }
    }
  }

  return errors;
}

function semanticErrors(protocolId, value) {
  const errors = [];
  if (protocolId === 'longarc.protocol.capability-grant.v0') {
    if (Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)) {
      errors.push('$.expiresAt: expiry must be later than issue time');
    }
  }
  if (protocolId === 'longarc.protocol.adapter-manifest.v0') {
    const capabilityIds = value.capabilities.map((item) => item.capability);
    if (new Set(capabilityIds).size !== capabilityIds.length) {
      errors.push('$.capabilities: capability identities must be unique');
    }
  }
  if (protocolId === 'longarc.protocol.receipt-envelope.v0') {
    if (Date.parse(value.recordedAt) < Date.parse(value.event.occurredAt)) {
      errors.push('$.recordedAt: receipt predates its event');
    }
  }
  if (protocolId === 'longarc.protocol.run-plan.v0') {
    const stepIds = value.steps.map((step) => step.stepId);
    if (new Set(stepIds).size !== stepIds.length) {
      errors.push('$.steps: step identities must be unique');
    }
    value.steps.forEach((step, index) => {
      if (step.order !== index) errors.push('$.steps[' + index + ']: order is not contiguous');
      if (!value.allowedCapabilities.includes(step.capability)) {
        errors.push('$.steps[' + index + ']: undeclared capability');
      }
    });
    if (value.effectBudget.maximumAttempts < value.steps.length) {
      errors.push('$.effectBudget.maximumAttempts: budget cannot cover the finite plan');
    }
    if (value.effectBudget.externalEffects > value.effectBudget.maximumAttempts) {
      errors.push('$.effectBudget.externalEffects: exceeds attempt budget');
    }
  }
  return errors;
}

function validateProtocol(schema, protocolId, value) {
  return [
    ...validateSchema(schema, value),
    ...(isPlainObject(value) ? semanticErrors(protocolId, value) : []),
  ];
}

function schemaKeywordErrors(schema, at = '$schema') {
  const errors = [];
  if (!isPlainObject(schema)) return [at + ': schema node is not an object'];
  for (const key of Object.keys(schema)) {
    if (!supportedSchemaKeywords.has(key)) errors.push(at + ': unsupported keyword ' + key);
  }
  if (isPlainObject(schema.properties)) {
    for (const [key, child] of Object.entries(schema.properties)) {
      errors.push(...schemaKeywordErrors(child, at + '.properties.' + key));
    }
  }
  if (isPlainObject(schema.items)) {
    errors.push(...schemaKeywordErrors(schema.items, at + '.items'));
  }
  if (isPlainObject(schema.additionalProperties)) {
    errors.push(...schemaKeywordErrors(schema.additionalProperties, at + '.additionalProperties'));
  }
  for (const keyword of ['allOf', 'oneOf']) {
    if (Array.isArray(schema[keyword])) {
      schema[keyword].forEach((child, index) => {
        errors.push(...schemaKeywordErrors(child, at + '.' + keyword + '[' + index + ']'));
      });
    }
  }
  return errors;
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

function isRootGitAdministrativeEntry(relative, entryName) {
  return relative === '' && entryName === '.git';
}

async function walk(relative = '') {
  const absolute = path.join(root, relative);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = relative === '' ? entry.name : relative + '/' + entry.name;
    const stats = await lstat(path.join(root, child));
    assert.equal(stats.isSymbolicLink(), false, child + ': symlink rejected');
    if (isRootGitAdministrativeEntry(relative, entry.name)) {
      assert.equal(
        stats.isDirectory() || stats.isFile(),
        true,
        '.git: unsupported administrative filesystem object',
      );
      continue;
    }
    assert.equal(entry.name === '.git', false, child + ': nested Git metadata rejected');
    if (stats.isDirectory()) {
      files.push(...await walk(child));
    } else {
      assert.equal(stats.isFile(), true, child + ': unsupported filesystem object');
      files.push(child);
    }
  }
  return files;
}

function containsCredential(text) {
  return credentialPatterns.some((pattern) => pattern.test(text));
}

function containsLocalIdentity(text) {
  return localIdentityPatterns.some((pattern) => pattern.test(text));
}

assert.equal(isRootGitAdministrativeEntry('', '.git'), true);
assert.equal(isRootGitAdministrativeEntry('nested', '.git'), false);
assert.equal(isRootGitAdministrativeEntry('', '.github'), false);

const files = sorted(await walk());
assert.deepEqual(files, sorted(expectedPaths), 'tracked repository surface differs from exact thirty-five-path allowlist');
assert.equal(files.length, 35, 'repository must contain exactly thirty-five files');

const decoder = new TextDecoder('utf-8', { fatal: true });
for (const relativePath of files) {
  const bytes = await readFile(path.join(root, relativePath));
  assert.equal(bytes.includes(0), false, relativePath + ': NUL byte or opaque binary rejected');
  const text = decoder.decode(bytes);
  assert.equal(containsCredential(text), false, relativePath + ': credential-shaped text rejected');
  assert.equal(containsLocalIdentity(text), false, relativePath + ': local identity or machine path rejected');
  assert.equal(text.endsWith('\n'), true, relativePath + ': final newline required');
  assert.equal(text.endsWith('\n\n'), false, relativePath + ': multiple terminal newlines rejected');
}

const ciWorkflowBytes = await readFile(path.join(root, '.github/workflows/offline-conformance.yml'));
const ciWorkflowText = decoder.decode(ciWorkflowBytes);
assert.equal(
  sha256(ciWorkflowBytes),
  expectedCiWorkflowSha256,
  'CI workflow differs from the exact admitted policy',
);
for (const requiredWorkflowFragment of [
  'pull_request:',
  'permissions:\n  contents: read',
  'runs-on: ubuntu-24.04',
  'timeout-minutes: 5',
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  'persist-credentials: false',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
  "node-version: '22.14.0'",
  'check-latest: false',
  'package-manager-cache: false',
  "token: ''",
  'run: npm test',
]) {
  assert.equal(
    ciWorkflowText.includes(requiredWorkflowFragment),
    true,
    'CI workflow missing admitted fragment: ' + requiredWorkflowFragment,
  );
}
for (const forbiddenWorkflowFragment of [
  'pull_request_target:',
  'workflow_run:',
  'self-hosted',
  'contents: write',
  '${{ secrets.',
  'npm install',
  'npm ci',
]) {
  assert.equal(
    ciWorkflowText.includes(forbiddenWorkflowFragment),
    false,
    'CI workflow contains forbidden fragment: ' + forbiddenWorkflowFragment,
  );
}
const unsafeCiWorkflowMutation = ciWorkflowText.replace('contents: read', 'contents: write');
assert.notEqual(
  sha256(Buffer.from(unsafeCiWorkflowMutation, 'utf8')),
  expectedCiWorkflowSha256,
  'CI workflow hash guard accepted a write-permission mutation',
);

const packageJson = await readJson('package.json');
assert.deepEqual(packageJson, expectedPackage, 'package metadata differs from admitted policy');
assert.deepEqual(Object.keys(packageJson.dependencies), [], 'runtime dependencies must remain empty');
assert.deepEqual(Object.keys(packageJson.devDependencies), [], 'development dependencies must remain empty');
for (const forbidden of [
  'bugs',
  'files',
  'homepage',
  'packageManager',
  'publishConfig',
  'repository',
  'workspaces',
]) {
  assert.equal(Object.hasOwn(packageJson, forbidden), false, 'forbidden package field: ' + forbidden);
}
for (const forbidden of [
  'install',
  'postinstall',
  'preinstall',
  'prepare',
  'prepublish',
  'prepublishOnly',
]) {
  assert.equal(Object.hasOwn(packageJson.scripts, forbidden), false, 'forbidden lifecycle script: ' + forbidden);
}

const lock = await readJson('package-lock.json');
assert.equal(lock.name, expectedPackage.name, 'lock name changed');
assert.equal(lock.version, expectedPackage.version, 'lock version changed');
assert.equal(lock.lockfileVersion, 3, 'lockfile version must be 3');
assert.equal(lock.requires, true, 'lock requires marker changed');
assert.deepEqual(Object.keys(lock.packages), [''], 'lock contains unexpected packages');
assert.equal(lock.packages[''].name, expectedPackage.name, 'lock root name changed');
assert.equal(lock.packages[''].version, expectedPackage.version, 'lock root version changed');
assert.equal(lock.packages[''].license, expectedPackage.license, 'lock root license changed');
assert.deepEqual(lock.packages[''].bin, expectedPackage.bin, 'lock root bin changed');
assert.deepEqual(lock.packages[''].engines, expectedPackage.engines, 'lock root engine changed');
assert.equal(Object.hasOwn(lock, 'dependencies'), false, 'lock dependency graph must be absent');

const licenseBytes = await readFile(path.join(root, 'LICENSE'));
assert.equal(sha256(licenseBytes), expectedLicenseSha256, 'Apache-2.0 license bytes changed');
const noticeText = await readFile(path.join(root, 'NOTICE'), 'utf8');
assert.equal(
  noticeText,
  [
    'Long Arc Protocol',
    'Copyright 2026 Long Arc Studios',
    '',
    'Long Arc Studios is the public project and brand identity for this work.',
    '',
    'The Long Arc name and associated marks are reserved. They are not licensed under',
    'the Apache License 2.0 except as required for reasonable and customary use in',
    'describing the origin of the work.',
    '',
  ].join('\n'),
  'NOTICE differs from admitted candidate text',
);

const schemas = new Map();
const validFixtures = new Map();
for (const spec of protocolSpecs) {
  const schema = await readJson(spec.schemaPath);
  schemas.set(spec.id, schema);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', spec.id + ': schema draft changed');
  assert.equal(schema.$id, spec.schemaUrn, spec.id + ': schema identity changed');
  assert.equal(schema['x-longarc-protocol'], spec.id, spec.id + ': protocol metadata changed');
  assert.equal(schema.type, 'object', spec.id + ': root must be an object');
  assert.equal(schema.additionalProperties, false, spec.id + ': root unknown fields must reject');
  assert.equal(schema.properties.protocol.const, spec.id, spec.id + ': protocol discriminator changed');
  assert.deepEqual(
    schemaKeywordErrors(schema),
    [],
    spec.id + ': schema uses a keyword outside the reference verifier surface',
  );

  const valid = await readJson(spec.validPath);
  validFixtures.set(spec.id, valid);
  const positiveErrors = validateProtocol(schema, spec.id, valid);
  assert.deepEqual(positiveErrors, [], spec.id + ' valid fixture rejected:\n' + positiveErrors.join('\n'));
  const operationalPositive = await validateV0Document(valid);
  assert.equal(operationalPositive.valid, true, spec.id + ': operational validator rejected valid fixture');
  assert.equal(
    operationalPositive.claimCeiling,
    'local_conformance_only',
    spec.id + ': operational validator widened or removed its claim ceiling',
  );

  const invalid = await readJson(spec.invalidPath);
  const negativeErrors = validateProtocol(schema, spec.id, invalid);
  assert.equal(negativeErrors.length > 0, true, spec.id + ': invalid fixture was accepted');
  assert.equal(
    negativeErrors.some((error) => error.includes(spec.invalidSignal)),
    true,
    spec.id + ': invalid fixture failed for the wrong boundary:\n' + negativeErrors.join('\n'),
  );
  const operationalNegative = await validateV0Document(invalid);
  assert.equal(
    operationalNegative.valid,
    false,
    spec.id + ': operational validator accepted invalid fixture',
  );
  assert.equal(
    operationalNegative.claimCeiling,
    'no_conformance_claim',
    spec.id + ': failed operational validation retained a conformance claim',
  );
}

function mutatedValue(protocolId, update) {
  const value = structuredClone(validFixtures.get(protocolId));
  update(value);
  return value;
}

const negativeControls = [
  [
    'receipt evidence cannot gain authority fields',
    'longarc.protocol.receipt-envelope.v0',
    (value) => { value.evidence.authority = 'self_granted'; },
  ],
  [
    'signature presence is not verification',
    'longarc.protocol.receipt-envelope.v0',
    (value) => {
      value.signature.present = false;
      value.signature.verification = 'verified';
    },
  ],
  [
    'reordered duplicate evidence item',
    'longarc.protocol.receipt-envelope.v0',
    (value) => {
      const item = value.evidence.items[0];
      value.evidence.items.push({
        digest: item.digest,
        locator: item.locator,
        kind: item.kind,
      });
    },
  ],
  [
    'capability wildcard',
    'longarc.protocol.capability-grant.v0',
    (value) => { value.capability = '*'; },
  ],
  [
    'scope wildcard',
    'longarc.protocol.capability-grant.v0',
    (value) => { value.scope.push('counter:*'); },
  ],
  [
    'non-single-use grant',
    'longarc.protocol.capability-grant.v0',
    (value) => { value.singleUse = false; },
  ],
  [
    'expired-before-issued grant',
    'longarc.protocol.capability-grant.v0',
    (value) => { value.expiresAt = '2025-12-31T23:59:59Z'; },
  ],
  [
    'non-canonical date-time offset',
    'longarc.protocol.capability-grant.v0',
    (value) => { value.issuedAt = '2026-01-01T00:00:00+00:00'; },
  ],
  [
    'impossible calendar date-time',
    'longarc.protocol.capability-grant.v0',
    (value) => { value.issuedAt = '2026-02-30T00:00:00Z'; },
  ],
  [
    'unknown effect normalized to success',
    'longarc.protocol.effect-observation.v0',
    (value) => { value.completion.status = 'succeeded'; },
  ],
  [
    'unknown effect automatic retry',
    'longarc.protocol.effect-observation.v0',
    (value) => { value.retry.allowed = true; },
  ],
  [
    'plan as execution authority',
    'longarc.protocol.run-plan.v0',
    (value) => { value.executionAuthority = true; },
  ],
  [
    'undeclared plan capability',
    'longarc.protocol.run-plan.v0',
    (value) => { value.steps[0].capability = 'network.send'; },
  ],
  [
    'non-contiguous plan order',
    'longarc.protocol.run-plan.v0',
    (value) => { value.steps[1].order = 3; },
  ],
  [
    'adapter product binding',
    'longarc.protocol.adapter-manifest.v0',
    (value) => { value.productBinding = 'example-product'; },
  ],
  [
    'adapter global policy ownership',
    'longarc.protocol.adapter-manifest.v0',
    (value) => { value.policyAuthority = 'global'; },
  ],
];
for (const [name, protocolId, update] of negativeControls) {
  const value = mutatedValue(protocolId, update);
  assert.equal(
    validateProtocol(schemas.get(protocolId), protocolId, value).length > 0,
    true,
    'reference verifier accepted negative control: ' + name,
  );
  assert.equal(
    (await validateV0Document(value)).valid,
    false,
    'operational validator accepted negative control: ' + name,
  );
}

const unsupportedKeywordSchema = structuredClone(
  schemas.get('longarc.protocol.receipt-envelope.v0'),
);
unsupportedKeywordSchema.unevaluatedProperties = false;
assert.equal(
  schemaKeywordErrors(unsupportedKeywordSchema).length > 0,
  true,
  'negative control accepted a schema keyword the verifier does not implement',
);

const verifierSource = await readFile(path.join(root, 'scripts/verify-v0.mjs'), 'utf8');
const imports = verifierSource
  .split(/\r?\n/u)
  .filter((line) => line.startsWith('import '))
  .map((line) => line.split("'")[1]);
assert.deepEqual(sorted(imports), sorted([
  '../src/validate-v0.mjs',
  'node:assert/strict',
  'node:crypto',
  'node:fs/promises',
  'node:path',
  'node:url',
]), 'verifier import surface changed');
for (const forbiddenOperation of [
  ['fetch', '('].join(''),
  ['write', 'File', '('].join(''),
  ['append', 'File', '('].join(''),
  ['child_', 'process'].join(''),
  ['process', '.env'].join(''),
  ['process', '.argv'].join(''),
  ['Date', '.now', '('].join(''),
  ['Math', '.random', '('].join(''),
]) {
  assert.equal(verifierSource.includes(forbiddenOperation), false, 'verifier side-effect surface: ' + forbiddenOperation);
}

const operationalSources = new Map([
  [
    'bin/longarc-protocol.mjs',
    await readFile(path.join(root, 'bin/longarc-protocol.mjs'), 'utf8'),
  ],
  [
    'src/validate-v0.mjs',
    await readFile(path.join(root, 'src/validate-v0.mjs'), 'utf8'),
  ],
]);
for (const [relativePath, source] of operationalSources) {
  for (const forbiddenOperation of [
    ['fetch', '('].join(''),
    ['write', 'File', '('].join(''),
    ['append', 'File', '('].join(''),
    ['child_', 'process'].join(''),
    ['process', '.env'].join(''),
    ['Date', '.now', '('].join(''),
    ['Math', '.random', '('].join(''),
  ]) {
    assert.equal(
      source.includes(forbiddenOperation),
      false,
      relativePath + ': operational side-effect surface: ' + forbiddenOperation,
    );
  }
}
assert.equal(
  operationalSources.get('src/validate-v0.mjs').includes('process.'),
  false,
  'validation library must remain process-independent',
);

const syntheticHomePath = '/' + ['Users', 'example', 'candidate'].join('/');
const syntheticUnixHomePath = '/' + ['home', 'example', 'candidate'].join('/');
const syntheticWindowsHomePath = 'C:' + '\\' + ['Users', 'example', 'candidate'].join('\\');
const syntheticFileUri = 'file:' + '//' + syntheticHomePath;
const syntheticPrivateTemp = '/' + ['private', 'tmp', 'candidate'].join('/');
assert.equal(containsLocalIdentity(syntheticHomePath), true);
assert.equal(containsLocalIdentity(syntheticUnixHomePath), true);
assert.equal(containsLocalIdentity(syntheticWindowsHomePath), true);
assert.equal(containsLocalIdentity(syntheticFileUri), true);
assert.equal(containsLocalIdentity(syntheticPrivateTemp), true);
assert.equal(containsLocalIdentity('schemas/v0/run-plan.schema.json'), false);

const syntheticCloudKey = 'AK' + 'IA' + 'A'.repeat(16);
const syntheticPrivateKeyHeader = '-'.repeat(5) + 'BEGIN ' + 'PRIVATE' + ' KEY' + '-'.repeat(5);
const syntheticApiKey = 'sk' + '-' + 'a'.repeat(24);
assert.equal(containsCredential(syntheticCloudKey), true);
assert.equal(containsCredential(syntheticPrivateKeyHeader), true);
assert.equal(containsCredential(syntheticApiKey), true);
assert.equal(containsCredential('bounded public protocol fixture'), false);

console.log('PASS: exact thirty-five-path tracked surface contains only regular UTF-8 text files; root Git administration is excluded');
console.log('PASS: exact CI workflow is SHA-pinned, read-only, repository-secret-free, package-manager-cache-disabled, and limited to the offline test command');
console.log('PASS: package and lock are dependency-free, private, lifecycle-script-free, and expose only the bounded candidate CLI');
console.log('PASS: 5 schemas and the operational validator accept 5 positive fixtures and reject 5 boundary-specific negative fixtures');
console.log('PASS: 17 negative controls preserve schema coverage, structural uniqueness, canonical time, evidence, authority, signature, scope, effect-truth, plan, and adapter boundaries');
console.log('PASS: verifier, validator, and CLI are standard-library-only, read-only, environment-independent, and network-free');
console.log('PASS: local paths, credentials, opaque binaries, symlinks, unknown paths, and license drift fail closed');
console.log('PASS: local conformance and offline CLI candidate only; no receipt, execution, publication, integration, release, security, or production claim made');
