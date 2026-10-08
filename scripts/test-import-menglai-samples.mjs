import assert from 'node:assert/strict';
import test from 'node:test';
import {WORKSPACE,RUN,hash,responseId,validate,readUtf8} from './import-menglai-samples.mjs';
const sample={id:'doubao-Q01-01',provider:'doubao',promptId:'Q01',prompt:'AI毛绒玩具推荐',repeat:1,status:'complete',answer:'test answer',answerSha256:hash('test answer'),capturedAt:'2026-09-30T08:00:00.000Z',submittedAt:null,url:'https://www.doubao.com/chat/test'};
const payload=samples=>({workspaceId:WORKSPACE,runId:RUN,samples});
test('same evidence is idempotent, distinct repeat remains distinct',()=>{
 assert.equal(responseId(sample),responseId({...sample}));
 const next={...sample,id:'doubao-Q01-02',repeat:2};
 assert.notEqual(responseId(sample),responseId(next));
 assert.equal(validate(payload([sample,next])).length,2);
});
test('reject wrong workspace and changed source body',()=>{
 assert.throws(()=>validate({...payload([sample]),workspaceId:'another'}));
 assert.throws(()=>validate(payload([{...sample,answer:'modified'}])));
});
test('reject duplicate sample and incorrect original question',()=>{
 assert.throws(()=>validate(payload([sample,sample])));
 assert.throws(()=>validate(payload([{...sample,prompt:'AI电子宠物推荐'}])));
});
test('reject invented date or submission after capture',()=>{
 assert.throws(()=>validate(payload([{...sample,capturedAt:'2026-10-08T08:00:00Z'}])));
 assert.throws(()=>validate(payload([{...sample,submittedAt:'2026-09-30T09:00:00Z'}])));
});

import { Readable } from 'node:stream';
test('UTF-8 evidence survives arbitrary byte boundaries on stdin',async()=>{
 const text=JSON.stringify({answer:'中文回答与 emoji 🐝 必须逐字保留'});
 const bytes=Buffer.from(text);
 const chunks=Array.from(bytes,byte=>Buffer.from([byte]));
 assert.equal(await readUtf8(Readable.from(chunks)),text);
});
