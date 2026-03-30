// api/analyze-contract.js — Vercel Serverless Function
// Analyzes uploaded contracts for legal, commercial, operational, and drafting risks
// Output: structured Arabic analysis aligned with Saudi Arabian legal practice

export default async function handler(req, res) {
  // --- CORS ---
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

  // --- Validate input ---
  const { fileName, fileText } = req.body || {};

  if (!fileName || typeof fileName !== "string") {
    return res.status(400).json({
      success: false,
      error: "الحقل 'fileName' مطلوب ويجب أن يكون نصاً.",
    });
  }

  if (!fileText || typeof fileText !== "string") {
    return res.status(400).json({
      success: false,
      error: "الحقل 'fileText' مطلوب ويجب أن يحتوي على نص العقد.",
    });
  }

  if (fileText.trim().length < 50) {
    return res.status(400).json({
      success: false,
      error: "نص العقد قصير جداً ولا يكفي لإجراء تحليل قانوني.",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "خطأ في إعداد الخادم: مفتاح API غير موجود.",
    });
  }

  // --- System prompt ---
  const systemPrompt = `أنت محامٍ سعودي أول متخصص في مراجعة العقود وتحليل المخاطر القانونية. لديك خبرة واسعة في الأنظمة السعودية ذات الصلة بالعقود بما فيها:
- نظام العمل (المرسوم الملكي رقم م/51)
- نظام المعاملات المدنية
- نظام المحاكم التجارية
- نظام الشركات
- نظام الإيجار التمويلي
- نظام المنافسات والمشتريات الحكومية
- نظام التحكيم السعودي
- نظام مكافحة التستر التجاري
- الأنظمة واللوائح الأخرى ذات الصلة حسب نوع العقد

مهمتك: مراجعة العقد المقدم وإنتاج تحليل مخاطر شامل ومهني باللغة العربية.

قواعد التحليل:
1. حلّل العقد من أربع زوايا: قانونية، تجارية، تشغيلية، وصياغية.
2. صنّف المخاطر حسب شدتها (جوهرية / متوسطة / منخفضة).
3. انتبه بشكل خاص لهذه النقاط:
   - المسؤولية والتعويض
   - الشروط الجزائية والغرامات
   - الإنهاء وأحكامه
   - القانون الحاكم والاختصاص القضائي
   - آلية حل النزاعات
   - شروط الدفع والمقابل المالي
   - القوة القاهرة
   - السرية وعدم الإفشاء
   - الالتزامات المبهمة أو العامة
   - البنود أحادية الجانب أو المنحازة
   - الحماية الناقصة لأحد الأطراف
4. إذا تمكنت من تحديد نوع العقد، كيّف تحليلك وفقاً لذلك.
5. لا تختلق أرقام مواد نظامية إلا إذا كنت واثقاً منها. إذا لم تكن متأكداً، استخدم صياغة مثل "وفقاً لما قد تنص عليه الأنظمة ذات الصلة" بدلاً من ذكر رقم محدد.
6. كن دقيقاً ومحايداً ومهنياً. لا تبالغ في التخويف ولا تقلل من المخاطر الحقيقية.

هيكل التحليل المطلوب (بالترتيب):

1. عنوان التحليل
   اكتب عنواناً واضحاً يتضمن نوع العقد إن أمكن تحديده.

2. ملخص تنفيذي مختصر
   فقرة واحدة تلخّص الوضع العام للعقد وأبرز المخاطر.

3. تقييم عام للعقد
   تقييم شامل لجودة الصياغة، مدى الاكتمال، ومستوى الحماية القانونية.

4. المخاطر الجوهرية
   المخاطر التي قد تؤدي إلى خسائر مالية كبيرة أو نزاعات قانونية حادة أو بطلان بنود. لكل خطر: وصف المشكلة، موقعها في العقد إن أمكن، الأثر المحتمل، والتوصية.

5. المخاطر المتوسطة
   مخاطر تحتاج معالجة لكنها أقل حدة. نفس الهيكل أعلاه.

6. الثغرات والصياغات الضعيفة أو المبهمة
   بنود تحتمل أكثر من تفسير، أو صياغات فضفاضة قد تُستغل.

7. البنود الناقصة التي يُفضل إضافتها
   بنود معيارية غير موجودة في العقد وإضافتها تعزز الحماية.

8. البنود المنحازة ضد الطرف محل المراجعة
   بنود تميل بشكل واضح لصالح الطرف الآخر.

9. ملاحظات خاصة بالتوافق مع الأنظمة السعودية
   أي مخالفات محتملة أو نقاط تحتاج مراجعة لضمان التوافق النظامي.

10. توصيات عملية لتحسين العقد
    خطوات محددة وقابلة للتنفيذ لتحسين العقد.

11. صياغات بديلة مقترحة
    إذا وُجدت بنود ضعيفة أو خطرة، اقترح صياغات بديلة محسّنة.

12. خلاصة نهائية
    تقييم ختامي مع أولوية التعديلات المطلوبة.

تعليمات التنسيق:
- أرقام الأقسام واضحة (1. ، 2. ، إلخ).
- استخدم شُرط (-) للنقاط الفرعية داخل كل قسم.
- لا تستخدم رموز Markdown مثل # أو ** أو \`\`\`.
- أرجع نصاً عادياً مهيكلاً فقط.
- لا تضف شروحات أو تعليقات خارج نطاق التحليل.`;

  const userPrompt = `راجع العقد التالي وأنتج تحليل مخاطر شاملاً وفق الهيكل المطلوب.

اسم الملف: ${fileName}

نص العقد:
---
${fileText}
---

أنتج التحليل الكامل بجميع أقسامه الاثني عشر. نص عادي فقط بدون أي تنسيق Markdown.`;

  // --- Call OpenAI API ---
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", response.status, errorBody);

      const status = response.status;
      let userMessage = "فشل الاتصال بخدمة التحليل. حاول مرة أخرى.";
      if (status === 429) {
        userMessage = "تم تجاوز حد الاستخدام. انتظر قليلاً ثم حاول مرة أخرى.";
      } else if (status === 401) {
        userMessage = "خطأ في مصادقة الخادم مع خدمة التحليل.";
      }

      return res.status(502).json({
        success: false,
        error: userMessage,
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || content.trim().length < 100) {
      return res.status(502).json({
        success: false,
        error: "لم يتم الحصول على تحليل كافٍ من خدمة التحليل.",
      });
    }

    // --- Extract title and summary from content ---
    const fullText = content.trim();
    const lines = fullText.split("\n").filter((l) => l.trim());

    // Title: first meaningful line
    let title = "تحليل مخاطر العقد";
    for (const line of lines) {
      const cleaned = line.replace(/^1[\.\)]\s*/, "").replace(/^عنوان التحليل[:\s]*/i, "").trim();
      if (cleaned.length > 5) {
        title = cleaned;
        break;
      }
    }

    // Summary: find the executive summary section
    let summary = "";
    const summaryMarkers = ["ملخص تنفيذي", "الملخص التنفيذي"];
    const sectionMarkers = ["تقييم عام", "التقييم العام", "3."];

    const lowerText = fullText;
    for (const marker of summaryMarkers) {
      const idx = lowerText.indexOf(marker);
      if (idx !== -1) {
        // Find start of content after the marker line
        const afterMarker = lowerText.substring(idx);
        const firstNewline = afterMarker.indexOf("\n");
        if (firstNewline !== -1) {
          const rest = afterMarker.substring(firstNewline).trim();
          // Grab text until the next section
          let endIdx = rest.length;
          for (const sm of sectionMarkers) {
            const si = rest.indexOf(sm);
            if (si > 0 && si < endIdx) {
              endIdx = si;
            }
          }
          summary = rest.substring(0, endIdx).trim();
          // Keep only first paragraph if very long
          const parBreak = summary.indexOf("\n\n");
          if (parBreak > 50) {
            summary = summary.substring(0, parBreak).trim();
          }
          if (summary.length > 500) {
            summary = summary.substring(0, 500).trim() + "...";
          }
          break;
        }
      }
    }

    if (!summary) {
      summary = lines.slice(1, 4).join(" ").substring(0, 300).trim();
    }

    return res.status(200).json({
      success: true,
      title,
      summary,
      content: fullText,
    });
  } catch (err) {
    console.error("Contract analysis error:", err);
    return res.status(500).json({
      success: false,
      error: "حدث خطأ داخلي أثناء تحليل العقد. حاول مرة أخرى.",
    });
  }
}
