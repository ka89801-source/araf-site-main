'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/free-ask.js');

async function run(t, body, replies) {
  const calls = [], events = [];
  const old = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'local-test';
  t.after(() => {
    if (old === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = old;
  });
  t.mock.method(globalThis,'fetch',async (_url,options) => {
    calls.push(JSON.parse(options.body));
    const reply = replies[calls.length - 1];
    assert.ok(reply, 'unexpected provider call');
    return Response.json({status:'completed',output_text:JSON.stringify(reply)});
  });
  const req = {method:'POST',headers:{accept:'application/x-ndjson'},body};
  const res = {setHeader(){},write(line){this.headersSent=true;events.push(JSON.parse(line));},end(){}};
  await handler(req,res);
  return {calls,events,result:events.at(-1)};
}

for (const [name,body] of Object.entries({
  initial:{query:'كيف حالك؟',interactive:true},
  noninteractive:{query:'ما اسمك؟'},
  atLimit:{query:'ما حقوقي؟',interactive:true,turns:Array.from({length:36},()=>({kind:'followup',question:'أخبرني بنكتة',answer:''}))},
  awaitingClarification:{query:'مستحقاتي',interactive:true,turns:[{kind:'clarification',question:'كم سنة عملت؟',answer:'ما أفضل مطعم؟'}]}
})) {
  test('conversational decision bypasses research: '+name,async t => {
    const {calls,events,result} = await run(t,body,[{action:'conversation',reply:'أنا مساعد أعراف القانوني.'}]);
    assert.equal(result.kind,'conversation');
    assert.deepEqual(events.filter(e=>e.event==='stage').map(e=>e.stage),['understand']);
    assert.equal(calls.length,1); assert.equal(calls[0].tools,undefined);
  });
}
test('a short case answer reaches the planner with its question, without an echo',async t=>{
  const turn={kind:'clarification',question:'كم سنة عملت؟',answer:'عشر سنوات'};
  const {calls,result} = await run(t,{query:'مستحقاتي',turns:[turn],interactive:true},
    [{action:'ask',question:'كيف انتهى العقد؟',topic:'ending',acknowledgment:'عشر سنوات',choices:[]}]);
  const input=JSON.parse(calls[0].input);
  assert.equal(input.latest,turn.answer); assert.equal(input.conversation[0].question,turn.question);
  assert.equal(result.kind,'clarification'); assert.equal(result.acknowledgment,undefined);
  assert.equal(calls.length,1);
});
test('a revised earlier fact is the current message and keeps the intervening history',async t=>{
  const turns=[{kind:'clarification',question:'كم سنة؟',answer:'اثنتان'},{kind:'clarification',question:'كيف انتهى العقد؟',answer:'بإشعار'}];
  const {calls}=await run(t,{query:'استقلت',turns,revision:'اثنتان',revisionIndex:0,interactive:true},
    [{action:'ask',question:'من أرسل الإشعار؟',topic:'sender'}]);
  const input=JSON.parse(calls[0].input);
  assert.equal(input.latest,'اثنتان');assert.equal(input.revised_turn_index,0);assert.equal(input.conversation.length,2);
});
