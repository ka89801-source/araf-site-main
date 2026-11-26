'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {readFileSync} = require('node:fs');
const source = readFileSync(require.resolve('../free-assistant.js'),'utf8');
const viewportSetup = source.slice(source.indexOf('const viewport = window.visualViewport;'),source.lastIndexOf('initGate();'));

test('keyboard pan and resize share one frame, without moving the reader',()=>{
  const props = new Map();
  const viewport = Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1});
  const window = Object.assign(new EventTarget(),{visualViewport:viewport});
  const scroll = {clientHeight:600,scrollHeight:2500,scrollTop:320};
  let frame, resize, frameCount=0;
  const ctx = {window,scroll,follow:false,document:{documentElement:{style:{setProperty:(k,v)=>props.set(k,v)}}},
    byId:()=>({offsetHeight:60}),requestAnimationFrame(cb){frame=cb;return ++frameCount},
    ResizeObserver:class {constructor(cb){resize=cb} observe(){}}
  };
  vm.runInNewContext(viewportSetup,ctx);
  for(let i=0;i<5;i++){
    for(const open of [true,false]){
      viewport.height=open?534:844;viewport.offsetTop=open?94:0;
      const before=frameCount;
      viewport.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('scroll'));
      assert.equal(frameCount,before+1);frame();
      assert.equal(props.get('--app-top'),viewport.offsetTop+'px');
      assert.equal(props.get('--app-h'),viewport.height+'px');
      scroll.clientHeight=open?390:600;resize();
      assert.equal(scroll.scrollTop,320);
    }
  }
  ctx.follow=true;scroll.clientHeight-=40;resize();
  assert.equal(scroll.scrollTop,scroll.scrollHeight);
  viewport.scale=2;viewport.height=270;viewport.dispatchEvent(new Event('resize'));frame();
  assert.equal(props.get('--app-h'),'844px');
});
