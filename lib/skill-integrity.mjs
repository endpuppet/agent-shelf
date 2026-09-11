import { createHash } from 'node:crypto';
import { validateItem } from './item-schema.mjs';

export function sha256(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

export function rawGitHubUrl(item) {
  validateItem(item);
  if (item.origin.type !== 'github-upstream' || item.integrity.mode !== 'exact-upstream') {
    throw new Error('Pinned raw GitHub URLs require github-upstream exact-upstream skill metadata.');
  }
  const [owner, repo] = item.origin.repository.split('/');
  const encodedPath = item.origin.path.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${item.origin.commit}/${encodedPath}`;
}

export function verifyByteIdentity(localBytes, upstreamBytes, item) {
  validateItem(item);
  if (item.origin.type !== 'github-upstream' || item.integrity.mode !== 'exact-upstream') {
    throw new Error('Byte identity verification requires github-upstream exact-upstream skill metadata.');
  }

  const local = Buffer.from(localBytes);
  const upstream = Buffer.from(upstreamBytes);

  if (local.length !== item.integrity.bytes) {
    throw new Error(`Local byte length mismatch: expected ${item.integrity.bytes}, got ${local.length}.`);
  }
  if (upstream.length !== item.integrity.bytes) {
    throw new Error(`Upstream byte length mismatch: expected ${item.integrity.bytes}, got ${upstream.length}.`);
  }

  const localHash = sha256(local);
  const upstreamHash = sha256(upstream);
  if (localHash !== item.integrity.sha256) {
    throw new Error(`Local hash mismatch: expected ${item.integrity.sha256}, got ${localHash}.`);
  }
  if (upstreamHash !== item.integrity.sha256) {
    throw new Error(`Upstream hash mismatch: expected ${item.integrity.sha256}, got ${upstreamHash}.`);
  }
  if (!local.equals(upstream)) throw new Error('Local and upstream byte identity mismatch.');
}
