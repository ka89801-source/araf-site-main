function $(id){return document.getElementById(id)}

function toast(m){
  var t=$('T');
  t.textContent=m;
  t.classList.add('show');
  setTimeout(function(){t.classList.remove('show')},2200)
}

var SUB = {
  assistant_limit: 0,
  assistant_used: 0,
  assistant_left: 0,
  contracts_limit: 0,
  contracts_used: 0,
  contracts_left: 0,
  analyzer_limit: 0,
  analyzer_used: 0,
  analyzer_left: 0,
  consultation_limit: 0,
  consultation_used: 0,
  consultation_left: 0,
  memo_limit: 0,
  memo_used: 0,
  memo_left: 0,
  najiz_limit: 0,
  najiz_used: 0,
  najiz_left: 0,
};

function uSub(){
  var totalLimit =
    (SUB.assistant_limit || 0) +
    (SUB.contracts_limit || 0) +
    (SUB.analyzer_limit || 0) +
    (SUB.consultation_limit || 0);

  var totalUsed =
    (SUB.assistant_used || 0) +
    (SUB.contracts_used || 0) +
    (SUB.analyzer_used || 0) +
    (SUB.consultation_used || 0);

  var totalLeft =
    (SUB.assistant_left || 0) +
    (SUB.contracts_left || 0) +
    (SUB.analyzer_left || 0) +
    (SUB.consultation_left || 0);

  if($('miniPlan')) $('miniPlan').textContent = 'الباقة الشهرية';
  if($('miniUsed')) $('miniUsed').textContent = totalUsed + ' مستخدم';
  if($('miniLeft')) $('miniLeft').textContent = totalLeft + ' متبقي';

  if($('miniFill')){
    var percent = totalLimit ? Math.round((totalUsed / totalLimit) * 100) : 0;
    $('miniFill').style.width = percent + '%';
  }

  if($('subTopPlan')) $('subTopPlan').textContent = 'الباقة الشهرية';
  if($('subTopPrice')) $('subTopPrice').textContent = '39 ر.س';

  if($('subTotalLimit')) $('subTotalLimit').textContent = totalLimit;
  if($('subTotalUsed')) $('subTotalUsed').textContent = totalUsed;
  if($('subTotalLeft')) $('subTotalLeft').textContent = totalLeft;

  if($('subMostUsed')){
    var services = [
      { name:'المساعد القانوني', used:(SUB.assistant_used || 0) },
      { name:'مولّد العقود', used:(SUB.contracts_used || 0) },
      { name:'فاحص العقود', used:(SUB.analyzer_used || 0) },
      { name:'استشارات المحامين', used:(SUB.consultation_used || 0) }
    ].sort(function(a,b){ return b.used - a.used; });

    $('subMostUsed').textContent = services[0].name;
  }

  if($('chartAssistant')) $('chartAssistant').style.width = ((SUB.assistant_limit ? (SUB.assistant_used / SUB.assistant_limit) : 0) * 100) + '%';
  if($('chartContracts')) $('chartContracts').style.width = ((SUB.contracts_limit ? (SUB.contracts_used / SUB.contracts_limit) : 0) * 100) + '%';
  if($('chartAnalyzer')) $('chartAnalyzer').style.width = ((SUB.analyzer_limit ? (SUB.analyzer_used / SUB.analyzer_limit) : 0) * 100) + '%';
  if($('chartConsult')) $('chartConsult').style.width = ((SUB.consultation_limit ? (SUB.consultation_used / SUB.consultation_limit) : 0) * 100) + '%';

  if($('tdAssistantUsed')) $('tdAssistantUsed').textContent = SUB.assistant_used || 0;
  if($('tdAssistantLeft')) $('tdAssistantLeft').textContent = SUB.assistant_left || 0;

  if($('tdContractsUsed')) $('tdContractsUsed').textContent = SUB.contracts_used || 0;
  if($('tdContractsLeft')) $('tdContractsLeft').textContent = SUB.contracts_left || 0;

  if($('tdAnalyzerUsed')) $('tdAnalyzerUsed').textContent = SUB.analyzer_used || 0;
  if($('tdAnalyzerLeft')) $('tdAnalyzerLeft').textContent = SUB.analyzer_left || 0;

  if($('tdConsultUsed')) $('tdConsultUsed').textContent = SUB.consultation_used || 0;
  if($('tdConsultLeft')) $('tdConsultLeft').textContent = SUB.consultation_left || 0;

  if($('tdMemoUsed')) $('tdMemoUsed').textContent = '—';
  if($('tdMemoLeft')) $('tdMemoLeft').textContent = 'بسعر مخفض';

  if($('tdNajizUsed')) $('tdNajizUsed').textContent = '—';
  if($('tdNajizLeft')) $('tdNajizLeft').textContent = 'حسب الطلب';
}
    var totalLimit =
      SUB.assistant_limit +
      SUB.contracts_limit +
      SUB.analyzer_limit +
      SUB.consultation_limit +
      SUB.memo_limit +
      SUB.najiz_limit;

    var totalLeft =
      SUB.assistant_left +
      SUB.contracts_left +
      SUB.analyzer_left +
      SUB.consultation_left +
      SUB.memo_left +
      SUB.najiz_left;

    var usedPercent = totalLimit ? Math.round((totalLeft / totalLimit) * 100) : 0;
    $('sFill').style.width = usedPercent + '%';
  }
}
  
async function loadSubscriptionStatus(){
  try{
    var user = JSON.parse(localStorage.getItem('araf_user') || '{}');
    if(!user.phone) return;

    var res = await fetch('/api/subscription-status?phone=' + encodeURIComponent(user.phone));
    var data = await res.json();

    if(!res.ok || !data.success || !data.subscription) return;

    SUB = data.subscription;
    uSub();
  }catch(e){
    console.error('Subscription status error:', e);
  }
}

