import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCodexResult} from './menglai-codex-contract.mjs';
const source={id:'test',answer:'梦莱星资料不足，建议谨慎购买。另一款产品是火火兔。'};
const target={visibility:30,rankPosition:null,sentiment:20,recommendation:'discouraged',coreClaims:['资料不足'],differentiators:[],bestKnownFor:null,pricingPerception:'not_mentioned',risks:[],evidence:'梦莱星资料不足，建议谨慎购买。'};
test('absent target keeps competitors and zero target metrics',()=>{
 const r=normalizeCodexResult({id:'test',target:null,competitors:[{name:'火火兔',domain:null,visibility:10,sentiment:50,rankPosition:null,isRecommended:false,evidence:'另一款产品是火火兔。'}]},source);
 assert.equal(r.presence.mentioned,false);assert.equal(r.sentiment.score,0);assert.equal(r.competitors.length,1);
});
test('cautious answer is scored by formula and discouragement caps',()=>{
 const r=normalizeCodexResult({id:'test',target,competitors:[]},source);assert.equal(r.geoScore.overall,19);assert.equal(r.recommendation.type,'discouraged');
});
test('reject fabricated quote, competitor domain, and sample mismatch',()=>{
 assert.throws(()=>normalizeCodexResult({id:'test',target:{...target,evidence:'非常好'},competitors:[]},source));
 assert.throws(()=>normalizeCodexResult({id:'test',target:null,competitors:[{name:'火火兔',domain:'invented.example',visibility:10,sentiment:50,rankPosition:null,isRecommended:false,evidence:'火火兔'}]},source));
 assert.throws(()=>normalizeCodexResult({id:'another',target:null,competitors:[]},source));
});
test('top pick cannot claim a lower absolute rank',()=>{
 assert.throws(()=>normalizeCodexResult({id:'test',target:{...target,recommendation:'top_pick',rankPosition:4},competitors:[]},source));
});
