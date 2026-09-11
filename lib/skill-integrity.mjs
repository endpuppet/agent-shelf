import { createHash } from 'node:crypto';

export function sha256(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

export function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') throw new Error('Metadata must be an object.');
  if (metadata.schema_version !== 1) throw new Error('Unsupported metadata schema_version.');
  if (metadata.kind !== 'verified-upstream-skill') throw new Error('Metadata kind must be verified-upstream-skill.');
  if (!metadata.source || typeof metadata.source !== 'object') throw new Error('Metadata source is required.');
  if (!/^[^/\s]+\/[^/\s]+$/.test(metadata.source.repository || '')) throw new Error('Source repository must use owner/repo format.');
  if (!/^[0-9a-f]{40}$/i.test(metadata.source.commit || '')) throw new Error('Source must use a full 40-character commit SHA.');
  const sourcePath = metadata.source.path;
  if (typeof sourcePath !== 'string' || sourcePath.length === 0 || sourcePath.startsWith('/') || sourcePath.split('/').includes('..')) {
    throw new Error('Source path must be a non-empty relative path without traversal.');
  }
  if (!metadata.integrity || typeof metadata.integrity !== 'object') throw new Error('Metadata integrity is required.');
  if (!/^[0-9a-f]{64}$/.test(metadata.integrity.sha256 || '')) throw new Error('Integrity hash must be a lowercase 64-character SHA-256.');
  if (!Number.isInteger(metadata.integrity.bytes) || metadata.integrity.bytes < 0) throw new Error('Integrity byte length must be a non-negative integer.');
}

export function rawGitHubUrl(metadata) {
  validateMetadata(metadata);
  const [owner, repo] = metadata.source.repository.split('/');
  const encodedPath = metadata.source.path.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${metadata.source.commit}/${encodedPath}`;
}

export function verifyByteIdentity(localBytes, upstreamBytes, metadata) {
  validateMetadata(metadata);
  const local = Buffer.from(localBytes);
  const upstream = Buffer.from(upstreamBytes);

  if (local.length !== metadata.integrity.bytes) {
    throw new Error(`Local byte length mismatch: expected ${metadata.integrity.bytes}, got ${local.length}.`);
  }
  if (upstream.length !== metadata.integrity.bytes) {
    throw new Error(`Upstream byte length mismatch: expected ${metadata.integrity.bytes}, got ${upstream.length}.`);
  }

  const localHash = sha256(local);
  const upstreamHash = sha256(upstream);
  if (localHash !== metadata.integrity.sha256) {
    throw new Error(`Local hash mismatch: expected ${metadata.integrity.sha256}, got ${localHash}.`);
  }
  if (upstreamHash !== metadata.integrity.sha256) {
    throw new Error(`Upstream hash mismatch: expected ${metadata.integrity.sha256}, got ${upstreamHash}.`);
  }
  if (!local.equals(upstream)) throw new Error('Local and upstream byte identity mismatch.');
}
