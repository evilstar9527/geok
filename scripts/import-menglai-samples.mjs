// One-off, append-only import of the user's 2026-09-30 website sampling.
// Execute inside the existing agent container; never print answer bodies or URLs.
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const WORKSPACE = 'workspace_a30e8ba6-da7a-4789-831f-b15b74b347e3';
export const RUN = 'manual-menglai-web-20260930';
const COUNTS = { doubao:186, deepseek:114, qianwen:61, kimi:6, diandian:336, yuanbao:144 };
const PROMPTS = ['AI毛绒玩具推荐','AI电子宠物推荐','AI毛绒玩偶推荐','AI宠物推荐哪个好','AI玩具买哪个好','ai互动玩偶推荐','梦莱星玩具值得买吗','梦莱星适合买给小朋友吗','梦莱星玩具怎么样'];
export const hash = s => createHash('sha256').update(s).digest('hex');
export const responseId = r => `external-${hash(`${WORKSPACE}|${RUN}|${r.id}`)}`;
export function validate(payload) {
  if (payload.workspaceId !== WORKSPACE || payload.runId !== RUN || !Array.isArray(payload.samples) || payload.samples.length > 60) throw Error('Invalid import scope');
  const ids = new Set();
  for (const r of payload.samples) {
    const q = PROMPTS.indexOf(r.prompt);
    if (!(r.provider in COUNTS) || q < 0 || r.promptId !== `Q${String(q+1).padStart(2,'0')}` || !Number.isInteger(r.repeat) || r.repeat < 1 || r.repeat > 50 || r.status !== 'complete') throw Error('Invalid sample metadata');
    if (r.id !== `${r.provider}-${r.promptId}-${String(r.repeat).padStart(2,'0')}` || ids.has(r.id)) throw Error('Invalid or duplicate sample ID');
    if (typeof r.answer !== 'string' || !r.answer.trim() || hash(r.answer) !== r.answerSha256) throw Error('Answer hash mismatch');
    if (!Number.isFinite(Date.parse(r.capturedAt)) || !r.capturedAt.startsWith('2026-09-30T') || (r.submittedAt && (!Number.isFinite(Date.parse(r.submittedAt)) || Date.parse(r.submittedAt)>Date.parse(r.capturedAt)))) throw Error('Invalid collection timestamp');
    if (new URL(r.url).protocol !== 'https:') throw Error('Invalid conversation URL');
    ids.add(r.id);
  }
  return payload.samples;
}

export async function readUtf8(stream) {
  stream.setEncoding('utf8');
  let text='';
  for await (const chunk of stream) text+=chunk;
  return text;
}

