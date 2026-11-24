'use strict';

const byId = id => document.getElementById(id);
const screens = document.querySelectorAll('[data-screen]');
const steps = {
  narrative: ['وصف المشكلة', 10],
  clarify: ['الاستيضاح', 30],
  review: ['مراجعة الوصف', 50],
  loading: ['التحليل', 75],
  failure: ['تعذّر إكمال البحث', 75],
  report: ['التقرير', 100]
};
const maxQuery = 1000;
const topics = [
  'حقوق العامل عند الفصل التعسفي', 'نظام العمل السعودي الجديد', 'إجراءات رفع دعوى عمالية',
  'تعويضات إصابات العمل', 'عقود العمل المحددة المدة', 'حقوق المرأة العاملة',
  'نظام التأمينات الاجتماعية', 'الفرق بين الاستقالة وإنهاء العقد'
];
const modelTags = new Set(['div', 'p', 'br', 'strong', 'b', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'a', 'span']);
let narrative = '';
let detail = '';
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
  return [narrative, detail].filter(Boolean).join('\n\n');
}

function updateRemaining() {
  const available = Math.max(0, maxQuery - narrative.length - 2);
  const input = byId('detail');
  input.maxLength = available;
  input.disabled = available === 0 && !input.value;
  const remaining = available - input.value.trim().length;
  byId('remaining').textContent = remaining < 0
    ? 'تجاوزت الحد بمقدار ' + (-remaining) + ' حرفًا. اختصر الإضافة أو عدّل الوصف.'
    : 'المتبقي للإضافة: ' + remaining + ' حرفًا';
  byId('next').disabled = remaining < 0;
  byId('next').textContent = input.value.trim() ? 'حفظ ومتابعة' : 'تخطّي ومتابعة';
}

document.querySelectorAll('[data-description]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector('textarea');
    const value = input.value.trim();
    if (value.length < 5 || value.length > maxQuery) {
      notify('اكتب وصفًا بين ٥ و١٠٠٠ حرف.');
      input.focus();
      return;
    }
    narrative = value;
    document.querySelectorAll('[data-narrative]').forEach(node => { node.textContent = value; });
    byId('detail').value = detail;
    updateRemaining();
    show('clarify');
  });
});

byId('detail').addEventListener('input', updateRemaining);
byId('detail-form').addEventListener('submit', event => {
  event.preventDefault();
  detail = byId('detail').value.trim();
  if (fullQuery().length > maxQuery) return;
  byId('detail-message').hidden = !detail;
  byId('detail-value').textContent = detail;
  show('review');
});

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
  byId('report-title').textContent = narrative;
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

async function analyze() {
  if (activeRequest || !narrative) return;
  const request = new AbortController();
  activeRequest = request;
  show('loading');
  try {
    const response = await fetch('/api/free-ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: fullQuery() }),
      signal: request.signal
    });
    const data = await response.json().catch(() => null);
    if (request !== activeRequest) return;
    if (!response.ok || data?.error || typeof data?.content !== 'string') {
      const message = [400, 429].includes(response.status) && typeof data?.error === 'string'
        ? data.error : 'تعذّر الحصول على إجابة من المساعد. يمكنك إعادة المحاولة بنفس السؤال.';
      throw new Error(message);
    }
    renderReport(data);
    show('report');
  } catch (error) {
    if (request !== activeRequest) return;
    byId('error-message').textContent = error instanceof TypeError
      ? 'تعذّر الاتصال بالخدمة. تحقق من اتصالك وأعد المحاولة.' : error.message;
    show('failure');
  } finally {
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
  detail = '';
  document.querySelectorAll('textarea').forEach(input => {
    input.value = '';
    input.style.height = '';
  });
  ['answer', 'sources', 'report-title', 'detail-value', 'panel-body'].forEach(id => byId(id).replaceChildren());
  document.querySelectorAll('[data-narrative]').forEach(node => node.replaceChildren());
  if (byId('panel').open) byId('panel').close();
  byId('welcome').classList.add('instant');
  show('welcome');
}

async function copyReport() {
  const sections = [...byId('answer').querySelectorAll('details:not([open])')];
  sections.forEach(section => { section.open = true; });
  const text = [fullQuery(), byId('answer').innerText, byId('sources').innerText].filter(Boolean).join('\n\n');
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
byId('analyze').onclick = byId('retry').onclick = analyze;
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
  'اكتب مسألتك لتحصل على إجابة آلية وفق المصادر القانونية المتاحة. التحليل النصي مجاني. قراءة المرفقات والتقرير المدفوع ومتابعة ملف محفوظ غير متاحة حاليًا.');
byId('file').onclick = () => openPanel('ملف قضيتك',
  (!byId('narrative').hidden ? byId('description').value.trim() : fullQuery()) || 'سيظهر وصفك هنا بعد إدخاله.', 'file');
byId('exit').onclick = () => openPanel('إنهاء الجلسة؟', 'عند إنهاء الجلسة سيُمسح وصفك وتقريرك من هذه الصفحة.', 'exit');
byId('close').onclick = () => byId('panel').close();
byId('confirm-exit').onclick = reset;
document.querySelectorAll('[data-new]').forEach(button => { button.onclick = reset; });
document.querySelectorAll('[data-edit]').forEach(button => {
  button.onclick = () => {
    if (!byId('clarify').hidden) detail = byId('detail').value.trim();
    editDescription();
  };
});
document.querySelectorAll('[data-full]').forEach(button => {
  button.onclick = () => setReportMode(button.dataset.full === 'true');
});
for (const topic of topics) {
  const button = element('button', topic, 'chip-ex');
  button.onclick = () => {
    byId('description').value = topic;
    byId('description').focus();
  };
  byId('examples').append(button);
}
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