$('LB').onclick=async function(){$('loader').classList.add('show');
  var nameInput = $('fullname');
  var phoneInput = $('phone');

  var fullName = nameInput ? nameInput.value.trim() : '';
  var phone = phoneInput ? phoneInput.value.trim() : '';

  if(!fullName || !phone){
  $('loader').classList.remove('show'); // ← الحل
  toast('يرجى إدخال الاسم ورقم الجوال');
  return;
}

$('loader').classList.add('show');
                                 
  try{
    var res = await fetch('/api/login',{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body: JSON.stringify({
        full_name: fullName,
        phone: phone
      })
    });

    var data = await res.json();

    if(!res.ok){
      toast(data.error || 'فشل في API');
      return;
    }

    if(!data.success){
      toast(data.error || 'تعذر تسجيل الدخول');
      return;
    }

    if(!res.ok || !data.success){
      toast(data.error || 'تعذر تسجيل الدخول');
      return;
    }

localStorage.setItem('araf_user', JSON.stringify(data.user));

window.location.href = "pricing.html";
}catch(e){
  $('loader').classList.remove('show');  
  toast('خطأ: ' + e.message);
  console.error(e);
}  
};

$('LOB').onclick=function(){
  localStorage.removeItem('araf_user');
  $('PL').classList.remove('show');
  $('LP').classList.remove('gone')
};

var cP='home';

var PN={
  home:'لوحة التحكم',
  contracts:'مولّد العقود',
  analyzer:'فاحص العقود',
  library:'طلب توكيل في قضية',
  consult:'استشارات المحامين',
  memo:'إعداد مذكرة قانونية',
  assistant:'المساعد القانوني الذكي',
  najiz:'خدمات ناجز',
  subscription:'تفاصيل الباقة'
};

function isMobile(){
  return window.innerWidth <= 900;
}

function cSB(){
  if(isMobile()){
    $('SB').classList.remove('open');
    $('MO').classList.remove('show');
  }else{
    $('SB').classList.add('collapsed');
    $('MN').classList.add('full');
  }
}

function oSB(){
  if(isMobile()){
    $('SB').classList.add('open');
    $('MO').classList.add('show');
  }else{
    $('SB').classList.remove('collapsed');
    $('MN').classList.remove('full');
  }
}

function tSB(){
  if(isMobile()){
    $('SB').classList.toggle('open');
    $('MO').classList.toggle('show');
  }else{
    $('SB').classList.toggle('collapsed');
    $('MN').classList.toggle('full');
  }
}

function syncSideButtons(p){
  document.querySelectorAll('.snb').forEach(function(x){
    x.classList.toggle('on',x.dataset.p===p)
  });
}

function setBread(p){
  $('BC').textContent=PN[p]||'لوحة التحكم';
}

