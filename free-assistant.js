'use strict';

const byId = id => document.getElementById(id);
const log = byId('log'), scroll = byId('scroll'), entry = byId('entry');
const modelTags = new Set(['div','p','br','strong','b','em','ul','ol','li','h2','h3','span']);
const activities = {
  understand: 'أراجع وصفك وما ورد في المحادثة…',
  search: 'أُعدّ الإجابة مع طلب البحث في المصادر الرسمية…',
  analyze: 'أُعدّ التحليل القانوني لمسألتك…',
  verify: 'أطابق الأسانيد مع النصوص الرسمية المتاحة…'
};
let narrative = '', turns = [], pending = null, previousAnswer = '';
let activeRequest = null, follow = true, draft = null, documentText = '', reading = 0;
let fileVersion = 0, returnFocus = false, editing = null;
const recentChat = [];
const reduced = matchMedia('(prefers-reduced-motion:reduce)');
function safeUrl(value) {
  try {
    const url = new URL(value);
    if (['https:', 'http:'].includes(url.protocol)) return url.href;
  } catch { /* A source may have a title only. */ }
  return '';
}

function externalLink(url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

// Build a new document fragment from inert markup. Only text, supported
// formatting, and validated source links cross into the live document.
function formatNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
  const tag = node.localName;
  const fragment = document.createDocumentFragment();
  if (!tag || ['script', 'style', 'template', 'svg', 'math', 'noscript'].includes(tag)) return fragment;
  let result = fragment;
  if (tag === 'a') {
    const href = safeUrl(node.getAttribute('href'));
    if (href) result = externalLink(href);
  } else if (modelTags.has(tag)) {
    result = document.createElement(tag);
  }
  for (const child of node.childNodes) result.append(formatNode(child));
  return result;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function readResult(response, request) {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson')) {
    const data = await response.json().catch(() => null);
    if (data?.error) throw new Error(data.error + (data.requestId ? ' · مرجع ' + data.requestId : ''));
    if (!response.ok || !data) throw new Error('تعذّر الوصول إلى الخدمة (HTTP ' + response.status + ').');
    return data;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const {value,done} = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value,{stream:true});
      const lines = buffer.split('\n');
      buffer = lines.pop();
      if (done && buffer.trim()) lines.push(buffer);
      for (const line of lines) {
        if (!line.trim()) continue;
        const item = JSON.parse(line);
        if (item.event === 'result') return item;
        if (item.event === 'error') throw new Error(item.error + ' · مرجع ' + item.requestId);
        if (request === activeRequest && item.event === 'stage' && activities[item.stage])
          showActivity(item.stage);
      }
      if (done) throw new Error('انقطع الاتصال قبل اكتمال الإجابة. يمكنك إعادة إرسال نفس الطلب.');
    }
  } finally { reader.releaseLock(); }
}


function keepInView(node) {
  if (!follow) { byId('latest').hidden = false; return; }
  requestAnimationFrame(() => {
    if (!follow) return;
    if (node && node.offsetHeight > scroll.clientHeight * .66) {
      scroll.scrollTop += node.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 12;
    } else scroll.scrollTop = scroll.scrollHeight;
  });
}

scroll.addEventListener('scroll', () => {
  byId('top').classList.toggle('scrolled', scroll.scrollTop > 4);
  follow = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 70;
  byId('latest').hidden = follow;
}, {passive:true});
byId('latest').onclick = () => { follow = true; keepInView(); };

function message(text, role = 'assistant', style = '') {
  const me = role === 'user';
  const side = me ? 'me' : 'ai';
  const previous = log.lastElementChild;
  const grouped = previous?.classList.contains(side);
  if (grouped) previous.classList.remove('last');
  const row = element('div', '', 'message row enter last ' + role + ' ' + side + (grouped ? ' ' : ' first ') + style);
  row.append(element('span', me ? 'أنت' : 'مساعد أعراف','sr'));
  if (!me) {
    const avatar = element('span','','av');
    const mark = element('img');
    mark.src = 'free-assistant-mark.png'; mark.alt = '';
    avatar.append(mark); row.append(avatar);
  }
  const bubble = element(me ? 'button' : 'div','','bubble' + (me ? '' : ' morph'));
  const value = element('span','','value');
  value.textContent = text;
  bubble.append(value); row.append(bubble);
  log.append(row);
  return row;
}

