'use strict';

const byId = id => document.getElementById(id);
const log = byId('log'), scroll = byId('scroll'), entry = byId('entry');
const modelTags = new Set(['div','p','br','strong','b','em','ul','ol','li','h2','h3','span']);
const intro = [
    'أهلًا بك في أعراف، يسعدني وجودك معنا.',
    'أنا مساعد أعراف القانوني الذكي، أساعدك على فهم مسألتك القانونية، وأوضح لك حقوقك والخيارات المتاحة وفق الأنظمة السعودية.',
    'وإذا احتجت إلى محامٍ يتولى قضيتك أو يتابع إجراءاتها، يمكنك طلب التواصل مع أحد المحامين المختصين عبر أعراف بعد انتهاء المحادثة.',
    'والآن، أخبرني كيف أقدر أساعدك اليوم؟'
  ];
const activities = {
  understand: 'أراجع وصفك وما ورد في المحادثة…',
  search: 'أُعدّ الإجابة مع طلب البحث في المصادر الرسمية…',
  analyze: 'أُعدّ التحليل القانوني لمسألتك…',
  verify: 'أراجع قائمة المصادر التي أعادها البحث…'
};
let narrative = '', turns = [], pending = null, previousAnswer = '';
let activeRequest = null, follow = true, lastSubmission = null, documentText = '', reading = 0;
let fileVersion = 0, returnFocus = false, editing = null;
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
  if (me || reduced.matches) value.textContent = text;
  else {
    value.setAttribute('aria-hidden','true');
    bubble.append(element('span',text,'sr'));
    let index = 0;
    for (const part of text.split(/(\s+)/)) {
      if (!part.trim()) { value.append(part); continue; }
      const word = element('span',part,'w');
      word.style.setProperty('--delay',Math.min(index++ * 23,400) + 'ms');
      value.append(word);
    }
  }
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
  byId('actions').hidden = !visible || !pending || !!editing;
  byId('send').disabled = !entry.value.trim();
  byId('attach').hidden = !narrative;
  byId('consent').hidden = !!narrative;
  entry.maxLength = !narrative ? 8000 : 6000;
  entry.placeholder = pending ? 'اكتب إجابتك أو صحّح ما فهمته…' :
    narrative ? 'تابع بسؤال أو أضف توضيحًا…' : 'اكتب مسألتك بطريقتك…';
  if (visible && returnFocus && matchMedia('(pointer:fine)').matches &&
      [document.body,entry].includes(document.activeElement)) entry.focus({preventScroll:true});
}

async function welcome() {
  const minimal = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let fast = minimal;
  const hurry = () => { fast = true; };
  scroll.addEventListener('pointerdown',hurry);
  document.addEventListener('keydown',hurry);
  for (const [i, text] of intro.entries()) {
    await new Promise(resolve => setTimeout(resolve, fast ? 25 : [220,650,1000,1000][i]));
    message(text,'assistant', i === 0 ? 'greeting' : i === 3 ? 'prompt' : '');
    keepInView();
  }
  if (!fast) await new Promise(resolve=>setTimeout(resolve,280));
  scroll.removeEventListener('pointerdown',hurry);
  document.removeEventListener('keydown',hurry);
  byId('dock').classList.add('appear');
  document.querySelector('.composer').classList.add('invite');
  setComposer(true);
  keepInView();
}

function showQuestion(data) {
  if (!data.question?.trim()) throw new Error('وصل استيضاح غير مكتمل. أعد المحاولة.');
  pending = data;
  if (data.acknowledgment) message(data.acknowledgment);
  const row = message(data.question);
  if (data.reason) row.querySelector('.bubble').append(element('span',data.reason,'hint fadein'));
  byId('choices').replaceChildren();
  for (const [i,choice] of (data.choices || []).entries()) {
    const chip = button(choice,() => { entry.value = choice; send(false); });
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
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^\s<>)]+\)/gi, '$1');
}

function reportSection(report,title) {
  const section = element('details','','sec');
  section.style.setProperty('--i',report.querySelectorAll('.sec').length);
  const heading = element('summary','','sec-h');
  heading.append(element('b',title),element('span','⌄','chev'));
  const body = element('div','','sec-b');
  section.append(heading,body); report.append(section);
  return body;
}