function nav(p){
  cSB();

  if(p==='assistant'){
    oA();
    return;
  }

  $('AP').classList.remove('show');
  cP=p;
  syncSideButtons(p);
  setBread(p);
  rP();
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('.snb').forEach(function(b){
  b.onclick=function(){
    var p=this.dataset.p;
    nav(p);
  };
});

$('MB').onclick=tSB;
$('MO').onclick=cSB;
if($('SBC')) $('SBC').onclick=cSB;

function oM(t,b,at,af){
  $('mdlT').textContent=t;
  $('mdlB').innerHTML=b;
  $('mdlA').textContent=at;
  $('mdlA').onclick=af;
  $('MDL').classList.add('show')
}

function cM(){
  $('MDL').classList.remove('show')
}

var backBtn='<button class="pg-back" onclick="nav(\'home\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5"/><path d="M12 19l7-7-7-7"/></svg>العودة للرئيسية</button>';

$('ABK').onclick=function(){
  clA();
};

function oA(){
  cSB();
  $('AP').classList.add('show');
  syncSideButtons('assistant');
  setBread('assistant');
  V='home';
  R();
  window.scrollTo({top:0,behavior:'smooth'});
}

function clA(){
  $('AP').classList.remove('show');
  cP='home';
  syncSideButtons('home');
  setBread('home');
  rP();
  window.scrollTo({top:0,behavior:'smooth'});
}

var V='home',RES=null,ERR=null,STEP=0,LQ='',TQ='';

var TP=[
  'حقوق العامل عند الفصل التعسفي',
  'نظام العمل السعودي الجديد',
  'إجراءات رفع دعوى عمالية',
  'تعويضات إصابات العمل',
  'عقود العمل المحددة المدة',
  'حقوق المرأة العاملة',
  'نظام التأمينات الاجتماعية',
  'الفرق بين الاستقالة وإنهاء العقد'
];

var ST=[
  'تحليل الاستفسار وتحديد الأنظمة ذات الصلة...',
  'البحث في أنظمة هيئة الخبراء والمواقع الرسمية...',
  'البحث في المقالات ومنصات التواصل الاجتماعي...',
  'إعداد الدراسة القانونية الموثقة...'
];

function R(){
  var m=$('M');
  if(!m)return;
  if(V==='home')m.innerHTML=vH();
  else if(V==='loading')m.innerHTML=vL();
  else if(V==='result')m.innerHTML=vR();
  else if(V==='error')m.innerHTML=vE()
}

function vH(){
  var h='<section class="hero fd"><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><h1>مساعدك القانوني <span class="gld">الذكي</span></h1><p>بحث قانوني عميق يبدأ من الأنظمة السعودية الرسمية ثم يتوسع لجميع المصادر — كل معلومة موثقة بمصدرها ورابطها</p><div class="ai-note"><div class="ai-note-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></div><div class="ai-note-text"><strong>تنبيه مهم:</strong> المساعد القانوني أداة معلوماتية مساعدة، ولا يُعد استشارة قانونية. ويمكنك الحصول على استشارات قانونية متخصصة وفق رصيد باقتك في أعراف، حيث تُقدَّم هذه الخدمات على أيدي محامين ومستشارين قانونيين مختصين..</div></div></section>';  h+='<div class="sb fd" style="animation-delay:.1s"><div class="st"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><textarea class="si" id="si" rows="1" placeholder="اكتب استفسارك القانوني..." oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();go()}"></textarea></div><div class="sf"><div class="shs"><span class="sh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>يبدأ بالأنظمة الرسمية</span><span class="sh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>كل معلومة بمصدرها</span></div><button class="btn" onclick="go()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5l-7 7 7 7"/></svg>ابحث الآن</button></div></div>';
  h+='<div class="tps fd" style="animation-delay:.2s">';
  for(var i=0;i<TP.length;i++)h+='<button class="ch" onclick="TQ=\''+TP[i]+'\';go()">'+TP[i]+'</button>';
  h+='</div>';
  return h
}

function vL(){
  var h='<div class="lw fd"><div class="lsp"></div><div class="lt">جارٍ البحث العميق والتحليل</div><div class="ls">يتم البحث في الأنظمة السعودية...</div><div class="search-wait-note"><div class="search-wait-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg></div><span>قد يستغرق البحث حتى دقيقة ونصف تقريبًا؛ وذلك لغرض جمع المصادر وتحليلها وإعداد دراسة قانونية موثقة.</span></div><div class="stp">';
  for(var i=0;i<ST.length;i++){
    var c=STEP>i?'ok':STEP===i?'on':'';
    var ic;
    if(STEP>i)ic='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
    else if(STEP===i)ic='<div class="msp"></div>';
    else ic='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity=".3"><circle cx="12" cy="12" r="3"/></svg>';
    h+='<div class="ss '+c+'" id="s'+i+'"><div class="si2">'+ic+'</div><span>'+ST[i]+'</span></div>'
  }
  h+='</div></div>';
  return h
}

function vR(){
  if(!RES)return'';
  var txt=RES.content.replace(/<[^>]*>/g,'');
  var wc=txt.split(/\s+/).filter(function(w){return w}).length;
  var h='<div class="rw fd"><div class="rh"><div class="rq"><div class="rqi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div><span class="rqt">'+LQ+'</span></div><div class="rac"><button class="ab" onclick="cpR()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>نسخ</button><button class="ab" onclick="prR()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>طباعة</button></div></div><div class="ac"><div class="am"><div class="mt nv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>'+(RES.type||'دراسة قانونية')+'</div><div class="mt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'+new Date().toLocaleDateString('ar-SA')+'</div><div class="wc">'+wc+' كلمة</div></div><div class="ab2" id="AB">'+RES.content;
  if(RES.sources&&RES.sources.length){
    h+='<div class="sc"><div class="sct"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>فهرس المصادر</div>';
    for(var i=0;i<RES.sources.length;i++){
      var s=RES.sources[i];
      var tp=(s.type||'').toLowerCase();
      var b='<span class="tb a">مقالة</span>';
      if(tp.indexOf('رسمي')>-1)b='<span class="tb o">رسمي</span>';
      h+='<div class="sci"><span class="scn">'+(i+1)+'</span><div><div style="font-weight:600;color:var(--nv)">'+b+s.title+'</div>';
      if(s.url)h+='<a href="'+s.url+'" target="_blank" class="scl">'+s.url+'</a>';
      h+='</div></div>'
    }
    h+='</div>'
  }
  h+='</div></div><button class="nb" onclick="goH()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>بحث جديد</button></div>';
  return h
}

function vE(){
  return'<div class="er fd"><div class="eri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div><div class="ert">حدث خطأ</div><div class="erm">'+(ERR||'يرجى المحاولة')+'</div><button class="rb" onclick="go()">إعادة</button> <button class="rb" onclick="goH()">العودة</button></div>'
}

function goH(){
  V='home';
  RES=null;
  ERR=null;
  TQ='';
  R()
}

function cpR(){
  var b=$('AB');
  if(b)navigator.clipboard.writeText(b.innerText).then(function(){toast('تم النسخ')})
}

function prR(){
  var b=$('AB');
  if(!b)return;
  var w=window.open('','_blank');
  w.document.write('<html dir="rtl"><head><meta charset="UTF-8"><title>تقرير</title><style>body{font-family:Tajawal;padding:32px;line-height:2}h2{color:#1B3A4B;border-bottom:2px solid #C9A96E;padding-bottom:8px}h3{color:#1B3A4B;margin-top:20px}strong{color:#1B3A4B}</style></head><body>'+b.innerHTML+'</body></html>');
  w.document.close();
  setTimeout(function(){w.print()},400)
}

function anim(){
  if(V!=='loading')return;
  if(STEP<ST.length-1){
    STEP++;
    for(var i=0;i<ST.length;i++){
      var el=$('s'+i);
      if(!el)continue;
      el.className='ss'+(STEP>i?' ok':STEP===i?' on':'');
      var ic=el.querySelector('.si2');
      if(STEP>i)ic.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
      else if(STEP===i)ic.innerHTML='<div class="msp"></div>'
    }
    setTimeout(anim,2500+Math.random()*2000)
  }
}

function go(){
  var inp=$('si');
  var q=TQ||(inp?inp.value.trim():'');
  TQ='';
  if(!q){
    if(LQ)q=LQ;
    else return
  }
  LQ=q;
  V='loading';
  STEP=0;
  R();
  setTimeout(anim,1500);
  fetch('/api/ask',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
  query: q,
  phone: JSON.parse(localStorage.getItem('araf_user') || '{}').phone
})
  }).then(function(r){
    return r.json()
  }).then(async function(d){
    if(d.error)throw new Error(d.error);
    await loadSubscriptionStatus();
    RES={content:d.content||'',sources:d.sources||[],type:d.type||'دراسة قانونية'};
    V='result';
    R()
  }).catch(function(e){
    ERR=e.message||'حدث خطأ';
    V='error';
    R()
  })
}

