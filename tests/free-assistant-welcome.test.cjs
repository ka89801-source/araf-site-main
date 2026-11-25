'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const {load} = require('cheerio');
const html = readFileSync(require.resolve('../free-assistant.html'),'utf8');
const js = readFileSync(require.resolve('../free-assistant.js'),'utf8');

test('entry button is initially usable while the underlying conversation is inert',()=>{
  const $=load(html);
  assert.equal($('#gStart').text().trim(),'ابدأ محادثتك');
  assert.equal($('#gStart').is('[hidden],[disabled]'),false);
  assert.equal($('#app[inert] #composer[hidden]').length,1);
  assert.equal($('#gStage .g-li').length,6);
  assert.doesNotMatch(html+js,/DemoEngine|demoAnswer|\/api\/legal-ai|أكمل التحليل بالمفتاح/);
});

for(const reduced of [true,false]) {
  test('double activation opens one prompt and unlocks the composer, reduced motion = '+reduced,async()=>{
    let gate,finish,messages=0,focus=0,composer=false,flight=0;
    const rect=()=>({top:50,left:70,width:40});
    const header={getBoundingClientRect:rect,animate(){flight++}};
    const app={inert:true,removeAttribute(){},querySelector:()=>header};
    gate={inert:false,classList:{add(){}},remove:()=>{gate=null},animate:()=>({finished:new Promise(resolve=>{finish=resolve})})};
    const ids={app,gMark:{style:{},getBoundingClientRect:rect},dock:{classList:{add(){}}},'chat-title':{focus(){focus++}}};
    const enter=vm.runInNewContext('('+js.slice(js.indexOf('function enterChat()'),js.indexOf('function initGate()'))+')',{
      reduced:{matches:reduced},byId:id=>id==='gate'?gate:ids[id],message(){messages++},setComposer:v=>{composer=v}
    });
    enter();enter();
    assert.equal(messages,1);assert.equal(composer,true);assert.equal(app.inert,false);assert.equal(focus,1);
    assert.equal(flight,reduced?0:1);
    if(finish) { finish();await new Promise(setImmediate); }
    assert.equal(gate,null);enter();assert.equal(messages,1);
  });
}
