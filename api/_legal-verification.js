'use strict';

const dns = require('node:dns');
const https = require('node:https');
const { isIPv4 } = require('node:net');
const { Readable } = require('node:stream');
const { Worker } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TEXT = 400_000;
const MAX_REFERENCES = 8;
const MAX_SOURCES = 3;
const DEADLINE_MS = 2600;
const cache = new Map();

function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٠-٩۰-۹]/g,
      digit => '0123456789'['٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10])
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function sourceURL(value, domains, preserveSlash = false) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !domains.some(d => url.hostname === d || url.hostname.endsWith('.' + d))) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (!preserveSlash) url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.href;
  } catch { return null; }
}

// Do not replay searches, session links or form parameters to government servers.
function publicDocument(value) {
  const url = new URL(value);
  if (/(?:^|\/)(?:login|account|profile|search|private|callback|redirect|downloadtoken)(?:\/|$)/i.test(url.pathname)) return false;
  if (url.hostname === 'laws-gateway.moj.gov.sa' && url.pathname === '/apis/legislations/v1/ExportDocument/pdf' &&
      [...url.searchParams].length === 1 && /^[a-zA-Z0-9_-]{12,64}$/.test(url.searchParams.get('Serial') || '')) return true;
  return [...url.searchParams].every(([key, val]) =>
    /^(?:p|id|lawid|documentid|page|lang|language)$/i.test(key) &&
    /^(?:\d{1,12}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|ar|en)$/i.test(val));
}

function publicIPv4(address) {
  if (!isIPv4(address)) return false;
  const [a,b,c] = address.split('.').map(Number);
  return a > 0 && a < 224 && ![10,127].includes(a) &&
    !(a === 100 && b >= 64 && b <= 127) && !(a === 169 && b === 254) &&
    !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) &&
    !(a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) &&
    !(a === 203 && b === 0 && c === 113);
}

function officialGet(url, {signal, headers}) {
  return new Promise((resolve, reject) => {
    // Pin the checked address on this socket. TLS still authenticates the original hostname.
    const req = https.get(url, {signal, headers, agent:false, family:4, autoSelectFamily:false,
      lookup(host, options, done) {
        dns.lookup(host, {family:4, all:true}, (err, records) => {
          if (err) return done(err);
          if (!records.length || !records.every(r => publicIPv4(r.address))) return done(new Error('address'));
          return options.all ? done(null, records) : done(null, records[0].address, 4);
        });
      }
    }, res => resolve({
      status:res.statusCode, ok:res.statusCode >= 200 && res.statusCode < 300,
      headers:{get:key => res.headers[key]}, body:Readable.toWeb(res)
    }));
    req.on('error', reject);
  });
}

// Parsing untrusted HTML and especially PDF must not block the request's event loop.
// The worker is disposable even when a PDF parser stops yielding.
async function extractInWorker() {
  const { parentPort, workerData } = require('node:worker_threads');
  const bytes = Buffer.from(workerData.bytes);
  const loadParser = require;
  if (workerData.pdf) {
    const doc = await loadParser(workerData.parser)(bytes, {max:18});
    parentPort.postMessage(doc.text?.slice(0, workerData.limit) || '');
    return;
  }
  const {load} = loadParser(workerData.parser);
  const $ = load(bytes.toString('utf8'));
  const title = $('title').first().text();
  $('script,style,nav,footer,header,noscript,aside,template,[hidden]').remove();
  const main = $('main, [role="main"]').first();
  const root = main.length ? main : $('body');
  root.find('br').replaceWith('\n');
  root.find('p,div,section,article,li,h1,h2,h3,h4,h5,h6,tr').prepend('\n').append('\n');
  parentPort.postMessage((title + '\n' + root.text()).slice(0, workerData.limit));
}

