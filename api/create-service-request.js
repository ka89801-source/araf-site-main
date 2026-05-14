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

    const payload = {
      customer_name,
      customer_phone,
      service_type: service_type || null,
      service_name,
      price: Number(price || 0),
      payment_status: payment_status || "paid",
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

    return res.status(200).json({
      success: true,
      request: data?.[0] || null
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "خطأ غير متوقع"
    });
  }
}
