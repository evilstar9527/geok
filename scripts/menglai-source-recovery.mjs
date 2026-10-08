import { createHash } from 'node:crypto';
export const SOURCE_RECOVERY_METHOD = 'snapshot-visible-links-v1';
export const sourceHash = value => createHash('sha256').update(value).digest('hex');
const providers = new Set(['deepseek', 'qianwen', 'kimi', 'doubao']);
const excludedHosts = /(^|\.)(deepseek\.com|qianwen\.com|kimi\.com|kimi\.ai|doubao\.com)$|^(creator\.xiaohongshu\.com|rule\.tencent\.com|privacy\.qq\.com)$/i;
function canonicalUrl(raw) {
  const u = new URL(raw);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || !u.hostname.includes('.')) throw Error('Invalid source URL');
  if (excludedHosts.test(u.hostname)) return null;
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) if (/^utm_/i.test(key)) u.searchParams.delete(key);
  return u.href;
}
export function recoverSnapshotSources({provider, snapshot}) {
  if (typeof snapshot !== 'string') throw Error('Missing captured snapshot');
  if (!providers.has(provider)) return [];
  const lines = snapshot.split('\n'), found = new Map();
  for (let i = 1; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)- \/url: (https?:\/\/.+)$/);
    if (!match) continue;
    const parent = lines[i-1].match(/^(\s*)- '?link "((?:\\.|[^"\\])*)"(?:[^\n]*)$/);
    if (!parent || match[1].length !== parent[1].length + 2) continue;
    let label; try { label = JSON.parse(`"${parent[2]}"`); } catch { continue; }
    if (/用户服务协议|隐私协议|隐私政策|登录|创作中心|发布笔记|新建会话/.test(label)) continue;
    const raw = match[2].trim(); let url; try { url = canonicalUrl(raw); } catch { continue; }
    if (!url || found.has(url)) continue;
    const domain = new URL(url).hostname;
    found.set(url, {title: /^[-\s\d]+$/.test(label) ? domain : label, cited_text: '', url, domain, favicon: null});
  }
  return [...found.values()];
}

/** Prepare all mutations before writing; refuse to overwrite existing sources. */
export function planSourceRecovery(items, rows, expectedResponseId) {
  if (!Array.isArray(items) || !items.length || items.length > 60) throw Error('Invalid source batch');
  const byId = new Map(rows.map(r => [r.id, r])), seen = new Set(), updates = [];
  let skipped = 0;
  for (const item of items) {
    const id = expectedResponseId(item), row = byId.get(id);
    if (!row || seen.has(id) || sourceHash(row.response) !== item.answerSha256) throw Error('Source identity/hash mismatch');
    seen.add(id);
    const metadata = JSON.parse(row.collection_metadata);
    if (metadata.externalSampleId !== item.id || row.model_provider !== item.provider) throw Error('Source metadata mismatch');
    const sources = recoverSnapshotSources(item);
    if (!sources.length) throw Error('No recoverable source links');
    const snapshotSha256 = sourceHash(item.snapshot);
    if (metadata.sourceRecovery?.method === SOURCE_RECOVERY_METHOD) {
      if (metadata.sourceRecovery.snapshotSha256 !== snapshotSha256 || sourceHash(JSON.stringify(row.sources)) !== sourceHash(JSON.stringify(sources))) throw Error('Recovered source conflict');
      skipped++; continue;
    }
    if (row.sources?.length) throw Error('Existing sources must not be overwritten');
    updates.push({id, sources, metadata: {...metadata, sourcesCoverage:'snapshot_partial', sourceRecovery:{method:SOURCE_RECOVERY_METHOD,snapshotSha256,recoveredAt:new Date().toISOString(),linkCount:sources.length,scope:'visible_reference_links',completeness:'partial'}}});
  }
  return {updates, skipped};
}

export const REFERENCE_METHOD = 'snapshot-reference-badge-v1';
export function parseReferenceBadge(provider, badge) {
  if (typeof badge !== 'string') return null;
  const pattern = provider === 'doubao' ? /^搜索 \d+ 个关键词，参考 (\d+) 篇资料$/ : provider === 'diandian' ? /^参考小红书与全网内容(\d+)篇$/ : null;
  const match = pattern && badge.match(pattern);
  const count = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function extractReferenceBadge({provider, snapshot}) {
  const badges = new Set();
  for (const line of snapshot.split('\n')) {
    // The generic label appears once even when the parent button repeats its text.
    const match = line.match(/^\s*- generic: (.+)$/);
    if (match && parseReferenceBadge(provider, match[1]) !== null) badges.add(match[1]);
  }
  if (badges.size > 1) throw Error('Ambiguous reference badges');
  return [...badges][0] ?? null;
}

export function planReferenceRecovery(items, rows, expectedResponseId) {
  if (!Array.isArray(items) || !items.length || items.length > 600) throw Error('Invalid reference batch');
  const byId = new Map(rows.map(r => [r.id, r])), seen = new Set(), updates = [];
  let skipped = 0;
  for (const item of items) {
    const id = expectedResponseId(item), row = byId.get(id);
    if (!row || seen.has(id) || sourceHash(row.response) !== item.answerSha256) throw Error('Reference identity/hash mismatch');
    seen.add(id);
    const metadata = JSON.parse(row.collection_metadata);
    if (metadata.externalSampleId !== item.id || row.model_provider !== item.provider) throw Error('Reference metadata mismatch');
    const count = parseReferenceBadge(item.provider, item.badge);
    if (count === null || !/^[a-f0-9]{64}$/.test(item.snapshotSha256)) throw Error('Invalid reference evidence');
    const evidence = {method:REFERENCE_METHOD,badge:item.badge,count,snapshotSha256:item.snapshotSha256};
    if (metadata.referenceEvidence) {
      if (Object.entries(evidence).some(([k,v])=>metadata.referenceEvidence[k]!==v)) throw Error('Existing reference evidence conflicts');
      skipped++; continue;
    }
    updates.push({id,metadata:{...metadata,referenceEvidence:evidence}});
  }
  return {updates,skipped};
}
