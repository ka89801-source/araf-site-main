'use strict';

const byId = id => document.getElementById(id);
const screens = document.querySelectorAll('[data-screen]');
const steps = {
  narrative: ['وصف المشكلة', 10],
  clarify: ['الاستيضاح', 30],
  loading: ['التحليل', 75],
  failure: ['تعذّر إكمال البحث', 75],
  report: ['التقرير', 100]
};
const modelTags = new Set(['div', 'p', 'br', 'strong', 'b', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'a', 'span']);
let narrative = '';
let turns = [];
let pending = null;
let documentText = '';
let documentName = '';
let fileRead = 0;
let readingFile = false;
let previousAnswer = '';
let activeRequest = null;
let toastTimer;

function show(screen) {
  screens.forEach(node => { node.hidden = node.id !== screen; });
  byId('bar').hidden = screen === 'welcome';
  byId('modes').hidden = screen !== 'report' || !byId('answer').querySelector('details');
  byId('step').hidden = !byId('modes').hidden;
  if (steps[screen]) {
    const [label, progress] = steps[screen];
    byId('step').textContent = label;
    byId('progress').style.width = progress + '%';
  }
  window.scrollTo(0, 0);
  byId(screen).querySelector('h1').focus({ preventScroll: true });
}

function notify(message) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function editDescription() {
  byId('description').value = narrative;
  show('narrative');
  byId('description').focus();
}

function fullQuery() {
  const lines = [narrative];
  if (documentName) lines.push('نص المستند المرفق: ' + documentName, documentText);
  for (const turn of turns) {
    if (turn.kind === 'followup') lines.push('الإجابة السابقة: ' + turn.answer, 'متابعة: ' + turn.question);
    else lines.push(turn.question, turn.skipped ? 'لم يحدد العميل الإجابة.' : turn.answer);
  }
  return lines.join('\n\n');
}

function removeDocument() {
  fileRead++;
  readingFile = false;
  documentName = documentText = byId('attachment').value = byId('attachment-name').textContent = '';
  byId('remove-document').hidden = true;
}

byId('remove-document').onclick = removeDocument;
byId('attachment').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  removeDocument();
  const version = fileRead;
  if (!/\.txt$/i.test(file.name) || file.size > 80000) return notify('اختر ملف نص UTF-8 في حدود ٢٠ ألف حرف.');
  readingFile = true;
  try {
    const value = new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()).trim();
    if (fileRead !== version) return;
    if (!value || value.length > 20000 || value.includes('\0')) throw new Error();
    documentText = value;
    documentName = file.name;
    byId('attachment-name').textContent = file.name;
    byId('remove-document').hidden = false;
  } catch { if (fileRead === version) notify('تعذرت قراءة النص. اختر ملف TXT بترميز UTF-8 في حدود ٢٠ ألف حرف.'); }
  finally { if (fileRead === version) readingFile = false; }
};

document.querySelectorAll('[data-description]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (readingFile) return notify('انتظر اكتمال قراءة المستند.');
    const value = form.querySelector('textarea').value.trim();
    if (!value) return notify('اكتب وصف المسألة.');
    narrative = value;
    pending = null;
    document.querySelectorAll('[data-narrative]').forEach(node => { node.textContent = value; });
    analyze();
  });
});

function renderQuestion(data) {
  pending = data;
  byId('question').textContent = data.question;
  byId('reason').textContent = data.reason || '';
  byId('detail').value = '';
  const history = byId('conversation');
  history.replaceChildren();
  for (const t of turns) {
    const row = element('div','','msg msg-ai');
    row.append(element('div', t.kind === 'followup' ? t.question : t.question + '\n' + (t.skipped ? 'لا أعلم' : t.answer),'body'));
    history.append(row);
  }
  byId('choices').replaceChildren();
  for (const choice of data.choices || []) {
    const button = element('button',choice,'chip-ex');
    button.type = 'button';
    button.onclick = () => { byId('detail').value = choice; byId('detail').focus(); };
    byId('choices').append(button);
  }
  show('clarify');
}
function reply(skipped) {
  if (!pending || activeRequest) return;
  const answer = skipped ? '' : byId('detail').value.trim();
  if (!answer && !skipped) return notify('أجب عن السؤال أو اختر المتابعة بالمتاح.');
  turns.push({kind:'clarification',question:pending.question,topic:pending.topic,answer,skipped});
  pending = null;
  analyze();
}
byId('detail-form').onsubmit = e => { e.preventDefault(); reply(false); };
byId('skip').onclick = () => reply(true);
byId('followup').onsubmit = e => {
  e.preventDefault();
  const question = byId('followup-text').value.trim();
  if (!question || activeRequest) return;
  turns.push({kind:'followup',question,answer:previousAnswer});
  byId('followup-text').value = '';
  analyze();
};

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

