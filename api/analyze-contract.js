// api/analyze-contract.js
import pdf from "pdf-parse";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Use POST only",
    });
  }

  const { fileName, fileBase64, fileText, phone } = req.body || {};

  if (!fileName) {
    return res.status(400).json({
      success: false,
      error: "اسم الملف مطلوب",
    });
  }

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({
      success: false,
      error: "رقم الجوال مفقود",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "OPENAI_API_KEY غير موجود",
    });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      success: false,
      error: "بيانات Supabase غير مكتملة",
    });
  }

  // ===== التحقق من الاشتراك =====
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("phone", phone)
    .single();

  if (subError || !sub) {
    return res.status(403).json({
      success: false,
      error: "لا يوجد اشتراك لهذا المستخدم",
    });
  }

  if ((sub.analyzer_used || 0) >= (sub.analyzer_limit || 0)) {
    return res.status(403).json({
      success: false,
      error: "لقد استهلكت الحد المسموح به لفحص العقود",
    });
  }

  let text = "";

  try {
    // ===== PDF =====
    if (fileBase64) {
      const buffer = Buffer.from(fileBase64, "base64");
      const data = await pdf(buffer);
      text = data.text;
    }

    // ===== TEXT =====
    if (!text && fileText) {
      text = fileText;
    }

    if (!text || text.length < 50) {
      return res.status(400).json({
        success: false,
        error: "تعذر قراءة محتوى العقد",
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "فشل قراءة الملف",
    });
  }

  // ===== PROMPT =====
  const system = `
أنت محامٍ سعودي خبير في تحليل العقود.

قم بتحليل العقد من الناحية:
- القانونية
- التجارية
- التشغيلية
- الصياغية

التزم بالهيكل التالي:

1. عنوان التحليل
2. ملخص تنفيذي
3. تقييم عام
4. المخاطر الجوهرية
5. المخاطر المتوسطة
6. الثغرات
7. البنود الناقصة
8. البنود المنحازة
9. التوافق مع الأنظمة السعودية
10. توصيات
11. صياغات بديلة
12. خلاصة

اكتب بأسلوب قانوني احترافي عربي.
لا تستخدم Markdown.
`;

  const user = `
اسم الملف: ${fileName}

نص العقد:
${text}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 6000,
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    if (!response.ok || !content) {
      return res.status(500).json({
        success: false,
        error: "فشل التحليل",
      });
    }

    const lines = content.split("\n").filter(l => l.trim());
    const title = lines[0] || "تحليل مخاطر العقد";
    const summary = lines.slice(1, 4).join(" ").substring(0, 300);

    // ===== تحديث العداد بعد النجاح =====
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        analyzer_used: (sub.analyzer_used || 0) + 1
      })
      .eq("phone", phone);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: "تم التحليل لكن فشل تحديث عداد الاشتراك",
      });
    }

    return res.status(200).json({
      success: true,
      title,
      summary,
      content,
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "خطأ أثناء التحليل",
    });
  }
}
