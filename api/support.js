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
    const { name, phone, problem } = req.body || {};

    if (!name || !phone || !problem) {
      return res.status(400).json({
        success: false,
        error: "الاسم ورقم الجوال ووصف المشكلة مطلوبة"
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "RESEND_API_KEY غير موجود"
      });
    }

    const toEmail = process.env.SUPPORT_EMAIL || "ضع_ايميلك_هنا@example.com";

    const emailHtml = `
      <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.9;color:#1B2B36">
        <h2 style="color:#1B3A4B">طلب دعم فني جديد من منصة أعراف</h2>

        <p><strong>الاسم:</strong> ${escapeHtml(name)}</p>
        <p><strong>رقم الجوال:</strong> ${escapeHtml(phone)}</p>

        <hr style="border:none;border-top:1px solid #eee;margin:18px 0">

        <h3 style="color:#1B3A4B">وصف المشكلة:</h3>
        <p style="white-space:pre-wrap">${escapeHtml(problem)}</p>

        <hr style="border:none;border-top:1px solid #eee;margin:18px 0">

        <p style="font-size:12px;color:#777">
          تم إرسال هذا الطلب من نموذج الدعم الفني في صفحة أعراف الترحيبية.
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
        from: "Aaraf Support <onboarding@resend.dev>",
        to: [toEmail],
        subject: "طلب دعم فني جديد - منصة أعراف",
        html: emailHtml
      })
    });

    const resendData = await resendRes.json();

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
