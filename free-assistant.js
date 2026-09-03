function $(id){
  return document.getElementById(id);
}

function safeText(value){
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeUrl(url){
  try {
    var u =
      new URL(
        String(url || '')
      );

    if(
      u.protocol === 'http:' ||
      u.protocol === 'https:'
    ){
      return u.href;
    }

    return '#';

  } catch(e) {
    return '#';
  }
}

function cropText(value, max){
  var text =
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  if(
    text.length <= max
  ){
    return text;
  }

  return (
    text.slice(0, max) +
    '...'
  );
}


var V = 'home';
var RES = null;
var ERR = null;
var STEP = 0;
var LQ = '';
var TQ = '';


var TP = [
  'حقوق العامل عند الفصل التعسفي',
  'هل يجوز تكليف العامل بعمل مختلف عن عقده؟',
  'إجراءات رفع دعوى عمالية',
  'تعويضات إصابات العمل',
  'عقود العمل المحددة المدة',
  'حقوق المرأة العاملة',
  'نظام التأمينات الاجتماعية',
  'الفرق بين الاستقالة وإنهاء العقد'
];


var ST = [
  'تحليل الاستفسار وتحديد المسائل القانونية...',
  'البحث في الأنظمة والمصادر الرسمية والآثار المرتبطة...',
  'البحث عن المقالات والشروح والمنشورات والمقاطع ذات الصلة...',
  'مراجعة النصوص والتحقق من المواد والحقوق والاستثناءات...',
  'إعداد الإجابة القانونية الموثقة...'
];


function toast(message){
  var t = $('T');

  if(!t){
    alert(message);
    return;
  }

  t.textContent =
    message;

  t.classList.add(
    'show'
  );

  setTimeout(
    function(){
      t.classList.remove(
        'show'
      );
    },
    2200
  );
}


function setupFreeAssistantPage(){

  if($('LP')){
    $('LP')
      .classList
      .add('gone');

    $('LP').style.display =
      'none';
  }


  if($('PL')){
    $('PL')
      .classList
      .remove('show');

    $('PL').style.display =
      'none';
  }


  if($('AP')){
    $('AP')
      .classList
      .add('show');

    $('AP').style.display =
      'flex';
  }


  if($('ABK')){
    $('ABK').innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
        '<path d="M19 12H5"/>' +
        '<path d="M12 19l7-7-7-7"/>' +
      '</svg>' +
      'العودة للخدمات المباشرة';

    $('ABK').onclick =
      function(){
        window.location.href =
          'services.html';
      };
  }


  var badge =
    document.querySelector(
      '.abdg span:last-child'
    );

  if(badge){
    badge.textContent =
      'مجاني';
  }


  var brand =
    document.querySelector(
      '.abtxt'
    );

  if(brand){
    brand.textContent =
      'المساعد القانوني المجاني';
  }


  V = 'home';
  R();
}


function R(){
  var m = $('M');

  if(!m){
    return;
  }

  if(V === 'home'){
    m.innerHTML =
      vH();

  }else if(
    V === 'loading'
  ){
    m.innerHTML =
      vL();

  }else if(
    V === 'result'
  ){
    m.innerHTML =
      vR();

  }else if(
    V === 'error'
  ){
    m.innerHTML =
      vE();
  }
}


/* ====================================================================
   الصفحة الرئيسية
   ==================================================================== */

function vH(){
  var h = '';


  h += '<section class="hero fd">';

  h +=   '<div class="hic">';

  h +=     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=       '<path d="M12 2L2 7l10 5 10-5-10-5z"/>';

  h +=       '<path d="M2 17l10 5 10-5"/>';

  h +=       '<path d="M2 12l10 5 10-5"/>';

  h +=     '</svg>';

  h +=   '</div>';


  h +=   '<h1>';

  h +=     'مساعدك القانوني ';

  h +=     '<span class="gld">المجاني</span>';

  h +=   '</h1>';


  h +=   '<p>';

  h +=     'اسأل المساعد القانوني واحصل على تحليل قانوني موثق من الأنظمة السعودية، مع مقالات وشروح ومحتوى مهني مرتبط بموضوعك.';

  h +=   '</p>';


  h +=   '<div class="ai-note">';

  h +=     '<div class="ai-note-icon">';

  h +=       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=         '<circle cx="12" cy="12" r="10"/>';

  h +=         '<path d="M12 8v4"/>';

  h +=         '<path d="M12 16h.01"/>';

  h +=       '</svg>';

  h +=     '</div>';


  h +=     '<div class="ai-note-text">';

  h +=       '<strong>تنبيه مهم:</strong> المساعد القانوني أداة معلوماتية مساعدة، ولا يُعد استشارة قانونية أو تمثيلًا نظاميًا، ولا يغني عن مراجعة محامٍ مختص عند الحاجة.';

  h +=     '</div>';

  h +=   '</div>';

  h += '</section>';


  h += '<div class="sb fd" style="animation-delay:.1s">';

  h +=   '<div class="st">';

  h +=     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=       '<circle cx="11" cy="11" r="8"/>';

  h +=       '<path d="M21 21l-4.35-4.35"/>';

  h +=     '</svg>';


  h +=     '<textarea class="si" id="si" rows="1" placeholder="اكتب استفسارك القانوني بالتفصيل..." oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();go()}"></textarea>';

  h +=   '</div>';


  h +=   '<div class="sf">';

  h +=     '<div class="shs">';


  h +=       '<span class="sh">';

  h +=         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=           '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>';

  h +=         '</svg>';

  h +=         'لا يتطلب تسجيل دخول';

  h +=       '</span>';


  h +=       '<span class="sh">';

  h +=         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=           '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>';

  h +=           '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>';

  h +=         '</svg>';

  h +=         'كل حكم بمصدره';

  h +=       '</span>';


  h +=     '</div>';


  h +=     '<button class="btn" onclick="go()">';

  h +=       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">';

  h +=         '<path d="M5 12h14"/>';

  h +=         '<path d="M12 5l-7 7 7 7"/>';

  h +=       '</svg>';

  h +=       'ابحث الآن';

  h +=     '</button>';


  h +=   '</div>';

  h += '</div>';


  h += '<div class="tps fd" style="animation-delay:.2s">';


  for(
    var i = 0;
    i < TP.length;
    i++
  ){
    h +=
      '<button class="ch" onclick="TQ=\'' +
      TP[i] +
      '\';go()">' +
      TP[i] +
      '</button>';
  }


  h += '</div>';


  return h;
}


/* ====================================================================
   شاشة البحث
   ==================================================================== */

function vL(){
  var h = '';


  h += '<div class="lw fd">';

  h +=   '<div class="lsp"></div>';

  h +=   '<div class="lt">جارٍ البحث والتحليل</div>';

  h +=   '<div class="ls">يتم فحص الأنظمة والمصادر الرسمية ثم جمع الشروح والمحتوى المهني المرتبط بالسؤال...</div>';


  h +=   '<div class="search-wait-note">';

  h +=     '<div class="search-wait-icon">';

  h +=       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=         '<path d="M12 2v4"/>';

  h +=         '<path d="M12 18v4"/>';

  h +=         '<path d="M4.93 4.93l2.83 2.83"/>';

  h +=         '<path d="M16.24 16.24l2.83 2.83"/>';

  h +=         '<path d="M2 12h4"/>';

  h +=         '<path d="M18 12h4"/>';

  h +=         '<path d="M4.93 19.07l2.83-2.83"/>';

  h +=         '<path d="M16.24 7.76l2.83-2.83"/>';

  h +=       '</svg>';

  h +=     '</div>';


  h +=     '<span>البحث القانوني المتعمق قد يستغرق دقيقة أو أكثر بحسب عدد المصادر التي تحتاج إلى فحص.</span>';

  h +=   '</div>';


  h +=   '<div class="stp">';


  for(
    var i = 0;
    i < ST.length;
    i++
  ){
    var c =
      STEP > i
        ? 'ok'
        : STEP === i
          ? 'on'
          : '';

    var ic = '';


    if(
      STEP > i
    ){
      ic =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';

    }else if(
      STEP === i
    ){
      ic =
        '<div class="msp"></div>';

    }else{
      ic =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity=".3"><circle cx="12" cy="12" r="3"/></svg>';
    }


    h +=
      '<div class="ss ' +
      c +
      '" id="s' +
      i +
      '">';

    h +=
      '<div class="si2">' +
      ic +
      '</div>';

    h +=
      '<span>' +
      ST[i] +
      '</span>';

    h +=
      '</div>';
  }


  h +=   '</div>';

  h += '</div>';


  return h;
}


/* ====================================================================
   شارات المصادر
   ==================================================================== */

function sourceBadge(source){
  var kind =
    String(
      source.kind || ''
    );

  var type =
    String(
      source.sourceType || ''
    );


  if(
    type.indexOf('رسمي') > -1
  ){
    return '<span class="tb o">رسمي</span>';
  }


  if(
    kind === 'linkedin'
  ){
    return '<span class="tb a">LinkedIn</span>';
  }


  if(
    kind === 'x'
  ){
    return '<span class="tb a">X</span>';
  }


  if(
    kind === 'youtube'
  ){
    return '<span class="tb a">YouTube</span>';
  }


  return '<span class="tb a">مقال / شرح</span>';
}


/* ====================================================================
   بطاقة المصدر
   ==================================================================== */

function renderSourceCard(
  source,
  number
){
  var h = '';

  var cleanUrl =
    safeUrl(
      source.url
    );

  var label =
    source.displayLabel ||
    source.title ||
    'مصدر';

  var metaParts = [];


  if(
    source.organization
  ){
    metaParts.push(
      source.organization
    );
  }


  if(
    source.platform
  ){
    metaParts.push(
      source.platform
    );
  }


  if(
    source.date
  ){
    metaParts.push(
      source.date
    );
  }


  if(
    source.usedInAnswer
  ){
    metaParts.push(
      'استُخدم في الإجابة'
    );

  }else{
    metaParts.push(
      'للاستزادة'
    );
  }


  h +=
    '<div class="sci" style="align-items:flex-start;padding-top:16px;padding-bottom:16px;">';


  h +=
    '<span class="scn">' +
    number +
    '</span>';


  h +=
    '<div style="flex:1;min-width:0;">';


  h +=
    '<div style="font-weight:700;color:var(--nv);line-height:1.8;">' +
    sourceBadge(source) +
    safeText(label) +
    '</div>';


  if(
    metaParts.length
  ){
    h +=
      '<div style="font-size:12px;color:var(--tm);margin-top:4px;line-height:1.8;">' +
      safeText(
        metaParts.join(' • ')
      ) +
      '</div>';
  }


  if(
    source.snippet
  ){
    h +=
      '<div style="font-size:13px;color:var(--t2);line-height:1.9;margin-top:8px;">' +
      safeText(
        cropText(
          source.snippet,
          260
        )
      ) +
      '</div>';
  }


  if(
    cleanUrl !== '#'
  ){
    h +=
      '<a href="' +
      cleanUrl +
      '" target="_blank" rel="noopener noreferrer" class="scl" style="display:inline-flex;margin-top:8px;font-weight:700;">فتح المصدر ↗</a>';
  }


  h +=
    '</div>';


  h +=
    '</div>';


  return h;
}


/* ====================================================================
   مجموعة مصادر
   ==================================================================== */

function renderSourceGroup(
  title,
  description,
  sources,
  startNumber
){
  if(
    !sources ||
    !sources.length
  ){
    return '';
  }

  var h = '';


  h +=
    '<div class="sc" style="margin-top:24px;">';


  h +=
    '<div class="sct">';


  h +=
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';


  h +=
    '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>';


  h +=
    '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>';


  h +=
    '</svg>';


  h +=
    safeText(title);


  h +=
    '</div>';


  if(
    description
  ){
    h +=
      '<div style="font-size:13px;color:var(--t2);line-height:1.9;margin:4px 0 12px;">' +
      safeText(description) +
      '</div>';
  }


  for(
    var i = 0;
    i < sources.length;
    i++
  ){
    h +=
      renderSourceCard(
        sources[i],
        startNumber + i
      );
  }


  h +=
    '</div>';


  return h;
}


/* ====================================================================
   صفحة النتيجة
   ==================================================================== */

function vR(){
  if(!RES){
    return '';
  }


  var plain =
    String(
      RES.content || ''
    )
      .replace(
        /<[^>]*>/g,
        ' '
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();


  var wc =
    plain
      .split(/\s+/)
      .filter(
        function(word){
          return word;
        }
      )
      .length;


  var sources =
    Array.isArray(
      RES.sources
    )
      ? RES.sources
      : [];


  var officialSources =
    sources.filter(
      function(source){
        return String(
          source.sourceType || ''
        ).indexOf(
          'رسمي'
        ) > -1;
      }
    );


  var explanatorySources =
    sources.filter(
      function(source){
        return String(
          source.sourceType || ''
        ).indexOf(
          'شارح'
        ) > -1;
      }
    );


  var professionalSources =
    sources.filter(
      function(source){
        return String(
          source.sourceType || ''
        ).indexOf(
          'مهني'
        ) > -1;
      }
    );


  var h = '';


  h += '<div class="rw fd">';


  h +=   '<div class="rh">';


  h +=     '<div class="rq">';


  h +=       '<div class="rqi">';

  h +=         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=           '<circle cx="11" cy="11" r="8"/>';

  h +=           '<path d="M21 21l-4.35-4.35"/>';

  h +=         '</svg>';

  h +=       '</div>';


  h +=       '<span class="rqt">' +
              safeText(LQ) +
              '</span>';


  h +=     '</div>';


  h +=     '<div class="rac">';


  h +=       '<button class="ab" onclick="cpR()">';

  h +=         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=           '<rect x="9" y="9" width="13" height="13" rx="2"/>';

  h +=           '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';

  h +=         '</svg>';

  h +=         'نسخ';

  h +=       '</button>';


  h +=       '<button class="ab" onclick="prR()">';

  h +=         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=           '<polyline points="6 9 6 2 18 2 18 9"/>';

  h +=           '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>';

  h +=           '<rect x="6" y="14" width="12" height="8"/>';

  h +=         '</svg>';

  h +=         'طباعة';

  h +=       '</button>';


  h +=     '</div>';

  h +=   '</div>';


  h +=   '<div class="ac">';


  h +=     '<div class="am">';


  h +=       '<div class="mt nv">';

  h +=         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=           '<path d="M12 2L2 7l10 5 10-5-10-5z"/>';

  h +=           '<path d="M2 17l10 5 10-5"/>';

  h +=         '</svg>';

  h +=         safeText(
                RES.type ||
                'تحليل قانوني موثق'
              );

  h +=       '</div>';


  h +=       '<div class="mt">';

  h +=         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=           '<circle cx="12" cy="12" r="10"/>';

  h +=           '<path d="M12 6v6l4 2"/>';

  h +=         '</svg>';

  h +=         new Date()
                .toLocaleDateString(
                  'ar-SA'
                );

  h +=       '</div>';


  h +=       '<div class="wc">' +
              wc +
              ' كلمة</div>';


  if(
    RES.confidenceLevel
  ){
    h +=
      '<div class="wc">الثقة: ' +
      safeText(
        RES.confidenceLevel
      ) +
      '</div>';
  }


  h +=     '</div>';


  var safeContent =
    DOMPurify.sanitize(
      RES.content || "",
      {
        ALLOWED_TAGS: [
          "div",
          "p",
          "br",
          "strong",
          "b",
          "em",
          "ul",
          "ol",
          "li",
          "h2",
          "h3",
          "a",
          "span"
        ],

        ALLOWED_ATTR: [
          "href",
          "target",
          "rel",
          "class",
          "dir"
        ]
      }
    );


  h +=
    '<div class="ab2" id="AB">' +
    safeContent;


  /*
    المصادر الرسمية أولًا
  */

  var currentNumber = 1;


  h +=
    renderSourceGroup(
      'المصادر الرسمية',
      'هذه هي المصادر النظامية والرسمية التي يعتمد عليها الحكم القانوني في الإجابة.',
      officialSources,
      currentNumber
    );


  currentNumber +=
    officialSources.length;


  /*
    المقالات والشروح ثانيًا
  */

  h +=
    renderSourceGroup(
      'شروح ومقالات ذات صلة',
      'مواد مساعدة لفهم المسألة وتفسيرها، ولا تحل محل النصوص النظامية الرسمية.',
      explanatorySources,
      currentNumber
    );


  currentNumber +=
    explanatorySources.length;


  /*
    LinkedIn / X / YouTube ثالثًا
  */

  h +=
    renderSourceGroup(
      'منشورات ومقاطع للاستزادة',
      'منشورات LinkedIn وX ومقاطع YouTube ومحتوى مهني مرتبط بالسؤال. تعرض للاستزادة ولا تعد مصدرًا لإثبات الحكم النظامي.',
      professionalSources,
      currentNumber
    );


  h +=
    '</div>';


  h +=     '</div>';

  h +=   '</div>';


  h +=   '<button class="nb" onclick="goH()">';

  h +=     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';

  h +=       '<circle cx="11" cy="11" r="8"/>';

  h +=       '<path d="M21 21l-4.35-4.35"/>';

  h +=     '</svg>';

  h +=     'بحث جديد';

  h +=   '</button>';


  h += '</div>';


  return h;
}


/* ====================================================================
   الخطأ
   ==================================================================== */

function vE(){
  return '' +

    '<div class="er fd">' +

      '<div class="eri">' +

        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +

          '<circle cx="12" cy="12" r="10"/>' +

          '<line x1="15" y1="9" x2="9" y2="15"/>' +

          '<line x1="9" y1="9" x2="15" y2="15"/>' +

        '</svg>' +

      '</div>' +

      '<div class="ert">حدث خطأ</div>' +

      '<div class="erm">' +
        safeText(
          ERR ||
          'يرجى المحاولة'
        ) +
      '</div>' +

      '<button class="rb" onclick="go()">إعادة المحاولة</button> ' +

      '<button class="rb" onclick="goH()">بحث جديد</button>' +

    '</div>';
}


/* ====================================================================
   العودة
   ==================================================================== */

function goH(){
  V = 'home';
  RES = null;
  ERR = null;
  TQ = '';

  R();
}


/* ====================================================================
   النسخ
   ==================================================================== */

function cpR(){
  var b =
    $('AB');

  if(!b){
    return;
  }

  navigator.clipboard
    .writeText(
      b.innerText
    )
    .then(
      function(){
        toast(
          'تم النسخ'
        );
      }
    );
}


/* ====================================================================
   الطباعة
   ==================================================================== */

function prR(){
  var b =
    $('AB');

  if(!b){
    return;
  }


  var w =
    window.open(
      '',
      '_blank'
    );


  w.document.write(

    '<html dir="rtl">' +

      '<head>' +

        '<meta charset="UTF-8">' +

        '<title>تقرير قانوني</title>' +

        '<style>' +

          'body{' +
            'font-family:Tajawal,Arial,sans-serif;' +
            'padding:32px;' +
            'line-height:2;' +
            'color:#1B2B36' +
          '}' +

          'h2{' +
            'color:#1B3A4B;' +
            'border-bottom:2px solid #C9A96E;' +
            'padding-bottom:8px;' +
            'margin-top:28px' +
          '}' +

          'h3{' +
            'color:#1B3A4B;' +
            'margin-top:20px' +
          '}' +

          'strong{' +
            'color:#1B3A4B' +
          '}' +

          'a{' +
            'color:#1B3A4B;' +
            'font-weight:700' +
          '}' +

          '.sci{' +
            'margin:12px 0;' +
            'padding:12px;' +
            'border:1px solid #eee;' +
            'border-radius:10px' +
          '}' +

        '</style>' +

      '</head>' +

      '<body>' +

        b.innerHTML +

      '</body>' +

    '</html>'
  );


  w.document.close();


  setTimeout(
    function(){
      w.print();
    },
    400
  );
}


/* ====================================================================
   تحريك خطوات البحث
   ==================================================================== */

function anim(){
  if(
    V !== 'loading'
  ){
    return;
  }


  if(
    STEP <
    ST.length - 1
  ){
    STEP++;


    for(
      var i = 0;
      i < ST.length;
      i++
    ){
      var el =
        $('s' + i);

      if(!el){
        continue;
      }


      el.className =
        'ss' +
        (
          STEP > i
            ? ' ok'
            : STEP === i
              ? ' on'
              : ''
        );


      var ic =
        el.querySelector(
          '.si2'
        );

      if(!ic){
        continue;
      }


      if(
        STEP > i
      ){
        ic.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';

      }else if(
        STEP === i
      ){
        ic.innerHTML =
          '<div class="msp"></div>';
      }
    }


    setTimeout(
      anim,
      2600 +
      Math.random() *
      2200
    );
  }
}


/* ====================================================================
   تنفيذ السؤال
   ==================================================================== */

function go(){
  var inp =
    $('si');


  var q =
    TQ ||
    (
      inp
        ? inp.value.trim()
        : ''
    );


  TQ = '';


  if(!q){
    if(LQ){
      q = LQ;

    }else{
      return;
    }
  }


  LQ = q;

  V =
    'loading';

  STEP = 0;

  R();


  setTimeout(
    anim,
    1400
  );


  fetch(
    '/api/free-ask',
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/json'
      },

      body:
        JSON.stringify({
          query: q
        })
    }
  )

  .then(
    function(response){
      return response.json();
    }
  )

  .then(
    function(data){

      if(
        data.error
      ){
        throw new Error(
          data.error
        );
      }


      RES = {
        content:
          data.content ||
          '',

        sources:
          data.sources ||
          [],

        type:
          data.type ||
          'تحليل قانوني موثق',

        confidenceLevel:
          data.confidenceLevel ||
          '',

        sourcesCount:
          data.sourcesCount ||
          {}
      };


      V =
        'result';


      R();
    }
  )

  .catch(
    function(error){

      ERR =
        error.message ||
        'حدث خطأ';


      V =
        'error';


      R();
    }
  );
}


/* ====================================================================
   البداية
   ==================================================================== */

document.addEventListener(
  'DOMContentLoaded',
  function(){
    setupFreeAssistantPage();
  }
);
