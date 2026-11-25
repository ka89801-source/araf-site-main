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
  test('double activation starts one welcome sequence, reduced motion = '+reduced,async()=>{
    let gate,finish,messages=0,focus=0,flight=0;
    const rect=()=>({top:50,left:70,width:40});
    const header={getBoundingClientRect:rect,animate(){flight++}};
    const app={inert:true,removeAttribute(){},querySelector:()=>header};
    gate={inert:false,classList:{add(){}},remove:()=>{gate=null},animate:()=>({finished:new Promise(resolve=>{finish=resolve})})};
    const ids={app,gMark:{style:{},getBoundingClientRect:rect},dock:{classList:{add(){}}},'chat-title':{focus(){focus++}}};
    const enter=vm.runInNewContext('('+js.slice(js.indexOf('function enterChat()'),js.indexOf('function initGate()'))+')',{
      reduced:{matches:reduced},byId:id=>id==='gate'?gate:ids[id],openConversation(){messages++}
    });
    enter();enter();
    assert.equal(messages,1);assert.equal(app.inert,false);assert.equal(focus,1);
    assert.equal(flight,reduced?0:1);
    if(finish) { finish();await new Promise(setImmediate); }
    assert.equal(gate,null);enter();assert.equal(messages,1);
  });
}

for (const mode of ['sequence','skip','reduce','switch']) {
  test('welcome order and composer timing: '+mode,()=>{
    const messages=[], events=new Map(), queue=new Map();
    let nextId=0,unlocked=0;
    const control={hidden:true,addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
    const reduced={matches:mode==='reduce',...control};
    const classes={add(){},remove(){}};
    const part={append(){},replaceChildren(){},getBoundingClientRect(){return {top:0,left:0}}};
    const ctx={reduced,byId:k=>k==='skip-welcome'?control:{classList:classes},
      log:{classList:classes},document:{activeElement:null},entry:{focus(){}},keepInView(){},
      element:()=>({style:{setProperty(){}}}),message(text){messages.push(text);return {querySelector:()=>part}},
      setComposer(){unlocked++},setTimeout(f){queue.set(++nextId,f);return nextId},clearTimeout:k=>queue.delete(k)};
    vm.runInNewContext(js.slice(js.indexOf('const welcomeMessages'),js.indexOf('function enterChat()'))+'openConversation()',ctx);
    function tick(){const [key,fn]=queue.entries().next().value;queue.delete(key);fn()}
    if(mode!=='reduce'){
      assert.equal(unlocked,0);tick();assert.equal(messages.length,1);
      if(mode==='skip')events.get('click')();
      if(mode==='switch'){reduced.matches=true;events.get('change')()}
      if(mode==='sequence'){tick();assert.equal(messages.length,2);assert.equal(unlocked,0);tick();assert.equal(messages.length,3);assert.equal(unlocked,0)}
    }
    while(queue.size)tick();
    assert.match(messages[0],/أهلًا بك/);assert.match(messages[1],/محامٍ/);assert.match(messages[2],/أساعدك اليوم/);
    assert.equal(messages.length,3);assert.equal(unlocked,1);assert.equal(control.hidden,true);
  });
}