function rP(){
  var c=$('PC');
  if(!c)return;
  if(cP==='home') c.innerHTML=rHm();
  else if(cP==='contracts') c.innerHTML=rCt();
  else if(cP==='analyzer') c.innerHTML=rAz();
  else if(cP==='library') c.innerHTML=rLb();
  else if(cP==='consult') c.innerHTML=rCn();
  else if(cP==='memo') c.innerHTML=rMemo();
  else if(cP==='subscription') c.innerHTML=rSubscription();
  else c.innerHTML=rHm();

  uSub();
}

function rHm(){
  var h='<div class="dw fu"><h1>مرحباً بك في تطبيق شركة أعراف<br>للمحاماة والاستشارات القانونية</h1><div class="dwsub">منصتك القانونية الأولى</div></div><div class="dgrid">';
  h+=mC('assistant','c1','<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>','المساعد القانوني AI','بحث قانوني عميق',0);
  h+=mC('contracts','c2','<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>','مولّد العقود','إنشاء عقود احترافية',1);
  h+=mC('analyzer','c3','<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>','فاحص العقود','تحليل بنود العقود',2);
  h+=mC('library','c4','<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>','طلب توكيل في قضية','فريق مختص',3);
  h+=mC('consult','c5','<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>','استشارات المحامين','محامين مختصين',4);
  h+=mC('memo','c3','<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>','إعداد مذكرة قانونية','صياغة مذكرة احترافية',5);
  h+=mC('najiz','c2','<path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>','خدمات ناجز','تنفيذ خدمات ناجز عبر فريق مختص',6);
  '<div class="ds fu"><small>المتبقي</small><strong id="sLeft">--</strong><em>إجمالي الخدمات</em></div>';
  
  return h
}

function mC(p,cl,ic,t,d,i){
  return'<div class="dcard fu" style="animation-delay:'+(i*.06)+'s" onclick="nav(\''+p+'\')" onmouseenter="dB(this)" ontouchstart="dB(this)"><div class="dicw"><div class="dicg '+cl+'"></div><div class="dic '+cl+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">'+ic+'</svg></div></div><h3>'+t+'</h3><p>'+d+'</p></div>'
}

function dB(c){
  var i=c.querySelector('.dic');
  if(!i)return;
  i.classList.remove('bounce');
  void i.offsetWidth;
  i.classList.add('bounce')
}

var CTS=[
  {id:'employment',n:'عقد عمل',d:'عقد توظيف'},
  {id:'rental',n:'عقد إيجار',d:'إيجار سكني أو تجاري'},
  {id:'service',n:'عقد خدمات',d:'خدمات مهنية'},
  {id:'partnership',n:'عقد شراكة',d:'شراكة تجارية'},
  {id:'nda',n:'اتفاقية سرية',d:'عدم إفشاء'},
  {id:'sale',n:'عقد بيع',d:'بيع سلعة أو أصل'},
  {id:'termination',n:'إنهاء خدمات',d:'إنهاء نظامي'},
  {id:'loan',n:'عقد قرض',d:'قرض أو تمويل'}
];

function rCt(){
  var h=backBtn+'<div class="pghd fu"><h2>مولّد العقود الذكي</h2><p>اختر نوع العقد للبدأ بتوليده </p></div><div class="mgrid">';
  for(var i=0;i<CTS.length;i++){
    var c=CTS[i];
    h+='<div class="mc fu" style="animation-delay:'+(i*.04)+'s" onclick="oCF(\''+c.id+'\')"><div class="mic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h3>'+c.n+'</h3><p>'+c.d+'</p><span class="mtag">AI</span></div>'
  }
  h+='</div>';
  return h
}

function oCF(t){
  var ct = CTS.find(function(c){ return c.id === t; });

  var f = '<div class="fg"><label>الطرف الأول</label><input id="f1" placeholder="الاسم الكامل"></div><div class="fg"><label>الطرف الثاني</label><input id="f2" placeholder="الاسم الكامل"></div>';

  if(t === 'employment'){
    f += '<div class="fg"><label>المسمى الوظيفي</label><input id="f3" placeholder="محاسب"></div><div class="fg"><label>الراتب</label><input type="number" id="f4" placeholder="10000"></div><div class="fg"><label>المدة</label><select id="f5"><option>سنة</option><option>سنتين</option><option>غير محدد</option></select></div><div class="fg"><label>فترة التجربة</label><select id="f6"><option>90 يوم</option><option>180 يوم</option><option>بدون</option></select></div>';
  } else if(t === 'rental'){
    f += '<div class="fg"><label>نوع العقار</label><select id="f3"><option>سكني</option><option>تجاري</option></select></div><div class="fg"><label>العنوان</label><input id="f4" placeholder="العنوان"></div><div class="fg"><label>الإيجار الشهري</label><input type="number" id="f5" placeholder="3000"></div>';
  } else {
    f += '<div class="fg"><label>الوصف</label><textarea id="f3" placeholder="وصف الموضوع"></textarea></div><div class="fg"><label>القيمة</label><input type="number" id="f4" placeholder="50000"></div><div class="fg"><label>المدة</label><input id="f5" placeholder="6 أشهر"></div>';
  }

  f += '<div class="fg"><label>ملاحظات</label><textarea id="f6n" placeholder="شروط خاصة"></textarea></div>';

  oM(ct ? ct.n : 'عقد', f, 'إنشاء العقد', async function(){
    if(!($('f1') || {}).value || !($('f2') || {}).value){
      toast('أدخل أسماء الأطراف');
      return;
    }

    var formData = {
      partyOne: ($('f1') || {}).value || '',
      partyTwo: ($('f2') || {}).value || '',
      field3: ($('f3') || {}).value || '',
      field4: ($('f4') || {}).value || '',
      field5: ($('f5') || {}).value || '',
      field6: ($('f6') || {}).value || '',
      notes: ($('f6n') || {}).value || ''
    };

    $('mdlA').disabled = true;
    $('mdlA').textContent = 'جارٍ التوليد...';

    try{
      var res = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
       body: JSON.stringify({
  contractType: t,
  formData: formData,
  phone: JSON.parse(localStorage.getItem('araf_user') || '{}').phone
})
      });

      var data = await res.json();

      if(!res.ok || !data.success){
  toast(data.error || 'تعذر توليد العقد');
  $('mdlA').disabled = false;
  $('mdlA').textContent = 'إنشاء العقد';
  return;
}

$('mdlA').disabled = false;
$('mdlA').textContent = 'إنشاء العقد';

cM();

await loadSubscriptionStatus();

oM(
  data.contractTitle || 'العقد',
  '<div style="white-space:pre-wrap;line-height:2;font-size:13px;color:var(--t1)">' + data.content + '</div>',
  'إغلاق',
  function(){ cM(); }
);

    } catch(e){
      toast('حدث خطأ أثناء توليد العقد');
      $('mdlA').disabled = false;
      $('mdlA').textContent = 'إنشاء العقد';
    }
  });
}

