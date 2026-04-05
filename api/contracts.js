import { createClient } from '@supabase/supabase-js';

// api/contracts.js — Vercel Serverless Function
// Generates professional Arabic contracts aligned with Saudi Arabian law

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // --- CORS headers (for frontend calls) ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  // --- Validate request body ---
  const { contractType, formData, phone } = req.body || {};

  if (!contractType || typeof contractType !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid 'contractType'.",
    });
  }

  if (!formData || typeof formData !== "object") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid 'formData'.",
    });
  }

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({
      success: false,
      error: "رقم الجوال مفقود.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Server configuration error: missing OpenAI API key.",
    });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      success: false,
      error: "Server configuration error: missing Supabase credentials.",
    });
  }

  // --- Check subscription ---
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("phone", phone)
    .single();

  if (subError || !sub) {
    return res.status(403).json({
      success: false,
      error: "لا يوجد اشتراك لهذا المستخدم.",
    });
  }

  if ((sub.contracts_used || 0) >= (sub.contracts_limit || 0)) {
    return res.status(403).json({
      success: false,
      error: "لقد استهلكت الحد المسموح به لإنشاء العقود.",
    });
  }

  // --- Contract type labels (Arabic) ---
  const typeLabels = {
    employment: "عقد عمل",
    nda: "اتفاقية عدم إفشاء",
    lease: "عقد إيجار",
    rental: "عقد إيجار",
    service: "عقد تقديم خدمات",
    partnership: "عقد شراكة",
    sale: "عقد بيع",
    consulting: "عقد استشارات",
    freelance: "عقد عمل حر",
    termination: "اتفاقية إنهاء خدمات",
    loan: "عقد قرض",
  };

  const arabicType = typeLabels[contractType.toLowerCase()] || contractType;

  // --- Build the prompt ---
  const systemPrompt = `أنت محامٍ سعودي متخصص في صياغة العقود القانونية. مهمتك كتابة عقود احترافية باللغة العربية الفصحى القانونية، متوافقة تماماً مع أنظمة المملكة العربية السعودية ولوائحها التنفيذية.

قواعد الصياغة:
1. استخدم لغة عربية قانونية رسمية واضحة ودقيقة.
2. كل عقد يجب أن يتضمن هذه الأقسام بالترتيب:
   - عنوان العقد
   - مقدمة (التمهيد)
   - بيانات الأطراف كاملة
   - التعريفات (إن لزم الأمر)
   - البنود والأحكام الرئيسية
   - الالتزامات المتبادلة
   - المقابل المالي (إن وُجد)
   - المدة والتجديد والإنهاء
   - السرية (إن انطبقت)
   - القوة القاهرة
   - حل النزاعات (الجهات القضائية في المملكة العربية السعودية)
   - القانون الحاكم: أنظمة المملكة العربية السعودية
   - أحكام عامة وختامية
   - التوقيعات (الطرف الأول / الطرف الثاني مع مكان للاسم والتوقيع والتاريخ)
3. رقّم جميع البنود (المادة الأولى، المادة الثانية، إلخ).
4. لا تستخدم Markdown أو رموز تنسيق. أرجع نصاً عادياً فقط.
5. لا تضف شروحات أو تعليقات أو ملاحظات خارج نص العقد.
6. أدرج الإشارات النظامية المناسبة حسب نوع العقد.
7. إذا كان عقد عمل: اعتمد على نظام العمل السعودي وتعديلاته، واستخدم مصطلح "إنهاء العقد" بدلاً من "الاستقالة" في العقود غير محددة المدة عند الاقتضاء.

أرجع النص الكامل للعقد فقط، بدون أي إضافات.`;

  const userPrompt = `اكتب ${arabicType} احترافياً وكاملاً بناءً على البيانات التالية:

${JSON.stringify(formData, null, 2)}

اكتب العقد كاملاً بجميع أقسامه. نص عادي فقط بدون أي تنسيق Markdown.`;

  try {
    // --- Call OpenAI API ---
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", response.status, errorData);
      return res.status(502).json({
        success: false,
        error: "فشل الاتصال بخدمة توليد العقود. حاول مرة أخرى.",
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        success: false,
        error: "لم يتم الحصول على محتوى من خدمة التوليد.",
      });
    }

    // --- Extract title from first line ---
    const lines = content.trim().split("\n");
    const contractTitle = lines[0].trim() || arabicType;

    // --- Update subscription usage ---
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        contracts_used: (sub.contracts_used || 0) + 1,
      })
      .eq("phone", phone);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return res.status(500).json({
        success: false,
        error: "تم توليد العقد لكن فشل تحديث عداد الاشتراك.",
      });
    }

    return res.status(200).json({
      success: true,
      contractTitle,
      content: content.trim(),
    });
  } catch (err) {
    console.error("Contract generation error:", err);
    return res.status(500).json({
      success: false,
      error: "حدث خطأ داخلي أثناء توليد العقد. حاول مرة أخرى.",
    });
  }
}
