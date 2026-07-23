// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';

const PROTOCOL_SPECS = Object.freeze([
  Object.freeze({
    id: 'longarc.protocol.adapter-manifest.v0',
    schemaFile: 'adapter-manifest.schema.json',
  }),
  Object.freeze({
    id: 'longarc.protocol.capability-grant.v0',
    schemaFile: 'capability-grant.schema.json',
  }),
  Object.freeze({
    id: 'longarc.protocol.effect-observation.v0',
    schemaFile: 'effect-observation.schema.json',
  }),
  Object.freeze({
    id: 'longarc.protocol.receipt-envelope.v0',
    schemaFile: 'receipt-envelope.schema.json',
  }),
  Object.freeze({
    id: 'longarc.protocol.run-plan.v0',
    schemaFile: 'run-plan.schema.json',
  }),
]);

export const SUPPORTED_PROTOCOL_IDS = Object.freeze(
  PROTOCOL_SPECS.map((spec) => spec.id),
);
export const MAX_VALIDATION_ERRORS = 64;

const schemaRoot = new URL('../schemas/v0/', import.meta.url);
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

function isPlainObject(value) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype
      || Object.getPrototypeOf(value) === null);
}

function sorted(values) {
  return [...values].sort();
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
    if (schema.format === 'date-time' && !isCanonicalDateTime(value)) {
      add('invalid date-time');
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
        if (!Object.hasOwn(value, key)) {
          errors.push(at + '.' + key + ': required property missing');
        }
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        errors.push(...validateSchema(properties[key], child, at + '.' + key));
      } else if (schema.additionalProperties === false) {
        errors.push(at + ': additional property rejected');
      } else if (isPlainObject(schema.additionalProperties)) {
        errors.push(...validateSchema(
          schema.additionalProperties,
          child,
          at + '.<additional>',
        ));
      }
    }
  }

  return errors;
}

function semanticErrors(protocolId, value) {
  const errors = [];

  if (protocolId === 'longarc.protocol.capability-grant.v0'
    && typeof value.issuedAt === 'string'
    && typeof value.expiresAt === 'string'
    && Date.parse(value.expiresAt) <= Date.parse(value.issuedAt)) {
    errors.push('$.expiresAt: expiry must be later than issue time');
  }

  if (protocolId === 'longarc.protocol.adapter-manifest.v0'
    && Array.isArray(value.capabilities)) {
    const capabilityIds = value.capabilities
      .filter(isPlainObject)
      .map((item) => item.capability);
    if (new Set(capabilityIds).size !== capabilityIds.length) {
      errors.push('$.capabilities: capability identities must be unique');
    }
  }

  if (protocolId === 'longarc.protocol.receipt-envelope.v0'
    && typeof value.recordedAt === 'string'
    && isPlainObject(value.event)
    && typeof value.event.occurredAt === 'string'
    && Date.parse(value.recordedAt) < Date.parse(value.event.occurredAt)) {
    errors.push('$.recordedAt: receipt predates its event');
  }

  if (protocolId === 'longarc.protocol.run-plan.v0' && Array.isArray(value.steps)) {
    const stepIds = value.steps.filter(isPlainObject).map((step) => step.stepId);
    if (new Set(stepIds).size !== stepIds.length) {
      errors.push('$.steps: step identities must be unique');
    }
    value.steps.forEach((step, index) => {
      if (!isPlainObject(step)) return;
      if (step.order !== index) {
        errors.push('$.steps[' + index + ']: order is not contiguous');
      }
      if (Array.isArray(value.allowedCapabilities)
        && !value.allowedCapabilities.includes(step.capability)) {
        errors.push('$.steps[' + index + ']: undeclared capability');
      }
    });
    if (isPlainObject(value.effectBudget)
      && Number.isSafeInteger(value.effectBudget.maximumAttempts)
      && value.effectBudget.maximumAttempts < value.steps.length) {
      errors.push('$.effectBudget.maximumAttempts: budget cannot cover the finite plan');
    }
    if (isPlainObject(value.effectBudget)
      && Number.isSafeInteger(value.effectBudget.externalEffects)
      && Number.isSafeInteger(value.effectBudget.maximumAttempts)
      && value.effectBudget.externalEffects > value.effectBudget.maximumAttempts) {
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
    if (!supportedSchemaKeywords.has(key)) {
      errors.push(at + ': unsupported keyword ' + key);
    }
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
    errors.push(...schemaKeywordErrors(
      schema.additionalProperties,
      at + '.additionalProperties',
    ));
  }
  for (const keyword of ['allOf', 'oneOf']) {
    if (Array.isArray(schema[keyword])) {
      schema[keyword].forEach((child, index) => {
        errors.push(...schemaKeywordErrors(
          child,
          at + '.' + keyword + '[' + index + ']',
        ));
      });
    }
  }
  return errors;
}

function result(protocol, errors) {
  const boundedErrors = errors.slice(0, MAX_VALIDATION_ERRORS);
  if (errors.length > MAX_VALIDATION_ERRORS) {
    boundedErrors.push('$: validation error limit reached');
  }
  const frozenErrors = Object.freeze(boundedErrors);
  return Object.freeze({
    protocol,
    valid: frozenErrors.length === 0,
    claimCeiling: frozenErrors.length === 0
      ? 'local_conformance_only'
      : 'no_conformance_claim',
    errors: frozenErrors,
  });
}

export async function validateV0Document(value) {
  if (!isPlainObject(value)) {
    return result(null, ['$: protocol document must be an object']);
  }

  if (typeof value.protocol !== 'string') {
    return result(null, ['$.protocol: supported protocol discriminator required']);
  }

  const spec = PROTOCOL_SPECS.find((candidate) => candidate.id === value.protocol);
  if (!spec) {
    return result(null, ['$.protocol: unsupported protocol']);
  }

  const schema = JSON.parse(
    await readFile(new URL(spec.schemaFile, schemaRoot), 'utf8'),
  );
  const keywordErrors = schemaKeywordErrors(schema);
  if (keywordErrors.length > 0) {
    return result(value.protocol, keywordErrors);
  }

  return result(value.protocol, validateProtocol(schema, value.protocol, value));
}