function extract(bytes, mime, signal) {
  const pdf = /pdf/i.test(mime) || bytes.subarray(0,5).toString() === '%PDF-';
  if (!pdf && /^text\/plain/i.test(mime)) return bytes.toString('utf8').slice(0, MAX_TEXT);
  if (!pdf && !/html/i.test(mime)) return null;
  signal.throwIfAborted();
  const parser = pdf ? require.resolve('pdf-parse/lib/pdf-parse.js') : require.resolve('cheerio');
  return new Promise((resolve, reject) => {
    const worker = new Worker('(' + extractInWorker.toString() + ')().catch(() => require("node:worker_threads").parentPort.postMessage(null))', {
      eval:true, workerData:{bytes, parser, pdf, limit:MAX_TEXT}, resourceLimits:{maxOldGenerationSizeMb:64}
    });
    const finish = value => {
      signal.removeEventListener('abort', abort);
      void worker.terminate().catch(() => {});
      resolve(value);
    };
    const abort = () => finish(null);
    worker.once('message', finish);
    worker.once('exit', () => finish(null));
    worker.once('error', () => finish(null));
    signal.addEventListener('abort', abort, {once:true});
  });
}

async function fetchOfficialText(initial, domains, get, signal) {
  if (!publicDocument(initial)) return null;
  const real = get === officialGet;
  const cached = real && cache.get(initial);
  if (cached && cached.expires > Date.now()) return cached.text;
  let target = initial;
  for (let hop = 0; hop < 3; hop++) {
    signal.throwIfAborted();
    const response = await get(target, {method:'GET', redirect:'manual', signal,
      headers:{Accept:'text/html,text/plain,application/pdf','Accept-Encoding':'identity'}});
    const cancel = () => response.body?.cancel().catch(() => {});
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      void cancel();
      if (!location) return null;
      target = sourceURL(new URL(location, target).href, domains, true);
      if (!target || !publicDocument(target)) return null;
      continue;
    }
    if (!response.ok || !response.body || Number(response.headers.get('content-length')) > MAX_BYTES) {
      void cancel(); return null;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > MAX_BYTES) return null; // Breaking the web stream iterator cancels it.
      chunks.push(Buffer.from(chunk));
    }
    const text = await extract(Buffer.concat(chunks), response.headers.get('content-type') || '', signal);
    if (!text || !/[\u0621-\u064A]{2}/u.test(text) ||
        /(?:just a moment|captcha challenge|enable javascript and cookies|access denied)/i.test(text.slice(0,300))) return null;
    if (real) {
      if (cache.size >= 24) cache.delete(cache.keys().next().value);
      cache.set(initial, {text, expires:Date.now() + 15 * 60_000});
    }
    return text;
  }
  return null;
}

// Saudi statutes use spelled-out headings, including «الثالثة عشرة بعد المائة».
const ordinals = new Map();
const units = 'الأولى الثانية الثالثة الرابعة الخامسة السادسة السابعة الثامنة التاسعة'.split(' ');
const tens = ['العشرون','الثلاثون','الأربعون','الخمسون','الستون','السبعون','الثمانون','التسعون'];
for (let n = 1; n <= 99; n++) {
  let name;
  const u = n % 10;
  if (n < 10) name = units[n-1];
  else if (n === 10) name = 'العاشرة';
  else if (n < 20) name = (u === 1 ? 'الحادية' : units[u-1]) + ' عشرة';
  else name = (u ? (u === 1 ? 'الحادية' : units[u-1]) + ' و' : '') + tens[Math.floor(n/10)-2];
  ordinals.set(normalize(name), n);
}
function numberOf(label) {
  const key = normalize(label);
  if (/ مكرر(?:ا|ه)?$/.test(key)) {
    const base = numberOf(key.slice(0, key.lastIndexOf(' ')));
    return base && base + ' مكرر';
  }
  if (/^\d{1,4}$/.test(key)) return String(Number(key));
  const base = key.replace(/مئ/g, 'مائ');
  const hundreds = {'المائه':100,'المائتين':200,'الثلاثمائه':300,'الاربعمائه':400,'الخمسمائه':500,'الستمائه':600,'السبعمائه':700};
  if (Object.hasOwn(hundreds, base)) return String(hundreds[base]);
  const [lower, higher, extra] = base.split(' بعد ');
  if (extra !== undefined) return null;
  const value = ordinals.get(lower);
  if (value && (!higher || Object.hasOwn(hundreds,higher))) return String(value + (hundreds[higher] || 0));
  return null;
}
const digits = '[0-9٠-٩۰-۹]{1,4}';
function articleNumbers(answer) {
  const found = new Set();
  const re = new RegExp('الم(?:اد[ةه]|ادت[اي]ن|واد)\\s*(?:رقم\\s*)?[\\[(（]?\\s*(' + digits +
    ')((?:\\s*[)\\]]?\\s*(?:[،,]\\s*و?|و)\\s*[\\[(]?\\s*' + digits + ')*)','gu');
  for (const hit of String(answer || '').replace(/\*\*/g,'').matchAll(re)) {
    const numbers = (hit[1]+hit[2]).match(new RegExp(digits,'gu'));
    const tail = hit.input.slice(hit.index + hit[0].length);
    const repeated = /^[\s)\]]*مكرر/u.test(tail);
    for (const [index, number] of numbers.entries()) {
      found.add(numberOf(number) + (repeated && index === numbers.length-1 ? ' مكرر' : ''));
    }
  }
  const words = normalize(answer).split(' ');
  for (let i = 0; i < words.length; i++) {
    if (!/^[وفب]?الماده$/.test(words[i]) || /^\d/.test(words[i+1] || '')) continue;
    for (let length = 5; length > 0; length--) {
      const n = numberOf(words.slice(i + 1, i + 1 + length).join(' '));
      if (n) { found.add(n); break; }
    }
  }
  return [...found];
}

