export const config = {
  api: {
    bodyParser: false
  }
};

import formidable from "formidable";
import fs from "fs";
import nodemailer from "nodemailer";

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

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({
      success: false,
      error: "EMAIL_USER أو EMAIL_PASS غير موجود"
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

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const attachments = uploadedFiles.map(file => ({
        filename: file.originalFilename || "attachment",
        content: fs.readFileSync(file.filepath)
      }));

      const mailSubject = `طلب استشارة جديد - ${subject}`;

      const mailHtml = `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9">
          <h2>طلب استشارة جديد</h2>
          <p><strong>الاسم:</strong> ${name}</p>
          <p><strong>رقم الجوال:</strong> ${phone}</p>
          <p><strong>الموضوع:</strong> ${subject}</p>
          <p><strong>تفاصيل الاستشارة:</strong></p>
          <div style="padding:12px;border:1px solid #ddd;border-radius:8px;white-space:pre-wrap">${details}</div>
          <p><strong>عدد المرفقات:</strong> ${uploadedFiles.length}</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: mailSubject,
        html: mailHtml,
        attachments
      });

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