function rAz(){
  return backBtn+
  '<div class="pghd fu"><h2>محلل مخاطر العقود</h2><p>ارفع عقدك لتحليل البنود واكتشاف المخاطر</p></div>'+
  '<div class="uz fu" onclick="$(\'azIn\').click()" ondragover="event.preventDefault();this.classList.add(\'dragover\')" ondragleave="this.classList.remove(\'dragover\')" ondrop="event.preventDefault();this.classList.remove(\'dragover\');hF(event.dataTransfer.files[0])">'+
    '<div class="uzic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>'+
    '<h3>ارفع العقد</h3><p>اسحب أو انقر للاختيار</p>'+
  '</div>'+
  '<input type="file" id="azIn" style="display:none" accept=".pdf,.txt" onchange="hF(this.files[0])">'+
  '<div id="azI"></div>';
}

function hF(f){
  if(!f) return;

  $('azI').innerHTML =
    '<div class="uzf fu">'+
      '<div class="uzfi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>'+
      '<div style="flex:1">'+
        '<div style="font-size:12px;font-weight:600">'+f.name+'</div>'+
        '<div style="font-size:10px;color:var(--tm)">'+(f.size/1024).toFixed(1)+' KB</div>'+
      '</div>'+
      '<button class="bp" id="analyzeBtn">تحليل</button>'+
    '</div>';

  $('analyzeBtn').onclick = function(){
    var btn = $('analyzeBtn');
    btn.disabled = true;
    btn.textContent = 'جارٍ التحليل...';

    if(f.name.toLowerCase().endsWith('.pdf')){
      var reader = new FileReader();

      reader.onload = async function(e){
        try{
          var base64 = e.target.result.split(',')[1];

          var res = await fetch('/api/analyze-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
  fileName: f.name,
  fileBase64: base64,
  phone: JSON.parse(localStorage.getItem('araf_user') || '{}').phone
})
          });

          var data = await res.json();

          if(!res.ok || !data.success){
            toast(data.error || 'تعذر تحليل العقد');
            btn.disabled = false;
            btn.textContent = 'تحليل';
            return;
          }
         await loadSubscriptionStatus();
          
          oM(
            data.title || 'تحليل مخاطر العقد',
            '<div style="white-space:pre-wrap;line-height:2;font-size:13px;color:var(--t1)">'+data.content+'</div>',
            'إغلاق',
            function(){ cM(); }
          );
        }catch(e){
          toast('حدث خطأ أثناء تحليل العقد');
          btn.disabled = false;
          btn.textContent = 'تحليل';
        }
      };

      reader.readAsDataURL(f);
    } else {
      f.text().then(async function(text){
        try{
          var res = await fetch('/api/analyze-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
  fileName: f.name,
  fileText: text,
  phone: JSON.parse(localStorage.getItem('araf_user') || '{}').phone
})
          });

          var data = await res.json();

          if(!res.ok || !data.success){
            toast(data.error || 'تعذر تحليل العقد');
            btn.disabled = false;
            btn.textContent = 'تحليل';
            return;
          }
        await loadSubscriptionStatus(); 
          
          oM(
            data.title || 'تحليل مخاطر العقد',
            '<div style="white-space:pre-wrap;line-height:2;font-size:13px;color:var(--t1)">'+data.content+'</div>',
            'إغلاق',
            function(){ cM(); }
          );
        }catch(e){
          toast('حدث خطأ أثناء تحليل العقد');
          btn.disabled = false;
          btn.textContent = 'تحليل';
        }
      }).catch(function(){
        toast('تعذر قراءة الملف');
        btn.disabled = false;
        btn.textContent = 'تحليل';
      });
    }
  };
}

