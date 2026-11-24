'use strict';

const byId = id => document.getElementById(id);
const log = byId('log'), scroll = byId('scroll'), entry = byId('entry');
const modelTags = new Set(['div','p','br','strong','b','em','ul','ol','li','h2','h3','span']);
const intro = [
  'أهلًا بك في أعراف.',
  'أنا مساعد أعراف القانوني الذكي. أساعدك على فهم مسألتك، وأوضح لك حقوقك وخياراتك وفق الأنظمة السعودية.',
  'وإذا احتجت إلى محامٍ يتولى قضيتك، يمكنك طلب التواصل مع أحد محامي أعراف بعد المحادثة.',
  'والآن، كيف أقدر أساعدك اليوم؟'
];
const activities = {
  understand: 'أراجع وصفك وما ورد في المحادثة…',
  search: 'أُعدّ الإجابة مع طلب البحث في المصادر الرسمية…',
  analyze: 'أُعدّ التحليل القانوني لمسألتك…',
  verify: 'أراجع قائمة المصادر التي أعادها البحث…'
};
let narrative = '', turns = [], pending = null, previousAnswer = '';
let activeRequest = null, follow = true, lastSubmission = null, documentText = '', reading = 0;
let fileVersion = 0, returnFocus = false;
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
          byId('activity').textContent = activities[item.stage];
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
  follow = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 70;
  byId('latest').hidden = follow;
}, {passive:true});
byId('latest').onclick = () => { follow = true; keepInView(); };

function message(text, role = 'assistant', style = '') {
  const row = element('div', '', 'message ' + role + ' ' + style);
  row.append(element('span', role === 'user' ? 'أنت' : 'مساعد أعراف', 'sr'), element('p', text));
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
  byId('actions').hidden = !pending;
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
  for (const [i, text] of intro.entries()) {
    if (i) await new Promise(resolve => setTimeout(resolve, minimal ? 60 : [0,420,650,580][i]));
    message(text,'assistant', i === 0 ? 'greeting' : i === 3 ? 'prompt' : '');
    keepInView();
  }
  setComposer(true);
  keepInView();
}

function showQuestion(data) {
  if (!data.question?.trim()) throw new Error('وصل استيضاح غير مكتمل. أعد المحاولة.');
  pending = data;
  const row = message(data.acknowledgment || data.question);
  if (data.acknowledgment) row.append(element('p',data.question));
  if (data.reason) {
    const reason = element('details','','reason');
    reason.append(element('summary','لماذا أسأل؟'),element('p',data.reason));
    row.append(reason);
  }
  byId('choices').replaceChildren();
  for (const choice of data.choices || []) byId('choices').append(button(choice, () => {
    entry.value = choice;
    entry.focus();
    resizeEntry();
  }));
  return row;
}

// A retrieved official URL is evidence of a search result. Its presence alone
// cannot establish that it supports an individual sentence in the answer.
function reportText(content) {
  return content.replace(/\(\s*\[(?:[^\]\n]+)\]\(https?:\/\/[^\s<>)]+\)\s*\)/gi, '')
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^\s<>)]+\)/gi, '$1');
}

function report(data) {
  if (!data.content?.trim()) throw new Error('لم تصل إجابة قابلة للعرض. أعد المحاولة.');
  const template = document.createElement('template');
  template.innerHTML = reportText(data.content);
  const body = element('div','','answer');
  const root = template.content.querySelector('.legal-answer') || template.content;
  const blocks = [...root.childNodes].filter(n => n.textContent.trim());
  if (!blocks.length) throw new Error('لم تصل إجابة قابلة للعرض.');
  const details = element('details');
  details.append(element('summary','تفاصيل التحليل'));
  let opening = 1;
  if (blocks[0].matches?.('.section') && blocks[0].children.length === 1 &&
      blocks[0].firstElementChild.matches('h2')) opening = 2;
  blocks.forEach((block,i) => (i < opening ? body : details).append(formatNode(block)));
  if (blocks.length > opening) body.append(details);
  const sources = (data.sources || []).filter(s => s && safeUrl(s.url));
  previousAnswer = blocks.map(n=>n.textContent.trim()).join('\n\n');
  const row = element('article','','report message assistant');
  row.append(element('h2',data.type || 'الإجابة القانونية'),body);
  if (sources.length) {
    const list = element('details','','sources');
    list.append(element('summary','مصادر البحث الرسمية (' + sources.length.toLocaleString('ar-SA') + ')'));
    for (const source of sources) {
      const a = externalLink(safeUrl(source.url));
      a.textContent = source.title || new URL(a.href).hostname;
      list.append(a);
    }
    row.append(list);
  }
  const tools = element('div','','tools');
  const copyText = [previousAnswer,...sources.map(s=>(s.title || '')+' '+s.url)].join('\n');
  tools.append(button('نسخ الإجابة',async () => {
    try { await navigator.clipboard.writeText(copyText); notice('تم نسخ الإجابة.'); }
    catch { notice('تعذّر النسخ. يمكنك تحديد نص الإجابة ونسخه.'); }
  }),button('طباعة',()=>window.print()));
  row.append(tools);
  const handoff = element('aside','','handoff');
  const link = element('a','طلب توكيل محامٍ ←');
  link.href = 'cases.html';
  handoff.append(element('h3','هل تحتاج إلى محامٍ يتولى قضيتك؟'),
    element('p','يمكنك إرسال طلبك عبر أعراف ليطّلع عليه محامٍ مختص.'),link);
  log.querySelector('.handoff')?.remove();
  log.append(row,handoff);
  return row;
}

async function analyze() {
  if (activeRequest) return;
  setComposer(false);
  notice('');
  byId('failure').hidden = true;
  byId('activity').textContent = 'جارٍ إرسال رسالتك…';
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
  const turn = pending ? {kind:'clarification',question:pending.question,topic:pending.topic,answer:skipped?'':text,skipped} :
    narrative ? {kind:'followup',question:text,answer:previousAnswer} : null;
  if (turn && (turn.answer.length > 18000 || JSON.stringify([...turns,turn]).length > 90000))
    return notice('بلغت المحادثة حدّ طول السياق. يمكنك نسخ التحليل وبدء محادثة جديدة.');
  lastSubmission = {pending,text,turn};
  if (turn) turns.push(turn); else narrative = text;
  pending = null;
  const label = skipped ? 'أكمل التحليل بالمتاح.' : text;
  message(label,'user');
  if (documentText && fileChanged) {
    log.lastElementChild.append(element('small','مرفق نصي · '+byId('filename').textContent));
    fileChanged = false;
  }
  entry.value = '';
  resizeEntry();
  follow = true;
  returnFocus = true;
  byId('restart').hidden = false;
  analyze();
}

byId('composer').onsubmit = event => { event.preventDefault(); send(false); };
byId('skip').onclick = () => send(true);
byId('retry').onclick = analyze;
byId('revise').onclick = () => {
  if (!lastSubmission) return;
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
  entry.style.height = 'auto';
  entry.style.height = Math.min(entry.scrollHeight,115) + 'px';
}
entry.oninput = resizeEntry;
entry.onkeydown = event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer:fine)').matches) {
    event.preventDefault(); byId('composer').requestSubmit();
  }
};

function notice(value) { byId('notice').textContent = value; }
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
      document.documentElement.style.setProperty('--chat-height',window.visualViewport.height+'px');
      if (follow && document.activeElement === entry) keepInView();
    }
  };
  adjust();
  window.visualViewport.addEventListener('resize',adjust);
}
welcome();