function checkQuote(text, ref) {
  const quote = normalize(ref.quote);
  if (quote.length < 30 || quote.length > 700) return 'unconfirmed';
  const contains = part => (' ' + normalize(part) + ' ').includes(' ' + quote + ' ');
  if (!contains(text)) return 'unconfirmed';
  const law = normalize(ref.law);
  const article = numberOf(String(ref.article).replace(/^الماد[ةه]\s*/u,''));
  if (!law || !article) return 'excerpt_only';
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const lawTitle = line => line.split(/\s*[|–—]\s*|\s+-\s+/).some(s => normalize(s) === law);
  let inLaw = false, current = null, parts = [], hits = 0, matched = false;
  function close() {
    if (current === article && inLaw) {
      hits++;
      if (contains(parts.join(' '))) matched = true;
    }
    parts = [];
  }
  for (const line of lines) {
    if (lawTitle(line)) { close(); current = null; inLaw = true; continue; }
    if (/^(?:نظام|اللائحة التنفيذية لنظام|لائحة)\s/.test(line) && line.length < 100 && !/[.،؛:]/.test(line)) {
      close(); inLaw = false; current = null; continue;
    }
    if (/^(?:ال)?ماد[ةه]\s/u.test(line)) {
      close();
      const heading = line.match(/^(?:ال)?ماد[ةه]\s+(?:رقم\s*)?[(（\[]?([^:：)\]）\n]{1,65}?)(?:[)\]）]\s*[:：]?|[:：]|$)\s*(.*)$/u);
      current = heading && !/^مكرر/u.test(heading[2]) ? numberOf(heading[1]) : null;
      if (current === article && heading[2]) parts.push(heading[2]);
    } else if (current === article) parts.push(line);
  }
  close();
  return hits === 1 && matched ? 'matched' : 'excerpt_only';
}

// Start bounded reads only after the provider has returned public document URLs.
// At most three unique documents, including work overlapped with answer generation.
function createSourceReader(domains, fetchImpl = officialGet, parent) {
  const controller = new AbortController();
  const lifetime = parent ? AbortSignal.any([controller.signal, parent]) : controller.signal;
  const reads = new Map();
  function read(rawUrl) {
    const url = sourceURL(rawUrl, domains);
    if (!url || !publicDocument(url) || lifetime.aborted) return null;
    if (reads.has(url)) return reads.get(url);
    if (reads.size >= MAX_SOURCES) return null;
    const signal = AbortSignal.any([lifetime, AbortSignal.timeout(15000)]);
    const task = fetchOfficialText(url, domains, fetchImpl, signal).catch(() => null);
    reads.set(url, task);
    return task;
  }
  function prefetch(urls) {
    // One likely primary document per search operation leaves capacity for final claims.
    const candidate = urls.map(u => sourceURL(u, domains)).find(u => u && !reads.has(u) &&
      publicDocument(u) && /\/LawDetails\/|\/details\?|\/decisions-and-regulations\/|\.pdf(?:$|\?)/i.test(u));
    if (candidate) read(candidate);
  }
  return {read, prefetch, stop:() => controller.abort()};
}