function button(text, action) {
  const node = element('button', text);
  node.type = 'button';
  node.onclick = action;
  return node;
}

function setComposer(visible) {
  byId('composer').hidden = !visible;
  byId('actions').hidden = !visible || !pending?.choices?.length || !!editing;
  byId('send').disabled = !entry.value.trim();
  byId('attach').hidden = !narrative;
  byId('consent').hidden = !!narrative;
  entry.maxLength = !narrative ? 8000 : 6000;
  entry.placeholder = pending ? 'أجب بما تعرفه، أو اكتب «لا أعرف»…' :
    narrative ? 'تابع بسؤال أو أضف توضيحًا…' : 'اكتب مسألتك بطريقتك…';
  if (visible && returnFocus && matchMedia('(pointer:fine)').matches &&
      [document.body,entry].includes(document.activeElement)) entry.focus({preventScroll:true});
}

const welcomeMessages = [
  ['أهلًا بك في أعراف، يسعدني وجودك معنا.', 'greeting'],
  ['وإذا احتجت إلى محامٍ يتولى قضيتك أو يتابع إجراءاتها، يمكنك طلب التواصل مع أحد المحامين المختصين عبر أعراف.', 'trust'],
  ['والآن، أخبرني كيف أقدر أساعدك اليوم؟', 'prompt']
];

function openConversation() {
  const skip = byId('skip-welcome');
  const dock = byId('dock');
  let index = 0;
  let timer;
  let previousAvatar;
  let finished = false;

  function append(animate) {
    const [text, style] = welcomeMessages[index++];
    const from = previousAvatar?.getBoundingClientRect();
    const row = message(text, 'assistant', 'welcome-message ' + style);
    previousAvatar = row.querySelector('.av');
    if (animate) {
      // These three lines are local welcome copy. Server answers render immediately.
      const value = row.querySelector('.value');
      value.replaceChildren();
      for (const [i,word] of text.split(' ').entries()) {
        if (i) value.append(' ');
        const token = element('span',word,'welcome-word');
        token.style.setProperty('--word',i);
        value.append(token);
      }
      if (from && previousAvatar.animate) {
        const to = previousAvatar.getBoundingClientRect();
        previousAvatar.animate([
          {transform:'translate(' + (from.left-to.left) + 'px,' + (from.top-to.top) + 'px)'},
          {transform:'none'}
        ], {duration:330,easing:'cubic-bezier(.25,.9,.3,1)'});
      }
    }
    keepInView();
    return text.split(' ').length;
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    const focusEntry = document.activeElement === skip;
    skip.hidden = true;
    skip.removeEventListener('click',fastForward);
    reduced.removeEventListener('change',onMotionChange);
    dock.classList.remove('welcome-line');
    setComposer(true);
    dock.classList.add('appear');
    if (focusEntry) entry.focus({preventScroll:true});
    keepInView();
  }
  function fastForward() {
    if (finished) return;
    clearTimeout(timer);
    log.classList.add('welcome-instant');
    while (index < welcomeMessages.length) append(false);
    finish();
  }
  function onMotionChange() {
    if (reduced.matches) fastForward();
  }
  function next() {
    const count = append(true);
    if (index < welcomeMessages.length) {
      timer = setTimeout(next, 540 + count * 34);
    } else {
      timer = setTimeout(() => {
        dock.classList.add('welcome-line');
        timer = setTimeout(finish,220);
      }, 240 + count * 34);
    }
  }
  if (reduced.matches) { fastForward(); return; }
  skip.hidden = false;
  skip.addEventListener('click',fastForward);
  reduced.addEventListener('change',onMotionChange);
  // Let the outgoing gate uncover the first bubble before its reveal starts.
  timer = setTimeout(next,220);
}

