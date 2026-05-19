export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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

  try {
    const {
      customer_name,
      customer_phone,
      service_type,
      service_name,
      price,
      payment_status,
      source,
      details,
      attachments
    } = req.body || {};

    if (!customer_name || !customer_phone || !service_name) {
      return res.status(400).json({
        success: false,
        error: "بيانات العميل والخدمة مطلوبة"
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
    
    const payload = {
      customer_name,
      customer_phone,
      service_type: service_type || null,
      service_name,
      price: Number(price || 0),
      payment_status: payment_status || "manual_pending",
      source: source || "direct_services",
      details: details || "",
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
  return res.status(500).json({
    success: false,
    error: data?.message || "فشل حفظ الطلب في قاعدة البيانات",
    details: data
  });
}

const savedRequest = data?.[0] || null;

const emailHtml = `
  <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.9;color:#1B2B36">
    <h2 style="color:#1B3A4B">طلب خدمة مباشر جديد من منصة أعراف</h2>

    <p><strong>اسم العميل:</strong> ${escapeHtml(customer_name)}</p>
    <p><strong>رقم الجوال:</strong> ${escapeHtml(customer_phone)}</p>
    <p><strong>نوع الخدمة:</strong> ${escapeHtml(service_type || service_name)}</p>
    <p><strong>اسم الخدمة:</strong> ${escapeHtml(service_name)}</p>
    <p><strong>السعر:</strong> ${escapeHtml(String(price || 0))} ريال</p>
    <p><strong>حالة الدفع:</strong> ${escapeHtml(payment_status || "manual_pending")}</p>
    <p><strong>المصدر:</strong> ${escapeHtml(source || "direct_services")}</p>

    <hr style="border:none;border-top:1px solid #E5E7EB;margin:18px 0">

    <p><strong>تفاصيل الطلب:</strong></p>
    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px;white-space:pre-wrap">
      ${escapeHtml(details || "")}
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
    from: "Araf <onboarding@resend.dev>",
    to: [process.env.SUPPORT_EMAIL || "ka89801@gmail.com"],
    subject: `طلب خدمة مباشر جديد - ${service_name}`,
    html: emailHtml
  })
});

const emailData = await emailRes.json().catch(() => ({}));

if (!emailRes.ok) {
  return res.status(500).json({
    success: false,
    error: emailData?.message || "تم حفظ الطلب لكن فشل إرسال الإيميل",
    request: savedRequest,
    email_details: emailData
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
