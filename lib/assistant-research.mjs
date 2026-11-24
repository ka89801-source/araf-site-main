import { load } from 'cheerio';

// Search terms are generated from the legal issue. Personal narratives and
// attachments are never used as search engine queries.
export const officialDomains = ['boe.gov.sa', 'uqn.gov.sa', 'hrsd.gov.sa', 'moj.gov.sa',
  'sjc.gov.sa', 'gosi.gov.sa', 'mc.gov.sa', 'sama.gov.sa', 'cma.org.sa', 'zatca.gov.sa',
  'rega.gov.sa', 'bankruptcy.gov.sa', 'mci.gov.sa', 'mlsd.gov.sa', 'sdaia.gov.sa', 'gac.gov.sa',
  'bog.gov.sa', 'rulebook.sama.gov.sa', 'ia.gov.sa', 'hrdf.org.sa', 'najiz.sa'];
const explanatoryDomains = ['ksu.edu.sa', 'kau.edu.sa', 'imamu.edu.sa', 'sba.gov.sa'];
export const searchDomains = [...officialDomains, ...explanatoryDomains];
const byteLimit = 3 * 1024 * 1024;

function sourceURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const domain = searchDomains.find(d => url.hostname === d || url.hostname.endsWith('.' + d));
    if (!domain) return null;
    url.hash = '';
    return {url: url.href, official: officialDomains.includes(domain)};
  } catch { return null; }
}

export function normalize(text) {
  return text.normalize('NFKC').replace(/[\u064b-\u065f\u0670ـ]/g, '').replace(/[أإآ]/g, 'ا')
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/\s+/g, ' ').trim();
}

// Rank overlapping passages rather than taking the first pages of a long law.
function selectPassages(text, terms) {
  const words = [...new Set(normalize(terms.join(' ')).split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2))];
  const body = text.replace(/\s+/g, ' ').trim();
  if (body.length < 50) return [];
  const windows = [];
  for (let offset = 0; offset < body.length; offset += 680) {
    const passage = body.slice(offset, offset + 1200);
    const normalized = normalize(passage);
    const score = words.reduce((sum,w) => sum + Number(normalized.includes(w)), 0);
    if (score) windows.push({passage, score, offset});
  }
  return windows.sort((a,b) => b.score - a.score || a.offset - b.offset).slice(0,4)
    .sort((a,b) => a.offset-b.offset).map(w => w.passage);
}

async function readPage(candidate, queries, parentSignal) {
  const signal = AbortSignal.any([parentSignal, AbortSignal.timeout(7500)]);
  let target = sourceURL(candidate.url);
  for (let redirects = 0; target && redirects <= 3; redirects++) {
    const response = await fetch(target.url, {signal, redirect:'manual'});
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      const next = response.headers.get('location');
      target = next && sourceURL(new URL(next, target.url).href);
      continue;
    }
    if (!response.ok || Number(response.headers.get('content-length')) > byteLimit) {
      await response.body?.cancel();
      return null;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > byteLimit) return null;
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    let title = candidate.title || new URL(target.url).hostname;
    let text;
    if (buffer.subarray(0,5).toString() === '%PDF-') {
      const {default: parsePDF} = await import('pdf-parse/lib/pdf-parse.js');
      text = (await parsePDF(buffer, {max:80})).text;
    } else {
      const mime = response.headers.get('content-type') || '';
      if (!/html|text\/plain/i.test(mime)) return null;
      const $ = load(buffer.toString('utf8'));
      title = $('title').text().trim() || title;
      $('nav,footer,header,style,script,noscript,form,aside').remove();
      $('p,li,h1,h2,h3,h4,br,tr,div').append(' ');
      text = $('main').text().trim() || $('body').text();
    }
    const passages = selectPassages(text, queries);
    return passages.length ? {...target, title:title.slice(0,220), passages} : null;
  }
  return null;
}

async function serper(query, signal) {
  const response = await fetch('https://google.serper.dev/search', {method:'POST',
    headers:{'Content-Type':'application/json','X-API-KEY':process.env.SERPER_API_KEY},
    body:JSON.stringify({q:query + ' (site:gov.sa OR site:cma.org.sa OR site:edu.sa)', gl:'sa',hl:'ar',num:8}),
    signal:AbortSignal.any([signal,AbortSignal.timeout(6500)])});
  if (!response.ok) throw new Error('search unavailable');
  const data = await response.json();
  if (!Array.isArray(data.organic)) throw new Error('invalid search response');
  return data.organic.map(row => ({url:row.link,title:row.title}));
}

export async function research(queries, signal, discover, progress) {
  progress('search');
  const searches = process.env.SERPER_API_KEY
    ? await Promise.allSettled(queries.map(query => serper(query, signal))) : [];
  let rows = searches.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const seen = new Set();
  async function extract(candidates) {
    const selected = [];
    for (const row of candidates) {
      const target = sourceURL(row.url);
      if (target && !seen.has(target.url)) {
        selected.push({...row,...target});
        seen.add(target.url);
      }
      if (selected.length === 8) break;
    }
    progress('read');
    const results = await Promise.allSettled(selected.map(row => readPage(row, queries, signal)));
    signal.throwIfAborted();
    return results.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []);
  }
  // Interleave queries so that two distinct issues can both contribute evidence.
  if (searches.length > 1) {
    const lists = searches.filter(r => r.status === 'fulfilled').map(r => r.value);
    rows = Array.from({length:8}, (_,i) => lists.map(list => list[i]).filter(Boolean)).flat();
  }
  let sources = rows.length ? await extract(rows) : [];
  if (!sources.some(s => s.official)) {
    progress('search');
    sources = sources.concat(await extract(await discover(queries, signal)));
  }
  const unique = new Map(sources.map(s => [s.url,s]));
  return [...unique.values()].sort((a,b) => Number(b.official) - Number(a.official)).slice(0,6)
    .map((s,i) => ({...s,id:i+1}));
}