function renderAnswer(content) {
  const template = document.createElement('template');
  template.innerHTML = content;
  const root = template.content;
  const wrapper = root.firstElementChild;
  const hasSingleWrapper = wrapper?.matches('.legal-answer') && [...root.childNodes]
    .every(node => node === wrapper || !node.textContent.trim());
  const answer = byId('answer');
  answer.replaceChildren();
  for (const node of (hasSingleWrapper ? wrapper : root).childNodes) {
    if (node.matches?.('.section.summary')) {
      const summary = element('section', '', 'summary');
      summary.append(formatNode(node));
      answer.append(summary);
    } else if (node.matches?.('.section') && node.querySelector(':scope > h2')) {
      const heading = node.querySelector(':scope > h2');
      const section = element('details', '', 'acc');
      const title = element('summary', heading.textContent, 'acc-h');
      const body = element('div', '', 'acc-b');
      for (const child of node.childNodes) {
        if (child !== heading) body.append(formatNode(child));
      }
      section.append(title, body);
      answer.append(section);
    } else {
      answer.append(formatNode(node));
    }
  }
  if (!answer.textContent.trim()) throw new Error('لم تصل إجابة قابلة للعرض. أعد المحاولة.');
}

function renderReport(data) {
  renderAnswer(data.content);
  previousAnswer = byId('answer').textContent;
  byId('report-title').textContent = turns.findLast(t => t.kind === 'followup')?.question || narrative;
  byId('report-type').textContent = data.type || 'إجابة قانونية';
  const words = byId('answer').textContent.trim().split(/\s+/).length;
  byId('report-meta').textContent = new Date().toLocaleDateString('ar-SA') + ' · ' + words + ' كلمة';
  const sources = byId('sources');
  sources.replaceChildren();
  for (const source of Array.isArray(data.sources) ? data.sources : []) {
    if (!source) continue;
    const url = safeUrl(source.url);
    const row = url ? externalLink(url) : element('div');
    const label = element('span');
    label.append(element('b', source.title || 'مصدر'));
    if (url) label.append(element('small', url));
    row.append(label, element('span', source.sourceType || source.type || 'مصدر', 'lay'));
    sources.append(row);
  }
  byId('source-list').hidden = !sources.childElementCount;
  setReportMode(false);
}

const activities = {
  understand:'يقرأ المساعد وصفك وسياق المحادثة…', search:'يجري البحث عن المصادر القانونية…',
  read:'تُقرأ النصوص ذات الصلة…', analyze:'يُطبّق المساعد النصوص على وقائعك…', verify:'تجري مطابقة الاقتباسات بالمصادر…'
};

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

async function analyze() {
  if (activeRequest || !narrative) return;
  const request = new AbortController();
  activeRequest = request;
  byId('activity').textContent = 'جارٍ إرسال طلبك…';
  show('loading');
  const timer = setTimeout(() => request.abort(),100000);
  try {
    const response = await fetch('/api/free-ask', {
      method:'POST',headers:{'Content-Type':'application/json','Accept':'application/x-ndjson'},
      body:JSON.stringify({query:narrative,turns,document:documentText,interactive:true}),signal:request.signal
    });
    const data = await readResult(response,request);
    if (request !== activeRequest) return;
    if (data.kind === 'clarification') renderQuestion(data);
    else {
      renderReport(data);
      show('report');
    }
  } catch (error) {
    if (request !== activeRequest) return;
    byId('error-message').textContent = request.signal.aborted ? 'انتهت مهلة الاتصال. يمكنك إعادة المحاولة.'
      : error instanceof TypeError ? 'تعذّر الاتصال بالخدمة. تحقق من اتصالك وأعد المحاولة.' : error.message;
    show('failure');
  } finally {
    clearTimeout(timer);
    if (request === activeRequest) activeRequest = null;
  }
}

