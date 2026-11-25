'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verifyLegalReferences, sourceURL, _test} = require('../api/_legal-verification');
const handler = require('../api/free-ask');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

const url = 'https://www.uqn.gov.sa/details?p=22';
const law = 'نظام اختباري';
const quote = 'هذا مقتطف طويل لاختبار آلية المطابقة ضمن حدود المادة المحددة';
const ref = {law, article:'١٢٠', quote, url};
const document = [law,'المادة العشرون بعد المائة:',quote,'المادة الحادية والعشرون بعد المائة:','مقتطف آخر.'].join('\n');
const domains = ['uqn.gov.sa'];
const source = {url, title:law};
function plain(text = document) { return new Response(text, {headers:{'content-type':'text/plain'}}); }
function verify(overrides = {}) {
  return verifyLegalReferences({answer:'بموجب المادة (۱۲۰)', references:[ref], sources:[source], domains,
    fetchImpl:async () => plain(), ...overrides});
}

test('matches the original article text with Arabic ordinal and digit variants',async()=>{
  const result = await verify();
  assert.equal(result.matched,1); assert.equal(result.needsReview,false);
  assert.equal(result.note,''); assert.match(result.sources[0].sourceType,/مطابقة نصية فقط/);
});
test('matching text elsewhere, under another law, or in an ambiguous or divided article stays excerpt_only',async()=>{
  for (const change of [{article:'121'},{article:'120/1'},{law:'نظام مختلف'}]) {
    assert.equal((await verify({references:[{...ref,...change}]})).findings[0].status,'excerpt_only');
  }
  for (const text of [document.replace('المادة العشرون بعد المائة:', 'في المادة 120 نجد ما يلي'),
    document+'\nالمادة 120:\nنص ثان', document.replace(quote,'المادة العشرون بعد المائة مكرر:\n'+quote)]) {
    assert.equal(_test.checkQuote(text,ref),'excerpt_only');
  }
});
test('fabricated, external and unreturned URLs never become sources or requests',async()=>{
  let calls=0;
  const result = await verify({references:[{...ref,url:url+'3'},{...ref,url:'https://example.net/fake'}],
    sources:[source,{url:'https://example.net/fake'}],fetchImpl:()=>{calls++;}});
  assert.equal(calls,0); assert.equal(result.sources.length,1);
  assert.ok(result.findings.every(f=>f.status==='missing_source' && f.url===null));
});
test('forbidden, oversized and unreadable documents are unavailable',async()=>{
  for (const fn of [()=>{throw Error('network')},()=>new Response(null,{status:403}),
    ()=>new Response('too big',{headers:{'Content-Length':3e6}}),
    ()=>new Response(new Uint8Array(2*1024*1024+1)),
    ()=>new Response('%PDF-invalid',{headers:{'content-type':'application/pdf'}})]) {
    assert.equal((await verify({fetchImpl:fn})).findings[0].status,'unavailable');
  }
});
test('a missing quotation and undeclared numbers are reported',async()=>{
  const result = await verify({references:[{...ref,quote:quote+' عبارة مضافة'}],
    answer:'المادتين (۱۲۰) و(١٢١)، والمادة الثانية والعشرون بعد المائة.'});
  assert.equal(result.findings[0].status,'unconfirmed');
  assert.deepEqual(result.missingArticles,['121','122']);
});
test('redirects, personal query strings and non-public DNS ranges are refused',async()=>{
  for (const location of ['https://127.0.0.1','http://uqn.gov.sa','https://user@uqn.gov.sa',
    'https://uqn.gov.sa.evil.example','https://uqn.gov.sa:8080','/search?q=private']) {
    let count=0;
    const result = await verify({fetchImpl:async()=>{count++; return new Response(null,{status:302,headers:{location}});}});
    assert.equal(count,1); assert.equal(result.findings[0].status,'unavailable');
  }
  for(const address of ['10.0.0.1','192.168.0.1','169.254.169.254','100.64.5.6','127.0.0.1','::ffff:127.0.0.1','224.0.0.1']) assert.equal(_test.publicIPv4(address),false);
  assert.equal(_test.publicIPv4('8.8.8.8'),true);
});
test('three simultaneous distinct GETs carry only the public URL, no client data or model request',async()=>{
  const urls=[url,url+'3',url+'4',url+'5'];
  const calls=[]; let release;
  const gate=new Promise(resolve=>{release=resolve});
  const promise=verify({answer:'Client private payload',references:[...urls,urls[0]].map(u=>({...ref,url:u})),
    sources:urls.map(url=>({url})),fetchImpl:async(u,options)=>{
      calls.push(u);
      assert.deepEqual(Object.keys(options.headers).sort(),['Accept','Accept-Encoding']);
      assert.equal(options.method,'GET'); assert.equal(options.body,undefined);
      await gate; return plain();
    }});
  try {assert.deepEqual(calls,urls.slice(0,3));} finally {release();}
  const result=await promise;
  assert.equal(result.matched,4); assert.equal(result.findings[3].status,'unavailable');
});
test('joins search and reference variants and checks legitimate redirected HTML',async()=>{
  const calls=[];
  const alternate=url.replace('details?', 'details/?utm_source=x&')+'#article';
  assert.equal(sourceURL(alternate,domains),url);
  const result=await verify({references:[{...ref,url:alternate}],fetchImpl:async u=>{
    calls.push(u);
    if(u===url) return new Response(null,{status:302,headers:{location:'/final'}});
    return new Response('<html><title>'+law+'</title><main><h3>المادة (120)</h3><p>'+quote+'</p></main></html>',{headers:{'content-type':'text/html'}});
  }});
  assert.equal(calls.length,2); assert.equal(result.matched,1);
});
test('caller deadline releases verification even if a transport never settles',async()=>{
  const aborter=new AbortController();
  const task=verify({signal:aborter.signal,fetchImpl:()=>new Promise(()=>{})});
  aborter.abort(); const r=await task;
  assert.equal(r.findings[0].status,'unavailable');
});

