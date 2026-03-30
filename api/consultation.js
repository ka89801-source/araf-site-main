export const config = {
  api: {
    bodyParser: false
  }
};

import formidable from "formidable";
import fs from "fs";

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

      if (!name || !phone || !subject || !details) {
        return res.status(400).json({
          success: false,
          error: "أكمل جميع الحقول المطلوبة"
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

      // مؤقتًا: تسجيل الطلب في الـ logs
      console.log("=== CONSULTATION REQUEST ===");
      console.log("Name:", name);
      console.log("Phone:", phone);
      console.log("Subject:", subject);
      console.log("Details:", details);
      console.log(
        "Files:",
        uploadedFiles.map(f => ({
          originalFilename: f.originalFilename,
          mimetype: f.mimetype,
          size: f.size
        }))
      );

      return res.status(200).json({
        success: true,
        message: "تم إرسال طلب الاستشارة بنجاح، وسيتواصل معك الموظف المختص خلال أقرب وقت"
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