function rLb(){
  var h = backBtn+
  '<div class="pghd fu">'+
    '<h2>طلب توكيل في قضية</h2>'+
    '<p>قدّم طلبك ليتولى فريق أعراف دراسة القضية والتواصل معك بشأن إجراءات التوكيل والتمثيل</p>'+
  '</div>'+

  '<div class="cc fu" style="max-width:700px;margin:auto;flex-direction:column;gap:14px">'+

    '<div style="font-size:12px;color:var(--t2);line-height:1.8;text-align:center">'+
    'يضم فريق أعراف نخبة من المحامين والمستشارين القانونيين ذوي الخبرة في الترافع وتمثيل العملاء في مختلف أنواع القضايا، مع دراسة أولية دقيقة للوقائع والمستندات وتقييم المسار النظامي المناسب وفق الأنظمة السعودية.'+
    '</div>'+

    '<div class="fg">'+
      '<label>الاسم</label>'+
      '<input id="w_name" placeholder="الاسم الكامل">'+
    '</div>'+

    '<div class="fg">'+
      '<label>رقم الجوال المسجل في الموقع</label>'+
      '<input id="w_phone" placeholder="05xxxxxxxx">'+
    '</div>'+

    '<div class="fg">'+
      '<label>نوع القضية</label>'+
      '<input id="w_case_type" placeholder="مثال: عمالية / تجارية / عقارية / أحوال شخصية">'+
    '</div>'+

    '<div class="fg">'+
      '<label>موضوع الطلب</label>'+
      '<input id="w_subject" placeholder="مثال: طلب توكيل للترافع في دعوى عمالية">'+
    '</div>'+

    '<div class="fg">'+
      '<label>تفاصيل القضية</label>'+
      '<textarea id="w_details" placeholder="اكتب ملخصًا واضحًا عن القضية والطلبات والإجراءات السابقة"></textarea>'+
    '</div>'+

    '<div class="fg">'+
      '<label>المرفقات (حد أقصى 6 ملفات)</label>'+
      '<input type="file" id="w_files" multiple accept=".pdf,.doc,.docx,.jpg,.png">'+
    '</div>'+

    '<button class="cbk" id="sendAgency">'+
      'طلب التوكيل'+
    '</button>'+

  '</div>';

  setTimeout(function(){
    $('sendAgency').onclick = async function(){
      var name = $('w_name').value.trim();
      var phone = $('w_phone').value.trim();
      var caseType = $('w_case_type').value.trim();
      var subject = $('w_subject').value.trim();
      var details = $('w_details').value.trim();
      var files = $('w_files').files;

      if(!name || !phone || !caseType || !subject || !details){
        toast('أكمل جميع الحقول');
        return;
      }

      if(files.length > 6){
        toast('الحد الأقصى 6 مرفقات');
        return;
      }

      var btn = $('sendAgency');
      btn.disabled = true;
      btn.textContent = 'جارٍ الإرسال...';

      try{
        var formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('subject', 'طلب توكيل في قضية - ' + subject);
        formData.append('details', 'نوع القضية: ' + caseType + '\n\n' + details);
        formData.append('request_type', 'طلب توكيل في قضية');

        for(var i=0;i<files.length;i++){
          formData.append('files', files[i]);
        }

        var res = await fetch('/api/consultation', {
          method: 'POST',
          body: formData
        });

        var data = await res.json();

        if(!res.ok || !data.success){
          toast(data.error || 'فشل إرسال الطلب');
          btn.disabled = false;
          btn.textContent = 'طلب التوكيل';
          return;
        }

        oM(
          'تم الإرسال',
          '<div style="text-align:center;font-size:13px;line-height:2">تم إرسال طلب التوكيل بنجاح<br>وسيتواصل معك الموظف المختص خلال أقرب وقت</div>',
          'إغلاق',
          function(){ cM(); }
        );

      }catch(e){
        toast('حدث خطأ');
        btn.disabled = false;
        btn.textContent = 'طلب التوكيل';
      }
    };
  },100);

  return h;
}