function enterChat() {
  const gate = byId('gate');
  if (!gate || gate.inert) return;
  gate.inert = true;
  const app = byId('app');
  app.inert = false;
  app.removeAttribute('aria-hidden');
  const headerMark = app.querySelector('.brand-mark');
  const start = byId('gMark').getBoundingClientRect();
  const end = headerMark.getBoundingClientRect();

  openConversation();
  byId('chat-title').focus({preventScroll:true});

  if (reduced.matches || !gate.animate || !end.width) {
    gate.remove();
    return;
  }
  // Animate the real header mark from the terrace to its resting place.
  byId('gMark').style.visibility = 'hidden';
  gate.classList.add('leave');
  headerMark.animate([
    {transform:'translate(' + (start.left-end.left) + 'px,' + (start.top-end.top) +
      'px) scale(' + start.width/end.width + ')'},
    {transform:'none'}
  ], {duration:440,easing:'cubic-bezier(.25,.9,.3,1)'});
  const exit = gate.animate([{opacity:1},{opacity:0}],{duration:230,easing:'ease-out'});
  exit.finished.catch(() => {}).then(() => gate.remove());
}

function initGate() {
  const gate = byId('gate');
  const stage = byId('gStage');
  byId('gStart').addEventListener('click',enterChat);
  gate.addEventListener('keydown',event => {
    if (event.key === 'Enter' && event.target === gate) enterChat();
  });
  const reset = () => {
    stage.style.removeProperty('--dx');
    stage.style.removeProperty('--dy');
  };
  stage.addEventListener('pointermove',event => {
    if (reduced.matches || event.pointerType === 'touch') return;
    const box = stage.getBoundingClientRect();
    stage.style.setProperty('--dx',((event.clientX - box.left)/box.width - .5)*2 + 'px');
    stage.style.setProperty('--dy',((event.clientY - box.top)/box.height - .5)*1.2 + 'px');
  });
  stage.addEventListener('pointerleave',reset);
  if (location.hash === '#chat') enterChat();
  else gate.focus({preventScroll:true});
}

function showQuestion(data) {
  if (!data.question?.trim()) throw new Error('وصل استيضاح غير مكتمل. أعد المحاولة.');
  pending = data;
  const row = message(data.question);
  if (data.reason) row.querySelector('.bubble').append(element('span',data.reason,'hint fadein'));
  byId('choices').replaceChildren();
  for (const [i,choice] of (data.choices || []).entries()) {
    const chip = button(choice,() => { entry.value = choice; send(chip.getBoundingClientRect()); });
    chip.className = 'chip';
    chip.style.setProperty('--i',i);
    byId('choices').append(chip);
  }
  return row;
}