async function integration(t, returned) {
  const output = 'تفاصيل الواقعة والخطوة العملية.\n\n## الاحتمالات\n\nيعتمد تطبيق المادة (77) على ثبوت الوقائع.';
  const original=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='test';
  t.after(()=>{if(original===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=original;});
  const calls=[], events=[];
  const link='https://www.uqn.gov.sa/search?private=1';
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    const req=JSON.parse(options.body); calls.push(req);
    const parsed=calls.length===1 ? {action:'answer'} : {answer:output,source_urls:[link+'#other',link,'https://evil.example/'],
      legal_references:[{...ref,url:link}]};
    return Response.json({status:'completed',output_text:JSON.stringify(parsed),output:returned ?
      [{type:'web_search_call',action:{sources:[{url:link,title:law}]}}]:[]});
  });
  await handler({method:'POST',headers:{accept:'application/x-ndjson'},body:{query:'مسألة تعاقدية'}},
    {setHeader(){},write(line){this.headersSent=true;events.push(JSON.parse(line));},end(){}});
  const result=events.at(-1);
  assert.equal(calls.length,2);
  assert.ok(calls[1].text.format.schema.required.includes('legal_references'));
  assert.equal(result.kind,'answer');assert.equal(result.verification.needsReview,true);
  assert.match(result.content,/تفاصيل الواقعة/);assert.match(result.content,/<h2>الاحتمالات<\/h2>/);
  assert.equal(result.content.split('ملاحظة توثيقية').length,2);
  assert.doesNotMatch(result.content,/https?:|missing_source|excerpt_only|unavailable/);
  return result;
}
test('incomplete verification preserves the whole report and lists each returned URL once',async t=>{
  const result=await integration(t,true);
  assert.equal(result.sources.length,1); assert.equal(result.verification.findings[0].status,'unavailable');
});
test('no official evidence yields a conditional, complete report',async t=>{
  const result=await integration(t,false);
  assert.equal(result.sources.length,0);assert.match(result.type,/مشروط/);
  assert.equal(result.verification.findings[0].status,'missing_source');
});
test('report formatting removes repeated inline Markdown and raw links before rendering and copying',()=>{
  const src=readFileSync(require.resolve('../free-assistant.js'),'utf8');
  const format=vm.runInNewContext('('+src.slice(src.indexOf('function reportText('),src.indexOf('function report(data)'))+')');
  assert.equal(format('<p>نص ([نظام]('+url+')) '+url+'</p>').trim(),'<p>نص  </p>');
});

test('early official search results share reads with final verification and enforce the same three-document cap',async()=>{
  const {createSourceReader}=require('../api/_legal-verification');
  const urls=[url,url+'3',url+'4',url+'5'], calls=[];
  const reader=createSourceReader(domains,async u=>{calls.push(u);return plain()});
  reader.prefetch(['https://outside.example/law',urls[0]]);
  reader.prefetch([urls[1]]);
  const result=await verify({reader,references:urls.map(u=>({...ref,url:u})),sources:urls.map(url=>({url}))});
  assert.deepEqual(calls,urls.slice(0,3));assert.equal(result.matched,3);assert.equal(result.findings[3].status,'unavailable');
});
test('distinguishes an article from a repeated-number amendment',()=>{
  assert.deepEqual(_test.articleNumbers('المادة (٧٩) مكرر والمادة ٧٩'),['79 مكرر','79']);
  assert.equal(_test.checkQuote(document.replace('العشرون بعد المائة:', '(120) مكرر:'),ref),'excerpt_only');
});
test('streamed answer survives split UTF-8 packets and yields the same report contract',async t=>{
  const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
  t.after(()=>{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;});
  let calls=0;
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    if (++calls===1) return Response.json({status:'completed', output_text:'{"action":"answer"}'});
    assert.equal(JSON.parse(options.body).stream,true);
    const item={type:'web_search_call',status:'completed',action:{type:'search',sources:[]}};
    const completed={status:'completed',output:[item],output_text:JSON.stringify({answer:'يبقى التحليل متاحًا.',source_urls:[],legal_references:[]})};
    const bytes=Buffer.from([{type:'response.output_item.done',item},{type:'response.completed',response:completed}]
      .map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join(''));
    return new Response(new ReadableStream({start(controller){
      for(let i=0;i<bytes.length;i+=7) controller.enqueue(bytes.subarray(i,i+7));
      controller.close();
    }}),{headers:{'Content-Type':'text/event-stream'}});
  });
  const events=[];
  await handler({method:'POST',headers:{accept:'application/x-ndjson'},body:{query:'موضوع قانوني'}},
    {setHeader(){},write(line){this.headersSent=true;events.push(JSON.parse(line));},end(){}});
  assert.equal(calls,2);assert.equal(events.at(-1).kind,'answer');assert.match(events.at(-1).content,/يبقى التحليل/);
});