function rCn(){
  var h = backBtn+
  '<div class="pghd fu">'+
    '<h2>استشارات المحامين</h2>'+
    '<p>احصل على استشارة قانونية احترافية من فريق أعراف</p>'+
  '</div>'+

  '<div class="cc fu" style="max-width:700px;margin:auto;flex-direction:column;gap:14px">'+

    // التعريف
    '<div style="font-size:12px;color:var(--t2);line-height:1.8;text-align:center">'+
    'يضم فريق أعراف نخبة من المحامين والمستشارين القانونيين ذوي الخبرة في القضايا التجارية والعمالية والعقارية وصياغة ومراجعة العقود، مع تقديم حلول قانونية دقيقة .'+
    '</div>'+

    // الاسم
    '<div class="fg">'+
      '<label>الاسم</label>'+
      '<input id="c_name" placeholder="الاسم الكامل">'+
    '</div>'+

    // الجوال
    '<div class="fg">'+
      '<label>رقم الجوال المسجل في الموقع</label>'+
      '<input id="c_phone" placeholder="05xxxxxxxx">'+
    '</div>'+

    // الموضوع
    '<div class="fg">'+
      '<label>موضوع الاستشارة</label>'+
      '<input id="c_subject" placeholder="مثال: نزاع عقد عمل">'+
    '</div>'+

    // الوصف
    '<div class="fg">'+
      '<label>تفاصيل الاستشارة</label>'+
      '<textarea id="c_details" placeholder="اكتب تفاصيل حالتك"></textarea>'+
    '</div>'+

    // المرفقات
    '<div class="fg">'+
      '<label>المرفقات (حد أقصى 6 ملفات)</label>'+
      '<input type="file" id="c_files" multiple accept=".pdf,.doc,.docx,.jpg,.png">'+
    '</div>'+

    // زر الإرسال
    '<button class="cbk" id="sendConsult">'+
      'طلب الاستشارة'+
    '</button>'+

  '</div>';

  setTimeout(function(){
    $('sendConsult').onclick = async function(){

      var name = $('c_name').value.trim();
      var phone = $('c_phone').value.trim();
      var subject = $('c_subject').value.trim();
      var details = $('c_details').value.trim();
      var files = $('c_files').files;

      if(!name || !phone || !subject || !details){
        toast('أكمل جميع الحقول');
        return;
      }

      if(files.length > 6){
        toast('الحد الأقصى 6 مرفقات');
        return;
      }

      var btn = $('sendConsult');
      btn.disabled = true;
      btn.textContent = 'جارٍ الإرسال...';

      try{
        var formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('subject', subject);
        formData.append('details', details);

        for(var i=0;i<files.length;i++){
          formData.append('files', files[i]);
        }

        var res = await fetch('/api/consultation', {
          method: 'POST',
          body: formData
        });

        var data = await res.json();

        if(!res.ok || !data.success){
          toast(data.error || 'فشل إرسال الطلب');
          btn.disabled = false;
          btn.textContent = 'طلب الاستشارة';
          return;
        }
        await loadSubscriptionStatus();
        btn.disabled = false;
        btn.textContent = 'طلب الاستشارة';
        
        oM(
          'تم الإرسال',
          '<div style="text-align:center;font-size:13px;line-height:2">تم إرسال طلب الاستشارة بنجاح<br>وسيتواصل معك الموظف المختص خلال أقرب وقت</div>',
          'إغلاق',
          function(){ cM(); }
        );

      }catch(e){
        toast('حدث خطأ');
        btn.disabled = false;
        btn.textContent = 'طلب الاستشارة';
      }

    };
  },100);

  return h;
}
function rMemo(){
  var h = backBtn+
  '<div class="pghd fu">'+
    '<h2>إعداد مذكرة قانونية</h2>'+
    '<p>قدّم طلبك لإعداد مذكرة قانونية احترافية، وسيتم التواصل معك من المختص خلال اليوم.</p>'+
  '</div>'+

  '<div class="cc fu" style="max-width:700px;margin:auto;flex-direction:column;gap:14px">'+

    '<div style="font-size:12px;color:var(--t2);line-height:1.8;text-align:center">'+
    'هذه الخدمة مخصصة لتقديم طلب إعداد المذكرات القانونية بيد كفاءات متميزة ضمن الباقة.'+
    '</div>'+

    '<div class="fg">'+
      '<label>الاسم</label>'+
      '<input id="m_name" placeholder="الاسم الكامل">'+
    '</div>'+

    '<div class="fg">'+
      '<label> رقم الجوال المسجل في الموقع</label>'+
      '<input id="m_phone" placeholder="05xxxxxxxx">'+
    '</div>'+

    '<div class="fg">'+
      '<label>موضوع المذكرة</label>'+
      '<input id="m_subject" placeholder="مثال:تحرير دعوى / مذكرة جوابية / مذكرة اعتراضية ">'+
    '</div>'+

    '<div class="fg">'+
      '<label>تفاصيل الطلب</label>'+
      '<textarea id="m_details" placeholder="اكتب الوقائع والطلبات وأي تفاصيل مهمة"></textarea>'+
    '</div>'+

    '<div class="fg">'+
      '<label>المرفقات (حد أقصى 6 ملفات)</label>'+
      '<input type="file" id="m_files" multiple accept=".pdf,.doc,.docx,.jpg,.png">'+
    '</div>'+

    '<button class="cbk" id="sendMemo">إرسال الطلب</button>'+

  '</div>';

  setTimeout(function(){
    $('sendMemo').onclick = async function(){
      var name = $('m_name').value.trim();
      var phone = $('m_phone').value.trim();
      var subject = $('m_subject').value.trim();
      var details = $('m_details').value.trim();
      var files = $('m_files').files;

      if(!name || !phone || !subject || !details){
        toast('أكمل جميع الحقول');
        return;
      }

      if(files.length > 6){
        toast('الحد الأقصى 6 مرفقات');
        return;
      }

      var btn = $('sendMemo');
      btn.disabled = true;
      btn.textContent = 'جارٍ الإرسال...';

      try{
        var formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('subject', 'طلب إعداد مذكرة قانونية - ' + subject);
        formData.append('details', details);
        
        for(var i=0;i<files.length;i++){
          formData.append('files', files[i]);
        }

        var res = await fetch('/api/memo-service', {
          method: 'POST',
          body: formData
        });

        var data = await res.json();

        if(!res.ok || !data.success){
          toast(data.error || 'فشل إرسال الطلب');
          btn.disabled = false;
          btn.textContent = 'إرسال الطلب';
          return;
        }
        
        btn.disabled = false;
        btn.textContent = 'إرسال الطلب';

        await loadSubscriptionStatus();
        
        oM(
          'تم الإرسال',
          '<div style="text-align:center;font-size:13px;line-height:2">تم إرسال طلب إعداد المذكرة بنجاح<br>وسيتواصل معك المختص خلال أقرب وقت</div>',
          'إغلاق',
          function(){ cM(); }
        );

      }catch(e){
        toast('حدث خطأ');
        btn.disabled = false;
        btn.textContent = 'إرسال الطلب';
      }
    };
  },100);

  return h;
}

function rSubscription(){
  var h = backBtn +
  '<div class="pghd fu">'+
    '<h2>تفاصيل الباقة</h2>'+
    '<p>متابعة الاستخدام الحالي، أكثر الخدمات استخدامًا، وتفاصيل رصيد كل خدمة</p>'+
  '</div>'+

  '<div class="subpage">'+

    '<div class="subhero">'+
      '<div class="subhero-left">'+
        '<div class="subhero-plan" id="subTopPlan">الباقة الشهرية</div>'+
        '<div class="subhero-note">تحديث مباشر لرصيد الخدمات والاستخدام</div>'+
      '</div>'+
      '<div class="subhero-price" id="subTopPrice">39 ر.س</div>'+
    '</div>'+

    '<div class="substats">'+
      '<div class="substat">'+
        '<small>إجمالي الحد</small>'+
        '<strong id="subTotalLimit">0</strong>'+
      '</div>'+
      '<div class="substat">'+
        '<small>المستخدم</small>'+
        '<strong id="subTotalUsed">0</strong>'+
      '</div>'+
      '<div class="substat">'+
        '<small>المتبقي</small>'+
        '<strong id="subTotalLeft">0</strong>'+
      '</div>'+
      '<div class="substat">'+
        '<small>الأكثر استخدامًا</small>'+
        '<strong id="subMostUsed">—</strong>'+
      '</div>'+
    '</div>'+

    '<div class="subchart">'+
      '<div class="chartrow"><span>المساعد القانوني</span><div class="charttrack"><div class="chartfill" id="chartAssistant"></div></div></div>'+
      '<div class="chartrow"><span>مولّد العقود</span><div class="charttrack"><div class="chartfill" id="chartContracts"></div></div></div>'+
      '<div class="chartrow"><span>فاحص العقود</span><div class="charttrack"><div class="chartfill" id="chartAnalyzer"></div></div></div>'+
      '<div class="chartrow"><span>استشارات المحامين</span><div class="charttrack"><div class="chartfill" id="chartConsult"></div></div></div>'+
    '</div>'+

    '<div class="subtable">'+
      '<div class="subthead"><span>الخدمة</span><span>المستخدم</span><span>المتبقي</span></div>'+

      '<div class="subtr"><span>المساعد القانوني</span><span id="tdAssistantUsed">0</span><span id="tdAssistantLeft">0</span></div>'+
      '<div class="subtr"><span>مولّد العقود</span><span id="tdContractsUsed">0</span><span id="tdContractsLeft">0</span></div>'+
      '<div class="subtr"><span>فاحص العقود</span><span id="tdAnalyzerUsed">0</span><span id="tdAnalyzerLeft">0</span></div>'+
      '<div class="subtr"><span>استشارات المحامين</span><span id="tdConsultUsed">0</span><span id="tdConsultLeft">0</span></div>'+
      '<div class="subtr"><span>إعداد مذكرة قانونية</span><span id="tdMemoUsed">—</span><span id="tdMemoLeft">بسعر مخفض</span></div>'+
      '<div class="subtr"><span>خدمات ناجز</span><span id="tdNajizUsed">—</span><span id="tdNajizLeft">حسب الطلب</span></div>'+

    '</div>'+

  '</div>';

  return h;
}