// A retrieved official URL is evidence of a search result. Its presence alone
// cannot establish that it supports an individual sentence in the answer.
function reportText(content) {
  return content.replace(/\(\s*\[(?:[^\]\n]+)\]\(https?:\/\/[^\s<>)]+\)\s*\)/gi, '')
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^\s<>)]+\)/gi, '$1')
    .replace(/https?:\/\/[^\s<>"،؛）)]+/gi, '');
}

function report(data) {
  if (!data.content?.trim()) throw new Error('لم تصل إجابة قابلة للعرض. أعد المحاولة.');
  const template = document.createElement('template');
  template.innerHTML = reportText(data.content);
  const root = template.content.querySelector('.legal-answer') || template.content;
  const blocks = [...root.childNodes].filter(n => n.textContent.trim());
  if (!blocks.length) throw new Error('لم تصل إجابة قابلة للعرض.');
  const row = element('article','','report answer');
  row.setAttribute('aria-label','تقرير الاستشارة القانونية');
  const summary = element('header','','ans-sum');
  summary.append(element('div','الخلاصة القانونية','ans-k'),element('h2',data.type || 'الاستشارة القانونية'));
  const body = element('div','','report-body');
  row.append(summary,body);
  // Unwrap the server's section containers while preserving paragraph and list boundaries.
  let hasLead = false;
  const paragraphs = [];
  for (const block of blocks) {
    const children = block.matches?.('.section') ? [...block.childNodes] : [block];
    for (const child of children) {
      if (!child.textContent.trim()) continue;
      const heading = child.matches?.('h2,h3');
      const node = heading ? element('h3',child.textContent) : formatNode(child);
      const target = hasLead ? body : summary;
      target.append(node);
      for (const br of child.querySelectorAll?.('br') || []) br.replaceWith('\n');
      paragraphs.push(child.matches?.('ol,ul') ? [...child.children].map((li,i) =>
        (child.matches('ol') ? (i+1)+'. ' : '• ') + li.textContent.trim()).join('\n') : child.textContent.trim());
      if (!heading) hasLead = true;
    }
  }
  previousAnswer = paragraphs.join('\n\n');
  const sources = (data.sources || []).filter(source => source && safeUrl(source.url));
  if (sources.length) {
    const list = element('section','','sources');
    list.append(element('h3','مصادر البحث الرسمية'));
    body.append(list);
    for (const source of sources) {
      const a = externalLink(safeUrl(source.url));
      a.className = 'src';
      const label = element('span');
      label.append(element('b',source.title || new URL(a.href).hostname),element('small',[new URL(a.href).hostname,source.sourceType].filter(Boolean).join(' · ')));
      a.append(label,element('span','↗')); list.append(a);
    }
  }
  const tools = element('div','','ans-foot');
  tools.append(element('small','إجابة آلية لم يراجعها محامٍ'));
  const copyText = [data.type || 'الاستشارة القانونية',previousAnswer,...sources.map(s=>[s.title,s.sourceType,s.url].filter(Boolean).join(' '))].join('\n');
  tools.append(button('نسخ الإجابة',async () => {
    try { await navigator.clipboard.writeText(copyText); notice('تم نسخ الإجابة.'); }
    catch { notice('تعذّر النسخ. يمكنك تحديد نص الإجابة ونسخه.'); }
  }),button('طباعة',()=>{ row.classList.add('printing'); window.print(); }));
  row.append(tools);
  const handoff = element('aside','','handoff lawyer');
  const invitation = element('div');
  const link = element('a','طلب محامٍ مختص','btn btn-dark');
  link.href = 'cases.html';
  invitation.append(element('h3','هل تحتاج إلى محامٍ يتولى قضيتك؟'),
    element('p','يمكنك إرسال طلبك عبر أعراف ليطّلع عليه محامٍ مختص.'));
  handoff.append(invitation,link);
  log.querySelector('.handoff')?.remove();
  log.append(row,handoff);
  return row;
}

function showActivity(stage) {
  const analyzing = ['search','analyze','verify'].includes(stage);
  byId('typing').hidden = analyzing;
  byId('work-card').hidden = !analyzing;
  const status = byId('activity');
  status.classList.toggle('sr',!analyzing);
  (analyzing ? byId('work-card') : byId('working')).append(status);
  status.textContent = activities[stage] || 'جارٍ إرسال رسالتك…';
}

async function analyze() {
  if (activeRequest || !draft) return;
  setComposer(false);
  notice('');
  byId('failure').hidden = true;
  showActivity('send');
  byId('working').hidden = false;
  keepInView();
  const request = new AbortController();
  activeRequest = request;
  const timer = setTimeout(()=>request.abort(),135000);
  try {
    const response = await fetch('/api/free-ask',{method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},
      body:JSON.stringify(draft.payload),signal:request.signal});
    const data = await readResult(response,request);
    let row;
    if (data.kind === 'conversation' && data.text?.trim()) {
      recentChat.push({user:draft.text.slice(0,500),reply:data.text.slice(0,500)});
      if (recentChat.length > 4) recentChat.shift();
      if (draft.record) {
        // An unrelated edit is a side conversation, not a replacement legal fact.
        message(draft.text,'user').querySelector('.bubble').disabled = true;
      } else draft.row.querySelector('.bubble').disabled = true;
      row = message(data.text);
    } else {
      if (data.kind === 'clarification') row = showQuestion(data);
      else if (data.kind === 'answer') { row = report(data); pending = null; }
      else throw new Error('تعذرت قراءة نوع رد المساعد. أعد المحاولة.');
      narrative = draft.payload.query;
      turns = draft.payload.turns;
      if (draft.record) {
        const record = draft.record;
        record.text = draft.text;
        record.row.querySelector('.value').textContent = draft.text;
        if (!record.row.querySelector('.edited')) record.row.querySelector('.bubble').append(element('small','معدّلة','edited'));
      } else makeEditable(draft.row,draft.text,draft.index);
    }
    draft = null;
    byId('working').hidden = true;
    if (turns.length < 36) setComposer(true);
    else notice('بلغت هذه الجلسة حدّ الرسائل. يمكنك نسخ الإجابة وبدء محادثة جديدة.');
    keepInView(row);
  } catch (error) {
    byId('error').textContent = request.signal.aborted ? 'انتهت مهلة الاتصال. يمكنك إعادة المحاولة.' :
      error instanceof TypeError ? 'تعذّر الاتصال بالخدمة. تحقق من اتصالك وأعد المحاولة.' : error.message;
    byId('failure').hidden = false;
    keepInView();
  } finally {
    clearTimeout(timer);
    activeRequest = null;
    byId('working').hidden = true;
  }
}