async function main() {
  const operation = process.argv[2];
  if (!['inspect','import','enqueue','diagnose'].includes(operation)) throw Error('Unknown operation');
  const { clickhouse, pool } = await import('/app/node_modules/@oneglanse/db/dist/index.js');
  const lock = await pool.connect();
  try {
    await lock.query('SELECT pg_advisory_lock(hashtext($1))', [RUN]);
    const ws = (await lock.query('SELECT id,name,domain FROM workspaces WHERE id=$1 AND deleted_at IS NULL', [WORKSPACE])).rows[0];
    if (!ws || ws.name !== '梦莱星') throw Error('Workspace identity mismatch');
    const owners = (await lock.query("SELECT user_id FROM workspace_members WHERE workspace_id=$1 AND deleted_at IS NULL AND role='owner'", [WORKSPACE])).rows;
    if (owners.length !== 1) throw Error('Expected exactly one active workspace owner');
    const userId = owners[0].user_id;
    const query = async (sql, extra={}) => (await clickhouse.query({query:sql,query_params:{workspaceId:WORKSPACE,runId:RUN,...extra},format:'JSONEachRow'})).json();
    const sort = await query("SELECT sorting_key FROM system.tables WHERE database='analytics' AND name='prompt_responses'");
    if (!sort[0]?.sorting_key.includes('response_sort_id')) throw Error('Repeated-sample storage migration is missing');
    const before = await query('SELECT count() AS total FROM analytics.prompt_responses FINAL WHERE workspace_id={workspaceId:String}');
    if (operation === 'import') {
      const input=await readUtf8(process.stdin);
      const samples = validate(JSON.parse(input));
      const existing = await query('SELECT id,response,collection_metadata FROM analytics.prompt_responses FINAL WHERE workspace_id={workspaceId:String}');
      const byId = new Map(existing.map(r=>[r.id,r]));
      const bySource = new Map(existing.flatMap(r=>{try{const m=JSON.parse(r.collection_metadata);return m.externalSampleId&&m.importRunId===RUN?[[m.externalSampleId,r]]:[];}catch{return [];}}));
      const pending = samples.filter(r=>{
        const old=byId.get(responseId(r))||bySource.get(r.id);
        if (old && hash(old.response)!==r.answerSha256) throw Error('Existing response conflicts with source hash');
        return !old;
      });
      const promptRows = await query('SELECT id,prompt,sort_order FROM analytics.user_prompts FINAL WHERE workspace_id={workspaceId:String} ORDER BY created_at DESC,id');
      const prompts = new Map();
      for (const p of promptRows) if (!prompts.has(p.prompt)) prompts.set(p.prompt,p.id);
      const newPrompts=[];
      for (const r of pending) if (!prompts.has(r.prompt)) {
        const id=`external-prompt-${hash(`${WORKSPACE}|${r.prompt}`)}`;
        prompts.set(r.prompt,id);
        newPrompts.push({id,prompt:r.prompt,user_id:userId,workspace_id:WORKSPACE,sort_order:Math.max(-1,...promptRows.map(p=>Number(p.sort_order)))+newPrompts.length+1});
      }
      if (newPrompts.length) await clickhouse.insert({table:'analytics.user_prompts',values:newPrompts,format:'JSONEachRow'});
      const values=pending.map(r=>({
        id:responseId(r),response_sort_id:responseId(r),prompt_id:prompts.get(r.prompt),prompt:r.prompt,user_id:userId,workspace_id:WORKSPACE,
        model:r.provider,model_provider:r.provider,response:r.answer,sources:[],is_analysed:false,
        prompt_run_at:Math.floor(Date.parse(r.submittedAt||r.capturedAt)/1000),created_at:Math.floor(Date.parse(r.capturedAt)/1000),
        run_id:RUN,execution_surface:'web',device_id:null,exposure_evaluated:false,exposure_terms:[],exposure_matches:[],collection_status:'success',failure_reason:null,
        collection_metadata:JSON.stringify({runId:RUN,surface:'web',status:'success',importRunId:RUN,externalSampleId:r.id,externalPromptId:r.promptId,repeat:r.repeat,conversationUrl:r.url,sourceMode:r.mode,sourceAuth:r.auth,originalSubmittedAt:r.submittedAt||null,capturedAt:r.capturedAt,answerSha256:r.answerSha256,sourcesCoverage:'not_exported',promptGroup:r.promptId<='Q06'?'category':'brand',importedAt:new Date().toISOString()})
      }));
      if(values.length) await clickhouse.insert({table:'analytics.prompt_responses',values,format:'JSONEachRow'});
      console.log(JSON.stringify({operation,received:samples.length,inserted:values.length,skipped:samples.length-values.length,newPrompts:newPrompts.length}));
    }
    const counts=await query('SELECT model_provider,count() AS total,uniqExact(id) AS unique_ids FROM analytics.prompt_responses FINAL WHERE workspace_id={workspaceId:String} AND run_id={runId:String} GROUP BY model_provider ORDER BY model_provider');
    const imported=await query('SELECT id,response,collection_metadata FROM analytics.prompt_responses FINAL WHERE workspace_id={workspaceId:String} AND run_id={runId:String}');
    for (const row of imported) {
      const m=JSON.parse(row.collection_metadata);
      if (m.importRunId!==RUN || row.id!==responseId({id:m.externalSampleId}) || hash(row.response)!==m.answerSha256) throw Error('Imported evidence verification failed');
    }
    if(operation==='enqueue') {
      for(const [p,n] of Object.entries(COUNTS)) if(Number(counts.find(r=>r.model_provider===p)?.total)!==n) throw Error('Expected all 847 responses before analysis');
      const {enqueueAnalysisRun,getAnalysisQueue}=await import('/app/node_modules/@oneglanse/services/dist/analysis/queue.js');
      for(const provider of Object.keys(COUNTS)) await enqueueAnalysisRun({jobGroupId:RUN,workspaceId:WORKSPACE,userId,provider,surface:'web',batch:1});
    }
    if (operation==='diagnose') {
      const {analysePromptsForWorkspace}=await import('/app/node_modules/@oneglanse/services/dist/analysis/analysePromptsForWorkspace.js');
      const originalError=console.error;
      console.error=()=>{};
      let result;
      try { result=await analysePromptsForWorkspace({workspaceId:WORKSPACE,runId:RUN,modelProvider:'kimi',batchSize:1}); }
      finally { console.error=originalError; }
      console.log(JSON.stringify({diagnostic:{analysed:result.analysedCount,failed:result.failedCount,errors:result.errors.map(e=>e.error.replace(/https?:\/\/\S+/g,'[endpoint]').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,1500))}}));
    }
    if (operation==='inspect' || operation==='enqueue') {
      const {getAnalysisQueue,buildAnalysisJobId}=await import('/app/node_modules/@oneglanse/services/dist/analysis/queue.js');
      const queue=getAnalysisQueue();
      const jobs=[];
      for (const provider of Object.keys(COUNTS)) {
        const job=await queue.getJob(buildAnalysisJobId({jobGroupId:RUN,surface:'web',provider,batch:1}));
        jobs.push({provider,state:job?await job.getState():'absent',attempts:job?.attemptsMade||0,failure:job?.failedReason?.replace(/https?:\/\/\S+/g,'[endpoint]').slice(0,800)||null});
      }
      await queue.close();
      const dates=await query('SELECT min(prompt_run_at) AS first_run,max(prompt_run_at) AS last_run,uniqExact(prompt) AS questions FROM analytics.prompt_responses FINAL WHERE workspace_id={workspaceId:String} AND run_id={runId:String}');
      console.log(JSON.stringify({jobs,collection:dates[0]}));
    }
    const analysed=await query('SELECT countDistinct(response_id) AS total FROM analytics.prompt_analysis WHERE workspace_id={workspaceId:String} AND response_id IN (SELECT id FROM analytics.prompt_responses WHERE workspace_id={workspaceId:String} AND run_id={runId:String})');
    console.log(JSON.stringify({workspace:ws.name,operation,existingWorkspaceResponses:Number(before[0].total),importedByProvider:counts,verifiedHashes:imported.length,analysed:Number(analysed[0].total)}));
  } finally { await lock.query('SELECT pg_advisory_unlock(hashtext($1))',[RUN]);lock.release();await pool.end();await clickhouse.close(); }
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1);});
