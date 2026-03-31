export const config = {
  api: {
    bodyParser: false
  }
};

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

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
      error: "Use POST only"
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "RESEND_API_KEY غير موجود"
    });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({
      success: false,
      error: "بيانات Supabase غير موجودة"
    });
  }

  const form = formidable({
    multiples: true,
    maxFiles: 6,
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          error: "تعذر قراءة الطلب"
        });
      }

      const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
      const phone = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone;
      const subject = Array.isArray(fields.subject) ? fields.subject[0] : fields.subject;
      const details = Array.isArray(fields.details) ? fields.details[0] : fields.details;
      const requestType = Array.isArray(fields.request_type) ? fields.request_type[0] : fields.request_type;

      if (!name || !phone || !subject || !details) {
        return res.status(400).json({
          success: false,
          error: "أكمل جميع الحقول المطلوبة"
        });
      }

      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      const { data: sub, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("phone", phone)
        .single();

      if (subError || !sub) {
        return res.status(400).json({
          success: false,
          error: "لا يوجد اشتراك لهذا المستخدم"
        });
      }

      if ((sub.consultation_used || 0) >= (sub.consultation_limit || 0)) {
        return res.status(400).json({
          success: false,
          error: "انتهى حد استشارات المحامين"
        });
      }

      const uploadedFiles = files.files
        ? (Array.isArray(files.files) ? files.files : [files.files])
        : [];

      if (uploadedFiles.length > 6) {
        return res.status(400).json({
          success: false,
          error: "الحد الأقصى للمرفقات هو 6 ملفات"
        });
      }

      const attachments = uploadedFiles.map(file => ({
        filename: file.originalFilename || "attachment",
        content: fs.readFileSync(file.filepath).toString("base64")
      }));

      const mailHtml = `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9">
          <h2>${requestType || "طلب جديد"}</h2>
          <p><strong>الاسم:</strong> ${name}</p>
          <p><strong>رقم الجوال:</strong> ${phone}</p>
          <p><strong>الموضوع:</strong> ${subject}</p>
          <p><strong>تفاصيل الاستشارة:</strong></p>
          <div style="padding:12px;border:1px solid #ddd;border-radius:8px;white-space:pre-wrap">${details}</div>
          <p><strong>عدد المرفقات:</strong> ${uploadedFiles.length}</p>
        </div>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Araf <onboarding@resend.dev>",
          to: ["ka89801@gmail.com"],
          subject: `طلب استشارة جديد - ${subject}`,
          html: mailHtml,
          attachments
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Resend error:", errorText);
        return res.status(500).json({
          success: false,
          error: "فشل إرسال الإيميل"
        });
      }

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          consultation_used: (sub.consultation_used || 0) + 1
        })
        .eq("phone", phone);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        return res.status(500).json({
          success: false,
          error: "تم إرسال الطلب لكن تعذر تحديث عداد الاستشارات"
        });
      }

      return res.status(200).json({
        success: true,
        message: "تم إرسال طلب الاستشارة بنجاح"
      });

    } catch (e) {
      console.error(e);
      return res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء إرسال الطلب"
      });
    }
  });
}