function makeEditable(row,text,index) {
  const record = {row,text,index};
  row.classList.add('editable');
  const edit = button('تعديل',()=>startEdit(record));
  edit.className = 'edit-act';
  const bubble = row.querySelector('.bubble');
  bubble.title = 'عرض خيار تعديل الرسالة';
  bubble.onclick = () => row.classList.toggle('show-edit');
  row.append(edit);
}

function send(origin) {
  if (activeRequest || draft || byId('composer').hidden) return;
  if (reading) return notice('يجري فتح الملف النصي. انتظر اكتمال قراءته.');
  const text = entry.value.trim();
  if (!text) { entry.focus(); return; }
  if (editing?.text === text) { closeEdit(); return; }
  const record = editing;
  const index = record ? record.index : narrative ? turns.length : -1;
  const next = turns.slice();
  const query = index === -1 ? text : narrative;
  if (record && index >= 0) {
    const prior = next[index];
    const field = prior.kind === 'followup' ? 'question' : 'answer';
    next[index] = {...prior,[field]:text};
  } else if (!record && index >= 0) {
    next.push(pending ? {kind:'clarification',question:pending.question,topic:pending.topic,answer:text} :
      {kind:'followup',question:text,answer:previousAnswer});
  }
  if (next.some(t=>t.answer.length>18000) || JSON.stringify(next).length > 90000)
    return notice('بلغت المحادثة حدّ طول السياق. يمكنك نسخ التحليل وبدء محادثة جديدة.');
  const row = record ? record.row : message(text,'user');
  if (!record && origin && !reduced.matches && row.animate) {
    const bubble = row.querySelector('.bubble');
    const destination = bubble.getBoundingClientRect();
    bubble.animate([
      {transform:'translate(' + Math.max(-40,Math.min(40,origin.left-destination.left)) + 'px,8px) scale(.97)'},
      {transform:'none'}
    ], {duration:210,easing:'cubic-bezier(.2,.8,.25,1)'});
  }
  draft = {row,text,index,record,payload:{query,turns:next,document:documentText,interactive:true,
    recentChat:recentChat.slice(),revision:record ? text : '',revisionIndex:record ? index : null}};
  if (record) closeEdit();
  if (documentText && fileChanged && !record) {
    row.querySelector('.bubble').append(element('small','مرفق نصي · '+byId('filename').textContent,'file-caption'));
    fileChanged = false;
  }
  entry.value = '';
  resizeEntry();
  follow = true;
  returnFocus = true;
  byId('restart').hidden = false;
  analyze();
}

