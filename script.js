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
  consultation_left: 0
};

function uSub(){
  if($('sPlan')) $('sPlan').textContent = 'الباقة الشهرية';

  if($('sUsed')) {
  $('sUsed').innerHTML =
    'المساعد القانوني: ' + SUB.assistant_left + ' متبقي' +
    '<br>مولد العقود: ' + SUB.contracts_left + ' متبقي' +
    '<br>فاحص العقود: ' + SUB.analyzer_left + ' متبقي' +
    '<br>استشارات المحامين: ' + SUB.consultation_left + ' متبقي';
}

  if($('sLeft')) {
  $('sLeft').textContent =
    'إجمالي المتبقي: ' +
    (
      SUB.assistant_left +
      SUB.contracts_left +
      SUB.analyzer_left +
      SUB.consultation_left
    );
}

  if($('sFill')) {
  var totalLimit =
    SUB.assistant_limit +
    SUB.contracts_limit +
    SUB.analyzer_limit +
    SUB.consultation_limit;

  var totalLeft =
    SUB.assistant_left +
    SUB.contracts_left +
    SUB.analyzer_left +
    SUB.consultation_left;

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
  assistant:'المساعد القانوني الذكي'
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
  var h='<section class="hero fd"><div class="hic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><h1>مساعدك القانوني <span class="gld">الذكي</span></h1><p>بحث قانوني عميق يبدأ من الأنظمة السعودية الرسمية ثم يتوسع لجميع المصادر — كل معلومة موثقة بمصدرها ورابطها</p></section>';
  h+='<div class="sb fd" style="animation-delay:.1s"><div class="st"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><textarea class="si" id="si" rows="1" placeholder="اكتب استفسارك القانوني..." oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\'" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();go()}"></textarea></div><div class="sf"><div class="shs"><span class="sh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>يبدأ بالأنظمة الرسمية</span><span class="sh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>كل معلومة بمصدرها</span></div><button class="btn" onclick="go()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5l-7 7 7 7"/></svg>ابحث الآن</button></div></div>';
  h+='<div class="tps fd" style="animation-delay:.2s">';
  for(var i=0;i<TP.length;i++)h+='<button class="ch" onclick="TQ=\''+TP[i]+'\';go()">'+TP[i]+'</button>';
  h+='</div>';
  return h
}

function vL(){
  var h='<div class="lw fd"><div class="lsp"></div><div class="lt">جارٍ البحث العميق والتحليل</div><div class="ls">يتم البحث في الأنظمة السعودية...</div><div class="stp">';
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
  uQ++;
  uSub();
  fetch('/api/ask',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
  query: q,
  phone: JSON.parse(localStorage.getItem('araf_user') || '{}').phone
})
  }).then(function(r){
    return r.json()
  }).then(function(d){
    if(d.error)throw new Error(d.error);
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
  if(cP==='home')c.innerHTML=rHm();
  else if(cP==='contracts')c.innerHTML=rCt();
  else if(cP==='analyzer')c.innerHTML=rAz();
  else if(cP==='library')c.innerHTML=rLb();
  else if(cP==='consult')c.innerHTML=rCn();
  else if(cP==='memo')c.innerHTML=rMemo();
  else c.innerHTML=rHm()
}

function rHm(){
  var h='<div class="dw fu"><h1>مرحباً بك في تطبيق شركة أعراف<br>للمحاماة والاستشارات القانونية</h1><div class="dwsub">منصتك القانونية الأولى</div></div><div class="dgrid">';
  h+=mC('assistant','c1','<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>','المساعد القانوني AI','بحث قانوني عميق',0);
  h+=mC('contracts','c2','<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>','مولّد العقود','إنشاء عقود احترافية',1);
  h+=mC('analyzer','c3','<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>','فاحص العقود','تحليل بنود العقود',2);
  h+=mC('library','c4','<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>','طلب توكيل في قضية','فريق مختص',3);
  h+=mC('consult','c5','<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>','استشارات المحامين','محامين مختصين',4);
  h+=mC('memo','c3','<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>','إعداد مذكرة قانونية','صياغة مذكرة احترافية',5);
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
          formData: formData
        })
      });

      var data = await res.json();

      if(!res.ok || !data.success){
        toast(data.error || 'تعذر توليد العقد');
        $('mdlA').disabled = false;
        $('mdlA').textContent = 'إنشاء العقد';
        return;
      }

      cM();

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
              fileBase64: base64
            })
          });

          var data = await res.json();

          if(!res.ok || !data.success){
            toast(data.error || 'تعذر تحليل العقد');
            btn.disabled = false;
            btn.textContent = 'تحليل';
            return;
          }

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
              fileText: text
            })
          });

          var data = await res.json();

          if(!res.ok || !data.success){
            toast(data.error || 'تعذر تحليل العقد');
            btn.disabled = false;
            btn.textContent = 'تحليل';
            return;
          }

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
      '<label>رقم الجوال</label>'+
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
      '<label>رقم الجوال</label>'+
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
    '<p>قدّم طلبك لإعداد مذكرة قانونية احترافية، وسيتم مراجعته من المختص ثم التواصل معك لاستكمال التفاصيل وتأكيد الأتعاب.</p>'+
  '</div>'+

  '<div class="cc fu" style="max-width:700px;margin:auto;flex-direction:column;gap:14px">'+

    '<div style="font-size:12px;color:var(--t2);line-height:1.8;text-align:center">'+
    'هذه الخدمة مخصصة لإعداد المذكرات القانونية بمهنية عالية وفق وقائع القضية والمستندات ذات الصلة، ويبدأ السعر من 300 ريال بعد مراجعة الطلب من المختص.'+
    '</div>'+

    '<div class="fg">'+
      '<label>الاسم</label>'+
      '<input id="m_name" placeholder="الاسم الكامل">'+
    '</div>'+

    '<div class="fg">'+
      '<label>رقم الجوال</label>'+
      '<input id="m_phone" placeholder="05xxxxxxxx">'+
    '</div>'+

    '<div class="fg">'+
      '<label>موضوع المذكرة</label>'+
      '<input id="m_subject" placeholder="مثال: مذكرة جوابية / مذكرة اعتراضية / مذكرة دفاع">'+
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
        formData.append('request_type', 'إعداد مذكرة قانونية');

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
          btn.textContent = 'إرسال الطلب';
          return;
        }

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
