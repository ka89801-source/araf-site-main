import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getFieldValue(field) {
  if (Array.isArray(field)) return field[0];
  return field;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST only' });
  }

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        return res.status(400).json({ error: 'تعذر قراءة الطلب' });
      }

      const name = getFieldValue(fields.name)?.trim();
      const phone = getFieldValue(fields.phone)?.trim();
      const subject = getFieldValue(fields.subject)?.trim();
      const details = getFieldValue(fields.details)?.trim();

      if (!name || !phone || !subject || !details) {
        return res.status(400).json({ error: 'بيانات ناقصة' });
      }

      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ error: 'RESEND_API_KEY غير موجود' });
      }

      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('phone', phone)
        .single();

      if (subError || !sub) {
        return res.status(400).json({ error: 'لا يوجد اشتراك لهذا المستخدم' });
      }

      if ((sub.memo_used || 0) >= (sub.memo_limit || 0)) {
        return res.status(400).json({
          error: 'تم استخدام خدمة إعداد المذكرة في هذه الباقة',
        });
      }

      const attachments = [];
      const uploadedFiles = files.files
        ? (Array.isArray(files.files) ? files.files : [files.files])
        : [];

      for (const file of uploadedFiles) {
        const fileData = fs.readFileSync(file.filepath);
        attachments.push({
          filename: file.originalFilename || 'attachment',
          content: fileData.toString('base64'),
        });
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Araf <onboarding@resend.dev>',
          to: ['ka89801@gmail.com'],
          subject: `طلب إعداد مذكرة قانونية - ${subject}`,
          html: `
            <h2>طلب جديد - إعداد مذكرة قانونية</h2>
            <p><b>الاسم:</b> ${name}</p>
            <p><b>رقم الجوال:</b> ${phone}</p>
            <p><b>الموضوع:</b> ${subject}</p>
            <p><b>التفاصيل:</b></p>
            <p>${details}</p>
          `,
          attachments,
        }),
      });

      const resendData = await response.json();

      if (!response.ok) {
        return res.status(500).json({
          error: resendData?.message || 'فشل إرسال البريد الإلكتروني',
          details: resendData,
        });
      }

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          memo_used: (sub.memo_used || 0) + 1,
        })
        .eq('phone', phone);

      if (updateError) {
        return res.status(500).json({
          error: 'تم إرسال الطلب ولكن تعذر تحديث عداد المذكرة',
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({
        error: error.message || 'Server error',
      });
    }
  });
}
