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
    const { name, phone, problem } = req.body || {};

    const cleanName = String(name || "").trim().slice(0, 120);
    const cleanPhone = String(phone || "").trim();
    const cleanProblem = String(problem || "").trim().slice(0, 2000);

    if (!cleanName || !cleanPhone || !cleanProblem) {
      return res.status(400).json({
        success: false,
        error: "الاسم ورقم الجوال ووصف المشكلة مطلوبة"
      });
    }

    if (!/^05\d{8}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: "رقم الجوال غير صحيح"
      });
    }

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/support_tickets`, {
        method: "POST",
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          problem: cleanProblem,
          status: "new"
        })
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "RESEND_API_KEY غير موجود"
      });
    }

    const notificationEmails = [
      process.env.SUPPORT_EMAIL || "ka89801@gmail.com",
      process.env.PARTNER_EMAIL || "bandaralbeshri@outlook.com"
    ]
      .map(function(email) {
        return String(email || "").trim();
      })
      .filter(Boolean)
      .filter(function(email, index, array) {
        return array.indexOf(email) === index;
      });

    const emailHtml = `
      <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.9;color:#1B2B36">
        <h2 style="color:#1B3A4B">طلب دعم فني جديد من منصة أعراف</h2>

        <p><strong>الاسم:</strong> ${escapeHtml(cleanName)}</p>
        <p><strong>رقم الجوال:</strong> ${escapeHtml(cleanPhone)}</p>

        <hr style="border:none;border-top:1px solid #eee;margin:18px 0">

        <h3 style="color:#1B3A4B">وصف المشكلة:</h3>
        <p style="white-space:pre-wrap">${escapeHtml(cleanProblem)}</p>

        <hr style="border:none;border-top:1px solid #eee;margin:18px 0">

        <p style="font-size:12px;color:#777">
          تم إرسال هذا الطلب من نموذج الدعم الفني في منصة أعراف.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Araf Support <orders@araf.online>",
        to: notificationEmails,
        subject: "طلب دعم فني جديد - منصة أعراف",
        html: emailHtml
      })
    });

    const resendData = await resendRes.json().catch(function() {
      return {};
    });

    if (!resendRes.ok) {
      return res.status(500).json({
        success: false,
        error: resendData?.message || "فشل إرسال البريد"
      });
    }

    return res.status(200).json({
      success: true
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
