// Compact Codex output is expanded to the existing dashboard analysis contract.
// Raw answer text remains the sole evidence; no network or model calls here.
import {createHash} from 'node:crypto';
export const CODEX_METHOD='codex-local-evidence-v1';
export const digest=s=>createHash('sha256').update(s).digest('hex');
const recommendationScores={top_pick:100,strong_alternative:80,conditional:60,mentioned_only:30,discouraged:10};
const fail=message=>{throw Error(message);};
const score=x=>Number.isInteger(x)&&x>=0&&x<=100;
const rank=x=>x===null||(Number.isInteger(x)&&x>=1);
const quote=(q,answer)=>typeof q==='string'&&q.trim().length>0&&answer.includes(q);
export function normalizeCodexResult(result,source) {
  if(result.id!==source.id||!Array.isArray(result.competitors)) fail('Sample identity/competitors mismatch');
  const answer=source.answer;
  const seen=new Set();
  const competitors=result.competitors.map(c=>{
    if(typeof c.name!=='string'||!c.name.trim()||c.name.includes('梦莱星')||seen.has(c.name.toLowerCase())) fail('Invalid or duplicate competitor');
    seen.add(c.name.toLowerCase());
    if(!quote(c.evidence,answer)||!score(c.visibility)||!score(c.sentiment)||!rank(c.rankPosition)||typeof c.isRecommended!=='boolean') fail('Unsupported competitor evidence or metric');
    if(c.domain!==null&&(typeof c.domain!=='string'||!answer.toLowerCase().includes(c.domain.toLowerCase())||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(c.domain))) fail('Unsupported competitor domain');
    const {evidence,...rest}=c;return {...rest,domain:rest.domain||''};
  });
  const base={geoScore:{overall:0},presence:{mentioned:false,visibility:0},position:{rankPosition:null},sentiment:{score:0},recommendation:{type:'not_mentioned'},competitors,perception:{coreClaims:[],differentiators:[],bestKnownFor:null,pricingPerception:'not_mentioned'},risks:{items:[]}};
  const t=result.target;
  if(t===null)return base;
  if(!t||!quote(t.evidence,answer)||!score(t.visibility)||t.visibility<1||!score(t.sentiment)||!rank(t.rankPosition)||!(t.recommendation in recommendationScores))fail('Unsupported target evidence or metric');
  if(!answer.includes('梦莱星'))fail('Target attribution requires literal brand evidence for this dataset');
  if(!Array.isArray(t.coreClaims)||!Array.isArray(t.differentiators)||[...t.coreClaims,...t.differentiators].some(x=>typeof x!=='string')||t.coreClaims.length>5||t.differentiators.length>5)fail('Invalid perception claims');
  if(t.bestKnownFor!==null&&typeof t.bestKnownFor!=='string')fail('Invalid bestKnownFor');
  if(!['premium','mid_range','budget','free','not_mentioned'].includes(t.pricingPerception))fail('Invalid pricing perception');
  if(!Array.isArray(t.risks)||t.risks.some(r=>!['critical','warning','info'].includes(r.severity)||!quote(r.evidence,answer)))fail('Unsupported risk evidence');
  if(t.recommendation==='top_pick'&&t.rankPosition!==1)fail('Top pick requires absolute first rank');
  const rv=t.rankPosition===null?15:({1:100,2:80,3:65,4:50,5:40}[t.rankPosition]||30);
  let overall=Math.round((t.visibility+rv+t.sentiment+recommendationScores[t.recommendation])/4);
  if(t.sentiment<=20)overall=Math.min(overall,25);
  if(t.visibility<=15)overall=Math.min(overall,45);
  if(t.visibility<20)overall=Math.min(overall,40);
  if(t.recommendation==='discouraged')overall=Math.min(overall,30);
  if(t.recommendation==='mentioned_only')overall=Math.min(overall,35);
  return {...base,geoScore:{overall},presence:{mentioned:true,visibility:t.visibility},position:{rankPosition:t.rankPosition},sentiment:{score:t.sentiment},recommendation:{type:t.recommendation},perception:{coreClaims:t.coreClaims,differentiators:t.differentiators,bestKnownFor:t.bestKnownFor,pricingPerception:t.pricingPerception},risks:{items:t.risks.map(({severity})=>({severity}))}};
}