function setReportMode(full) {
  byId('answer').querySelectorAll('details').forEach(section => { section.open = full; });
  byId('modes').querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.full === String(full)));
  });
}

function openPanel(title, message, mode) {
  const panel = byId('panel');
  byId('panel-title').textContent = title;
  byId('panel-body').textContent = message;
  byId('outline-content').hidden = mode !== 'outline';
  panel.classList.toggle('case-file', mode === 'file');
  byId('confirm-exit').hidden = mode !== 'exit';
  panel.showModal();
}

function reset() {
  activeRequest?.abort();
  activeRequest = null;
  narrative = '';
  turns = [];
  pending = null;
  previousAnswer = '';
  removeDocument();
  document.querySelectorAll('textarea').forEach(input => {
    input.value = '';
    input.style.height = '';
  });
  ['answer', 'sources', 'report-title', 'conversation','choices','question','reason', 'panel-body'].forEach(id => byId(id).replaceChildren());
  document.querySelectorAll('[data-narrative]').forEach(node => node.replaceChildren());
  if (byId('panel').open) byId('panel').close();
  byId('welcome').classList.add('instant');
  show('welcome');
}

async function copyReport() {
  const sections = [...byId('answer').querySelectorAll('details:not([open])')];
  sections.forEach(section => { section.open = true; });
  const text = [byId('report-title').textContent, byId('answer').innerText, byId('sources').innerText].filter(Boolean).join('\n\n');
  sections.forEach(section => { section.open = false; });
  try {
    await navigator.clipboard.writeText(text);
    notify('تم نسخ التقرير');
  } catch {
    notify('تعذّر النسخ. يمكنك تحديد نص التقرير ونسخه.');
  }
}

byId('greeting').textContent = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';
byId('start').onclick = () => {
  narrative = byId('quick').value.trim();
  editDescription();
};
byId('retry').onclick = analyze;
byId('copy').onclick = copyReport;
byId('print').onclick = () => window.print();
let closedBeforePrint = [];
window.addEventListener('beforeprint', () => {
  closedBeforePrint = [...byId('answer').querySelectorAll('details:not([open])')];
  closedBeforePrint.forEach(section => { section.open = true; });
});
window.addEventListener('afterprint', () => {
  closedBeforePrint.forEach(section => { section.open = false; });
});
byId('outline').onclick = () => openPanel('مثال لتنسيق التقرير',
  'هذا دليل لطريقة العرض. تتحدد أقسام تقريرك بحسب إجابة المحرك والمصادر المتاحة.', 'outline');
byId('about').onclick = () => openPanel('عن مساعد أعراف القانوني',
  'اكتب مسألتك لتحصل على إجابة آلية وفق المصادر القانونية المتاحة. التحليل النصي مجاني. يمكنك إرفاق نص مستند بصيغة TXT ومتابعة الإجابة داخل الجلسة.');
byId('file').onclick = () => openPanel('ملف قضيتك',
  (!byId('narrative').hidden ? byId('description').value.trim() : fullQuery()) || 'سيظهر وصفك هنا بعد إدخاله.', 'file');
byId('exit').onclick = () => openPanel('إنهاء الجلسة؟', 'عند إنهاء الجلسة سيُمسح وصفك وتقريرك من هذه الصفحة.', 'exit');
byId('close').onclick = () => byId('panel').close();
byId('confirm-exit').onclick = reset;
document.querySelectorAll('[data-new]').forEach(button => { button.onclick = reset; });
document.querySelectorAll('[data-edit]').forEach(button => {
  button.onclick = editDescription;
});
document.querySelectorAll('[data-full]').forEach(button => {
  button.onclick = () => setReportMode(button.dataset.full === 'true');
});
for (const input of document.querySelectorAll('textarea')) {
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      input.form.requestSubmit();
    }
  });
  if (input.id !== 'detail') input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });
}