function startEdit(record) {
  if (activeRequest || !byId('failure').hidden || turns.length >= 36) return;
  editing = record;
  byId('editText').textContent = record.text;
  byId('editBar').hidden = false;
  entry.value = record.text;
  setComposer(true);
  entry.maxLength = record.index < 0 ? 8000 : 6000;
  entry.placeholder = 'صحّح رسالتك…';
  resizeEntry(); entry.focus();
}
function closeEdit() {
  editing = null;
  byId('editBar').hidden = true;
  entry.value = '';
  setComposer(true);
  resizeEntry();
}
byId('editCancel').onclick = closeEdit;
byId('composer').onsubmit = event => { event.preventDefault(); send(); };
byId('retry').onclick = analyze;
byId('revise').onclick = () => {
  if (!draft || activeRequest) return;
  const failed = draft;
  draft = null;
  byId('failure').hidden = true;
  if (failed.record) startEdit(failed.record);
  else {
    failed.row.remove();
    setComposer(true);
  }
  entry.value = failed.text;
  resizeEntry(); entry.focus();
};
byId('restart').onclick = ()=>byId('reset-dialog').showModal();
byId('reset-dialog').onclose = () => {
  if (byId('reset-dialog').returnValue === 'reset') { activeRequest?.abort(); history.replaceState(null,'','#chat'); location.reload(); }
};
function resizeEntry() {
  byId('send').disabled = !entry.value.trim();
  entry.style.height = 'auto';
  entry.style.height = Math.min(entry.scrollHeight,115) + 'px';
}
entry.oninput = resizeEntry;
entry.onkeydown = event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer:fine)').matches) {
    event.preventDefault(); byId('composer').requestSubmit();
  }
};

let toastTimer;
function notice(value) {
  const toast = byId('notice');
  clearTimeout(toastTimer);
  toast.textContent = value;
  toast.classList.toggle('show',!!value);
  if (value) toastTimer = setTimeout(()=>toast.classList.remove('show'),4000);
}
let fileChanged = false;
byId('attach').onclick = () => byId('attachment').click();
byId('remove').onclick = () => {
  fileVersion++; reading = 0; documentText = ''; fileChanged = false;
  byId('attachment').value = ''; byId('file-info').hidden = true; notice('');
};
byId('attachment').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  const version = ++fileVersion;
  reading = version;
  try {
    if (!/\.txt$/i.test(file.name) || file.size > 80000) throw new Error();
    const text = new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()).trim();
    if (fileVersion !== version) return;
    if (!text || text.length > 20000 || text.includes('\0')) throw new Error();
    documentText = text; fileChanged = true;
    byId('filename').textContent = file.name;
    byId('file-info').hidden = false;
    notice('');
  } catch {
    if (fileVersion === version) notice('يُقبل ملف TXT بترميز UTF-8 حتى ٢٠ ألف حرف. قراءة PDF والصور غير متاحة.');
  } finally {
    if (fileVersion === version) { reading = 0; event.target.value = ''; }
  }
};

window.addEventListener('afterprint',()=>log.querySelector('.printing')?.classList.remove('printing'));
if (window.visualViewport) {
  const adjust = () => {
    if (window.visualViewport.scale === 1) {
      document.documentElement.style.setProperty('--app-h',window.visualViewport.height+'px');
      if (follow && document.activeElement === entry) keepInView();
    }
  };
  adjust();
  window.visualViewport.addEventListener('resize',adjust);
}
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--dock-h',byId('dock').offsetHeight+'px');
}).observe(byId('dock'));
initGate();