async function verifyLegalReferences({answer, references, sources, domains, fetchImpl = officialGet, signal:parent, reader}) {
  const start = performance.now();
  const signal = parent ? AbortSignal.any([parent, AbortSignal.timeout(DEADLINE_MS)]) : AbortSignal.timeout(DEADLINE_MS);
  const approved = new Map();
  for (const source of sources || []) {
    const url = sourceURL(source?.url, domains);
    if (url) approved.set(url, {...source, url});
  }
  const raw = Array.isArray(references) ? references : [];
  const refs = raw.slice(0, MAX_REFERENCES).map(r => ({
    law:String(r?.law || '').slice(0,150), article:String(r?.article || '').slice(0,50),
    quote:String(r?.quote || '').slice(0,750), url:sourceURL(r?.url, domains)
  }));
  const targets = [...new Set(refs.map(r => r.url).filter(u => approved.has(u)))].slice(0, MAX_SOURCES);
  const docs = reader || createSourceReader(domains, fetchImpl, parent);
  const texts = new Map();
  if (targets.length && !signal.aborted) {
    let expired;
    const timeout = new Promise(resolve => { expired = resolve; });
    signal.addEventListener('abort', expired, {once:true});
    try {
      await Promise.race([timeout, Promise.all(targets.map(async url => {
        const text = await docs.read(url);
        if (text) texts.set(url, text);
      }))]);
    } finally { signal.removeEventListener('abort', expired); }
  }
  docs.stop();
  const findings = refs.map(({law, article, quote, url}) => {
    if (!approved.has(url)) return {law, article, url:null, status:'missing_source'};
    const text = texts.get(url);
    return {law, article, url, status:text ? checkQuote(text, {law,article,quote}) : 'unavailable'};
  });
  const declared = new Set(refs.map(r => numberOf(r.article.replace(/^الماد[ةه]\s*/u,''))));
  const missingArticles = articleNumbers(answer).filter(n => !declared.has(n));
  const matched = findings.filter(f => f.status === 'matched').length;
  const needsReview = !refs.length || matched !== raw.length || missingArticles.length > 0;
  let note = '';
  if (needsReview) {
    const pending = [...new Set([...findings.filter(f => f.status !== 'matched').map(f =>
      [f.law, f.article && 'المادة ' + f.article].filter(Boolean).join('، ')), ...missingArticles.map(n => 'المادة ' + n)].filter(Boolean))];
    note = 'ملاحظة توثيقية — ' + (!approved.size ? 'هذا تحليل أولي مشروط. لم يتوفر مصدر رسمي من البحث لفحص الأسانيد.' :
      !refs.length ? 'تعرض قائمة المصادر ما استُخدم في البحث. لم تُطابَق مادة بعينها مع نصها الأصلي.' :
      'لم تكتمل المطابقة النصية لجميع الأسانيد.') +
      (pending.length ? ' الإحالات التي تحتاج إلى مراجعة: ' + pending.join('؛ ') + '.' : '') +
      ' راجع النص النافذ بتاريخ الواقعة قبل الاعتماد على النتيجة.';
  }
  const listed = [...approved.values()].map(s => {
    const count = findings.filter(f => f.url === s.url && f.status === 'matched').length;
    return {...s, sourceType:count ? 'مطابقة نصية فقط (' + count + ')، ويُراجع السريان والانطباق' : 'مصدر بحث رسمي دون مطابقة نصية مكتملة'};
  });
  return {findings, matched, missingArticles, needsReview, note, sources:listed, elapsedMs:Math.round(performance.now()-start)};
}

module.exports = {verifyLegalReferences, createSourceReader, sourceURL, _test:{normalize, publicIPv4, publicDocument, articleNumbers, checkQuote}};