function report(data) {
  if (!data.content?.trim()) throw new Error('لم تصل إجابة قابلة للعرض. أعد المحاولة.');
  const template = document.createElement('template');
  template.innerHTML = reportText(data.content);
  const root = template.content.querySelector('.legal-answer') || template.content;
  const blocks = [...root.childNodes].filter(n => n.textContent.trim());
  if (!blocks.length) throw new Error('لم تصل إجابة قابلة للعرض.');
  previousAnswer = blocks.map(n=>n.textContent.trim()).join('\n\n');
  const row = element('article','','report answer');
  const summary = element('div','','ans-sum');
  summary.append(element('div','الخلاصة','ans-k'),element('h2',data.type || 'الإجابة القانونية'));
  row.append(summary);
  let panel = null;
  for (const block of blocks) {
    const heading = block.matches?.('h2,h3') ? block : block.querySelector?.(':scope > h2');
    if (heading) panel = reportSection(row,heading.textContent);
    if (heading && block !== heading) {
      for (const child of block.childNodes) if (child !== heading) panel.append(formatNode(child));
    } else if (!heading) {
      if (!panel && summary.childElementCount > 2) panel = reportSection(row,'تفاصيل التحليل');
      (panel || summary).append(formatNode(block));
    }
  }
  if (summary.childElementCount === 2) row.querySelector('details')?.setAttribute('open','');
  const sources = (data.sources || []).filter(source => source && safeUrl(source.url));
  if (sources.length) {
    const list = reportSection(row,'مصادر البحث الرسمية (' + sources.length.toLocaleString('ar-SA') + ')');
    list.classList.add('sources');
    for (const source of sources) {
      const a = externalLink(safeUrl(source.url));
      a.className = 'src';
      const label = element('span');
      label.append(element('b',source.title || new URL(a.href).hostname),element('small',new URL(a.href).hostname));
      a.append(label,element('span','↗')); list.append(a);
    }
  }
  const tools = element('div','','ans-foot');
  tools.append(element('small','إجابة آلية لم يراجعها محامٍ'));
  const copyText = [previousAnswer,...sources.map(s=>(s.title || '')+' '+s.url)].join('\n');
  tools.append(button('نسخ الإجابة',async () => {
    try { await navigator.clipboard.writeText(copyText); notice('تم نسخ الإجابة.'); }
    catch { notice('تعذّر النسخ. يمكنك تحديد نص الإجابة ونسخه.'); }
  }),button('طباعة',()=>window.print()));
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
  if (activeRequest) return;
  setComposer(false);
  notice('');
  byId('failure').hidden = true;
  showActivity('send');
  byId('working').hidden = false;
  keepInView();
  const request = new AbortController();
  activeRequest = request;
  const timer = setTimeout(()=>request.abort(),100000);
  try {
    const response = await fetch('/api/free-ask',{method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},
      body:JSON.stringify({query:narrative,turns,document:documentText,interactive:true}),signal:request.signal});
    const data = await readResult(response,request);
    const row = data.kind === 'clarification' ? showQuestion(data) : report(data);
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

function send(skipped) {
  if (activeRequest || byId('composer').hidden) return;
  if (reading) return notice('يجري فتح الملف النصي. انتظر اكتمال قراءته.');
  const text = entry.value.trim();
  if (!text && !skipped) { entry.focus(); return; }
  if (editing) {
    const {row,turn} = editing;
    if (text === editing.text) { closeEdit(); return; }
    const field = turn?.kind === 'followup' ? 'question' : 'answer';
    const revised = turns.map(t => t === turn ? {...t,[field]:text} : t);
    if (JSON.stringify(revised).length > 90000) return notice('بلغت المحادثة حدّ طول السياق.');
    if (turn) turn[field] = text; else narrative = text;
    row.querySelector('.value').textContent = text;
    if (!row.querySelector('.edited')) row.querySelector('.bubble').append(element('small','معدّلة','edited'));
    editing.text = text;
    lastSubmission = {correction:editing};
    closeEdit();
    pending = null;
    analyze();
    return;
  }
  const turn = pending ? {kind:'clarification',question:pending.question,topic:pending.topic,answer:skipped?'':text,skipped} :
    narrative ? {kind:'followup',question:text,answer:previousAnswer} : null;
  if (turn && (turn.answer.length > 18000 || JSON.stringify([...turns,turn]).length > 90000))
    return notice('بلغت المحادثة حدّ طول السياق. يمكنك نسخ التحليل وبدء محادثة جديدة.');
  lastSubmission = {pending,text,turn};
  if (turn) turns.push(turn); else narrative = text;
  pending = null;
  const label = skipped ? 'أكمل التحليل بالمتاح.' : text;
  const row = message(label,'user');
  lastSubmission.row = row;
  const bubble = row.querySelector('.bubble');
  if (!skipped) {
    row.classList.add('editable');
    const record = {row,turn,text};
    const edit = button('تعديل',()=>startEdit(record));
    edit.className = 'edit-act';
    bubble.title = 'عرض خيار تعديل الرسالة';
    bubble.onclick = () => row.classList.toggle('show-edit');
    row.append(edit);
  } else { bubble.disabled = true; bubble.classList.add('muted'); }
  if (documentText && fileChanged) {
    bubble.append(element('small','مرفق نصي · '+byId('filename').textContent,'edited'));
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
  entry.maxLength = record.turn ? 6000 : 8000;
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
byId('composer').onsubmit = event => { event.preventDefault(); send(false); };
byId('skip').onclick = () => send(true);
byId('retry').onclick = analyze;
byId('revise').onclick = () => {
  if (!lastSubmission) return;
  if (lastSubmission.correction) {
    byId('failure').hidden = true; startEdit(lastSubmission.correction); return;
  }
  lastSubmission.row.remove();
  if (lastSubmission.turn) turns.pop(); else narrative = '';
  pending = lastSubmission.pending;
  byId('failure').hidden = true;
  entry.value = lastSubmission.text;
  setComposer(true);
  resizeEntry();
  entry.focus();
};
byId('restart').onclick = ()=>byId('reset-dialog').showModal();
byId('reset-dialog').onclose = () => {
  if (byId('reset-dialog').returnValue === 'reset') { activeRequest?.abort(); location.reload(); }
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

let closedForPrint = [];
window.addEventListener('beforeprint',() => {
  closedForPrint = [...log.querySelectorAll('.report details:not([open])')];
  closedForPrint.forEach(d=>{d.open=true;});
});
window.addEventListener('afterprint',()=>closedForPrint.forEach(d=>{d.open=false;}));
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
welcome();
