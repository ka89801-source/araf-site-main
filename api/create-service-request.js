const requestMap = new Map();

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    "unknown"
  );
}

function isRateLimited(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 3;

  const record = requestMap.get(ip) || { count: 0, start: now };

  if (now - record.start > windowMs) {
    requestMap.set(ip, { count: 1, start: now });
    return false;
  }

  record.count += 1;
  requestMap.set(ip, record);

  return record.count > maxRequests;
}
export default async function handler(req, res) {
  const allowedOrigins = [
  "https://araf.online",
  "https://www.araf.online",
  "https://araf-site-main.vercel.app"
];

const origin = req.headers.origin;

if (allowedOrigins.includes(origin)) {
  res.setHeader("Access-Control-Allow-Origin", origin);
}

res.setHeader("Vary", "Origin");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

if (isRateLimited(req)) {
  return res.status(429).json({
    success: false,
    error: "تم تجاوز عدد المحاولات، يرجى المحاولة بعد دقيقة"
  });
}
  
  try {
   const {
  customer_name,
  customer_phone,
  service_type,
  service_name,
  details,
  attachments
} = req.body || {};

const cleanCustomerName = String(customer_name || "").trim().slice(0, 120);
const cleanCustomerPhone = String(customer_phone || "").trim();
const cleanServiceName = String(service_name || "").trim().slice(0, 120);
const cleanServiceType = String(service_type || service_name || "").trim().slice(0, 120);
const cleanDetails = String(details || "").trim().slice(0, 3000);
    
   const SERVICE_PRICES = {
  "استشارة قانونية": 100,
  "طلب دراسة قضيةا": 400,
  "مراجعة عقد": 200,
  "صياغة عقد": 450,
  "خدمات ناجز": 200,
  "إعداد مذكرة قانونية": 300,
  "صياغة خطاب رسمي": 150,
  "الاعتراض على مخالفة حكومية": 250,
  "تجهيز صحيفة دعوى": 350,
  "حضور جلسة قضائية نيابة عن العميل": 300,
  "تقديم طلب تنفيذ عبر ناجز": 300,
"قضية نفقة": 2500,
"قضية حضانة": 2500,
"قضية زيارة أبناء": 2500,
"قضية عمالية": 4000,
"مطالبة مالية حتى 100 ألف": 4000,
"قضية خلع": 2500,
"قضية فسخ نكاح": 4000,
"قضية مطالبة بأضرار مركبة": 3000,
     
/* الطلبات التي تحتاج إلى تسعير لاحق */
"طلب قضية غير موجودة": 0,
"طلب خدمة غير موجودة": 0   
}; 

    if (!cleanCustomerName || !cleanCustomerPhone || !cleanServiceName) {
  return res.status(400).json({
    success: false,
    error: "بيانات العميل والخدمة مطلوبة"
  });
}

if (!/^05\d{8}$/.test(cleanCustomerPhone)) {
  return res.status(400).json({
    success: false,
    error: "رقم الجوال غير صحيح"
  });
}

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        error: "إعدادات Supabase غير مكتملة"
      });
    }

   if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
    success: false,
    error: "RESEND_API_KEY غير موجود"
  });
}

const serverPrice = SERVICE_PRICES[cleanServiceName];

if (typeof serverPrice === "undefined") {
  return res.status(400).json({
    success: false,
    error: "الخدمة غير صحيحة"
  });
}

const isCustomCase =
  cleanServiceName === "طلب قضية غير موجودة";

const isCustomService =
  cleanServiceName === "طلب خدمة غير موجودة";

const isCaseRequest =
  cleanServiceType === "التوكيل في القضايا";

const requestSource = isCustomCase
  ? "custom_case"
  : isCustomService
    ? "custom_service"
    : isCaseRequest
      ? "cases"
      : "direct_services";

const requestPaymentStatus =
  isCustomCase || isCustomService
    ? "pending_quote"
    : "manual_pending";

const requestTitle = isCustomCase
  ? "طلب توكيل في قضية غير موجودة"
  : isCustomService
    ? "طلب خدمة قانونية غير موجودة"
    : isCaseRequest
      ? "طلب توكيل في قضية جديد"
      : "طلب خدمة مباشر جديد";
    
    const payload = {
      customer_name: cleanCustomerName,
customer_phone: cleanCustomerPhone,
service_type: cleanServiceType || null,
service_name: cleanServiceName,
    price: serverPrice,
payment_status: requestPaymentStatus,
source: requestSource,
      details: cleanDetails,
      attachments: Array.isArray(attachments) ? attachments : [],
      status: "new",
      priority: "normal"
    };

    const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/service_requests`, {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(payload)
    });

    const data = await supabaseRes.json();

    if (!supabaseRes.ok) {
  console.error("SUPABASE SERVICE REQUEST ERROR:", data);

  return res.status(500).json({
    success: false,
    error: "تعذر حفظ الطلب حاليًا"
  });
}

const savedRequest = data?.[0] || null;

const emailHtml = `
  <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.9;color:#1B2B36">
    <h2 style="color:#1B3A4B">${escapeHtml(requestTitle)} من منصة أعراف</h2>

    <p><strong>اسم العميل:</strong> ${escapeHtml(cleanCustomerName)}</p>
<p><strong>رقم الجوال:</strong> ${escapeHtml(cleanCustomerPhone)}</p>
<p><strong>نوع الخدمة:</strong> ${escapeHtml(cleanServiceType || cleanServiceName)}</p>
<p><strong>اسم الخدمة:</strong> ${escapeHtml(cleanServiceName)}</p>
    <p><strong>السعر:</strong> ${
  serverPrice === 0
    ? "يحدد بعد مراجعة الطلب"
    : `${escapeHtml(String(serverPrice))} ريال`
}</p>
    <p><strong>حالة الدفع:</strong> ${escapeHtml("manual_pending")}</p>
    <p><strong>المصدر:</strong> ${escapeHtml("direct_services")}</p>

    <hr style="border:none;border-top:1px solid #E5E7EB;margin:18px 0">

    <p><strong>تفاصيل الطلب:</strong></p>
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px;white-space:pre-wrap">
      ${escapeHtml(cleanDetails)}
    </div>

    <p><strong>المرفقات/أسماء الملفات:</strong></p>
    <p>${Array.isArray(attachments) && attachments.length ? attachments.map(escapeHtml).join("<br>") : "لا توجد مرفقات"}</p>

    <p style="margin-top:18px;color:#6B7280;font-size:13px">
      تم حفظ الطلب في قاعدة البيانات${savedRequest?.id ? ` — رقم السجل: ${escapeHtml(String(savedRequest.id))}` : ""}.
    </p>
  </div>
`;

const emailRes = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "Araf <orders@araf.online>",
   to: [
  process.env.SUPPORT_EMAIL || "ka89801@gmail.com",
  process.env.PARTNER_EMAIL || "bandaralbeshri@outlook.com"
].filter(Boolean),
    subject: `طلب خدمة مباشر جديد - ${cleanServiceName}`,
    html: emailHtml
  })
});

const emailData = await emailRes.json().catch(() => ({}));

if (!emailRes.ok) {
  console.error("RESEND SERVICE REQUEST ERROR:", emailData);

  return res.status(200).json({
    success: true,
    request: savedRequest,
    email_sent: false,
    warning: "تم حفظ الطلب، لكن تعذر إرسال الإشعار البريدي"
  });
}

return res.status(200).json({
  success: true,
  request: savedRequest,
  email_sent: true
});
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "خطأ غير متوقع"
    });
  }
}
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