(function(){
  var savedUser = localStorage.getItem('araf_user');

  if(savedUser){
    setTimeout(function(){
      if($('LP')) $('LP').classList.add('gone');
      if($('PL')) $('PL').classList.add('show');

      if(typeof rP === 'function'){
        rP();
      }

      // 🔥 هذا السطر المهم
      loadSubscriptionStatus();

    }, 100);
  }
})();
function rNajiz(){
  var h = backBtn+
  '<div class="pghd fu">'+
    '<h2>خدمات ناجز</h2>'+
    '<p>قدّم طلبك لأي خدمة تتعلق بمنصة ناجز، وسيقوم الفريق المختص بمراجعته وتنفيذه والتواصل معك.</p>'+
  '</div>'+

  '<div class="cc fu" style="max-width:700px;margin:auto;flex-direction:column;gap:14px">'+

    '<div style="font-size:12px;color:var(--t2);line-height:1.8;text-align:center">'+
    'هذه الخدمة متاحة مرة واحدة فقط خلال كل دورة اشتراك، وتشمل مختلف الطلبات المرتبطة بمنصة ناجز.'+
    '</div>'+

    '<div class="fg">'+
      '<label>الاسم</label>'+
      '<input id="n_name" placeholder="الاسم الكامل">'+
    '</div>'+

    '<div class="fg">'+
      '<label>رقم الجوال المسجل في الموقع</label>'+
      '<input id="n_phone" placeholder="05xxxxxxxx">'+
    '</div>'+

    '<div class="fg">'+
      '<label>موضوع الطلب</label>'+
      '<input id="n_subject" placeholder="مثال: رفع طلب / تعديل طلب / إجراء في ناجز">'+
    '</div>'+

    '<div class="fg">'+
      '<label>تفاصيل الطلب</label>'+
      '<textarea id="n_details" placeholder="اكتب تفاصيل خدمة ناجز المطلوبة بشكل واضح"></textarea>'+
    '</div>'+

    '<div class="fg">'+
      '<label>المرفقات (حد أقصى 6 ملفات)</label>'+
      '<input type="file" id="n_files" multiple accept=".pdf,.doc,.docx,.jpg,.png">'+
    '</div>'+

    '<button class="cbk" id="sendNajiz">إرسال طلب ناجز</button>'+
  '</div>';

  setTimeout(function(){
    $('sendNajiz').onclick = async function(){
      var name = $('n_name').value.trim();
      var phone = $('n_phone').value.trim();
      var subject = $('n_subject').value.trim();
      var details = $('n_details').value.trim();
      var files = $('n_files').files;

      if(!name || !phone || !subject || !details){
        toast('أكمل جميع الحقول');
        return;
      }

      if(files.length > 6){
        toast('الحد الأقصى 6 مرفقات');
        return;
      }

      var btn = $('sendNajiz');
      btn.disabled = true;
      btn.textContent = 'جارٍ الإرسال...';

      try{
        var formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('subject', subject);
        formData.append('details', details);

        for(var i=0;i<files.length;i++){
          formData.append('files', files[i]);
        }

        var res = await fetch('/api/najiz-service', {
          method: 'POST',
          body: formData
        });

        var data = await res.json();

        if(!res.ok || !data.success){
  toast(data.error || 'فشل إرسال الطلب');
  btn.disabled = false;
  btn.textContent = 'إرسال طلب ناجز';
  return;
}

btn.disabled = false;
btn.textContent = 'إرسال طلب ناجز';

await loadSubscriptionStatus();

oM(
  'تم الإرسال',
  '<div style="text-align:center;font-size:13px;line-height:2">تم إرسال طلب ناجز بنجاح<br>وسيتواصل معك المختص خلال أقرب وقت</div>',
  'إغلاق',
  function(){ cM(); }
);

      }catch(e){
        toast('حدث خطأ');
        btn.disabled = false;
        btn.textContent = 'إرسال طلب ناجز';
      }
    };
  },100);

  return h;
}

function openSubscriptionPage(){
  var h = `
  <div style="padding:20px">
    <h2 style="margin-bottom:20px">تفاصيل الباقة</h2>

    <div class="card">
      <h3>الاستخدام</h3>

      <div class="stat">
        <span>المساعد القانوني</span>
        <b>${SUB.assistant_used} / ${SUB.assistant_limit}</b>
      </div>

      <div class="stat">
        <span>مولد العقود</span>
        <b>${SUB.contracts_used} / ${SUB.contracts_limit}</b>
      </div>

      <div class="stat">
        <span>فاحص العقود</span>
        <b>${SUB.analyzer_used} / ${SUB.analyzer_limit}</b>
      </div>

      <div class="stat">
        <span>الاستشارات</span>
        <b>${SUB.consultation_used} / ${SUB.consultation_limit}</b>
      </div>
    </div>
  </div>
  `;

  document.getElementById('PC').innerHTML = h;
}
