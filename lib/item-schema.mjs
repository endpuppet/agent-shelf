const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA40 = /^[0-9a-f]{40}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const REPOSITORY = /^[^/\s]+\/[^/\s]+$/;
const TYPES = new Set(['skill', 'prompt']);
const ORIGINS = new Set(['github-upstream', 'github-owned', 'personal', 'derived', 'generated']);
const FORBIDDEN_FIELDS = new Set(['title_sl', 'description_sl', 'tags_sl', 'verification', 'trust_label', 'badge']);

function objectField(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} must be a non-empty string.`);
}

function validateRepository(value) {
  if (!REPOSITORY.test(value || '')) throw new Error('Origin repository must use owner/repo format.');
}

function validateIntegrity(integrity) {
  objectField(integrity, 'Integrity');
  if (!['exact-upstream', 'content-hash'].includes(integrity.mode)) throw new Error('Unsupported integrity mode.');
  if (!SHA256.test(integrity.sha256 || '')) throw new Error('Integrity SHA-256 must be a lowercase 64-character hash.');
  if (!Number.isInteger(integrity.bytes) || integrity.bytes < 0) throw new Error('Integrity byte length must be a non-negative integer.');
}

export function contentFilename(type) {
  if (type === 'skill') return 'SKILL.md';
  if (type === 'prompt') return 'PROMPT.md';
  throw new Error(`Unsupported item type: ${type}`);
}

export function isSafeRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  const parts = value.split(/[\\/]/);
  return !parts.includes('..') && !parts.includes('');
}

export function validateItem(item, { expectedType, expectedCategory, expectedSlug } = {}) {
  objectField(item, 'Item');
  if (item.schema_version !== 1) throw new Error('Unsupported item schema_version.');

  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(item, field)) {
      throw new Error(`Forbidden translated or trust field: ${field}.`);
    }
  }

  nonEmptyString(item.id, 'Item id');
  if (!TYPES.has(item.type)) throw new Error('Item type must be skill or prompt.');
  if (!SEGMENT.test(item.category || '')) throw new Error('Item category must be lowercase kebab-case.');
  if (!SEGMENT.test(item.slug || '')) throw new Error('Item slug must be lowercase kebab-case.');
  nonEmptyString(item.title, 'Item title');
  if (typeof item.description !== 'string') throw new Error('Item description must be a string.');
  if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== 'string' || tag.length === 0)) {
    throw new Error('Item tags must be an array of non-empty strings.');
  }
  objectField(item.origin, 'Origin');
  objectField(item.tracking, 'Tracking');
  validateIntegrity(item.integrity);

  if (expectedType && item.type !== expectedType) throw new Error(`Item type mismatch: expected ${expectedType}, got ${item.type}.`);
  if (expectedCategory && item.category !== expectedCategory) throw new Error(`Item category mismatch: expected ${expectedCategory}, got ${item.category}.`);
  if (expectedSlug && item.slug !== expectedSlug) throw new Error(`Item slug mismatch: expected ${expectedSlug}, got ${item.slug}.`);

  const originType = item.origin.type;
  if (!ORIGINS.has(originType)) throw new Error(`Unsupported origin type: ${originType || '<missing>'}.`);

  if (originType === 'github-upstream') {
    if (item.type !== 'skill') throw new Error('github-upstream exact-upstream provenance is supported for skills only in schema v1.');
    validateRepository(item.origin.repository);
    if (!isSafeRelativePath(item.origin.path)) throw new Error('Origin path must be a safe relative path without traversal.');
    if (!SHA40.test(item.origin.commit || '')) throw new Error('github-upstream origin requires a full 40-character commit SHA.');
    if (item.integrity.mode !== 'exact-upstream') throw new Error('github-upstream skills require exact-upstream integrity.');
  } else {
    if (item.integrity.mode !== 'content-hash') throw new Error(`${originType} origin requires content-hash integrity; exact-upstream is incompatible.`);

    if (originType === 'github-owned') {
      validateRepository(item.origin.repository);
      if (!isSafeRelativePath(item.origin.path)) throw new Error('Origin path must be a safe relative path without traversal.');
      if (item.origin.commit != null && !SHA40.test(item.origin.commit)) throw new Error('github-owned commit must be a full 40-character commit SHA when present.');
    }
    if (originType === 'personal') nonEmptyString(item.origin.author, 'Personal origin author');
    if (originType === 'derived') nonEmptyString(item.origin.reference, 'Derived origin reference');
    if (originType === 'generated') nonEmptyString(item.origin.author, 'Generated origin author');
  }

  return item;
}

export function deriveTrustCode(item) {
  validateItem(item);
  if (item.origin.type === 'github-upstream' && item.integrity.mode === 'exact-upstream') return 'exact-upstream';
  if (item.origin.type === 'github-owned') return 'own-repository';
  return item.origin.type;
}
