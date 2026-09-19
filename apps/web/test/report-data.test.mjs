import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/app/report/[id]/data/route.ts', import.meta.url), 'utf8');
const mocked = source.replace('import { getReportById } from "@oneglanse/services";', `
const getReportById = async ({id}) => id === 'report_missing' ? null : ({
  id, workspaceId: 'private-workspace', brandName: 'Example', createdAt: '2026-09-13T12:00:00Z',
  data: id === 'report_invalid' ? '{invalid json' : JSON.stringify({version: 3, brand: {name: 'Example'}, mentionRates: []})
});`);
const compiled = ts.transpileModule(mocked, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const dashboard = 'https://jianke-geo-dashboard.chummy-cedar-3514.chatgpt.site';
const request = (id, origin = dashboard) => GET(new Request('https://example.com/report/' + id + '/data', {headers: {Origin: origin}}), {params: Promise.resolve({id})});
test('只返回公开快照和报告标识；不泄露工作区信息、不缓存', async () => {
  const response = await request('report_ok');
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()), ['id', 'createdAt', 'data']);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), dashboard);
});
test('不允许任意来源跨域读取', async () => {
  const response = await request('report_ok', 'https://unrelated.example');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
});
test('服务器看板可无凭证读取公开报告，包括不存在报告的错误响应', async () => {
  const origin = 'http://8.133.177.51';
  for (const id of ['report_ok', 'report_missing']) {
    const response = await request(id, origin);
    assert.equal(response.status, id === 'report_ok' ? 200 : 404);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});
test('已删除、不存在和非法报告编号返回404；损坏快照返回422', async () => {
  for (const id of ['report_missing', 'invalid']) {
    const response = await request(id);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), dashboard);
  }
  assert.equal((await request('report_invalid')).status, 422);
});
