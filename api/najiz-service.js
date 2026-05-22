import formidable from 'formidable';
import fs from 'fs';
import { createOpsRequest } from './_ops-helper.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getFieldValue(field) {
  if (Array.isArray(field)) return field[0];
  return field;
}

export default async function handler(req, res) {
  const allowedOrigins = [
  "https://www.araf.online",
  "https://www.araf.online"
];

const origin = req.headers.origin;

if (allowedOrigins.includes(origin)) {
  res.setHeader("Access-Control-Allow-Origin", origin);
}

res.setHeader("Vary", "Origin");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST only' });
  }

  const form = formidable({
  multiples: true,
  maxFiles: 6,
  maxFileSize: 5 * 1024 * 1024,
  allowEmptyFiles: false,
  filter: function ({ mimetype }) {
    return [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ].includes(mimetype);
  }
});

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error('FORMIDABLE ERROR:', err);
        return res.status(400).json({ error: 'تعذر قراءة الطلب', details: err.message });
      }

      const name = getFieldValue(fields.name)?.trim();
      const phone = getFieldValue(fields.phone)?.trim();
      const subject = getFieldValue(fields.subject)?.trim();
      const details = getFieldValue(fields.details)?.trim();

      console.log('NAJIZ FIELDS:', { name, phone, subject, detailsPresent: !!details });

      if (!name || !phone || !subject || !details) {
        return res.status(400).json({ error: 'بيانات ناقصة' });
      }

      if (!process.env.RESEND_API_KEY) {
        console.error('MISSING RESEND_API_KEY');
        return res.status(500).json({ error: 'RESEND_API_KEY غير موجود' });
      }

      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('MISSING SUPABASE ENV');
        return res.status(500).json({ error: 'بيانات Supabase غير مكتملة' });
      }
      const attachments = [];
      const uploadedFiles = files.files
        ? (Array.isArray(files.files) ? files.files : [files.files])
        : [];
      
if (uploadedFiles.length > 6) {
  return res.status(400).json({
    error: "الحد الأقصى للمرفقات هو 6 ملفات"
  });
}
      for (const file of uploadedFiles) {
        const fileData = fs.readFileSync(file.filepath);
        attachments.push({
          filename: file.originalFilename || 'attachment',
          content: fileData.toString('base64'),
        });
      }

      console.log('ATTACHMENTS COUNT:', attachments.length);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Araf <onboarding@resend.dev>',
          to: ['ka89801@gmail.com'],
          subject: `طلب خدمة ناجز - ${subject}`,
          html: `
            <h2>طلب جديد - خدمات ناجز</h2>
            <p><b>الاسم:</b> ${name}</p>
            <p><b>رقم الجوال:</b> ${phone}</p>
            <p><b>الموضوع:</b> ${subject}</p>
            <p><b>تفاصيل الطلب:</b></p>
            <p>${details}</p>
          `,
          attachments,
        }),
      });

      const resendData = await response.json();
      console.log('RESEND STATUS:', response.status);
      console.log('RESEND RESPONSE:', resendData);

      if (!response.ok) {
        return res.status(500).json({
          error: resendData?.message || 'فشل إرسال البريد الإلكتروني',
          details: resendData,
        });
      }
const opsResult = await createOpsRequest({
  serviceType: 'najiz',
  requestType: 'خدمات ناجز',
  clientName: name,
  clientPhone: phone,
  subject,
  details,
  sourceApi: 'najiz-service',
  attachmentsCount: uploadedFiles.length,
});
      return res.status(200).json({
  success: true,
  message: 'تم إرسال طلب ناجز بنجاح',
  ops_request: opsResult
});
    } catch (error) {
      console.error('NAJIZ API ERROR:', error);
      return res.status(500).json({
        error: error.message || 'Server error',
        details: String(error.stack || ''),
      });
    }
  });
}
