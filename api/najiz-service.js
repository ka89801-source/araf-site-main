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

  const form = new formidable.IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        return res.status(400).json({ error: 'تعذر قراءة الطلب' });
      }

      const name = fields.name?.[0];
      const phone = fields.phone?.[0];
      const subject = fields.subject?.[0];
      const details = fields.details?.[0];

      if (!name || !phone || !subject || !details) {
        return res.status(400).json({ error: 'بيانات ناقصة' });
      }

      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ error: 'RESEND_API_KEY غير موجود' });
      }

      // 1) جلب الاشتراك
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('phone', phone)
        .single();

      if (subError || !sub) {
        return res.status(400).json({ error: 'لا يوجد اشتراك' });
      }

      // 2) التحقق من الاستخدام
      if ((sub.najiz_used || 0) >= (sub.najiz_limit || 0)) {
        return res.status(400).json({
          error: 'تم استخدام خدمة ناجز في هذه الباقة',
        });
      }

      // 3) تجهيز المرفقات
      const attachments = [];

      if (files.files) {
        const uploaded = Array.isArray(files.files) ? files.files : [files.files];

        for (const file of uploaded) {
          const fileData = fs.readFileSync(file.filepath);
          attachments.push({
            filename: file.originalFilename || 'attachment',
            content: fileData.toString('base64'),
          });
        }
      }

      // 4) إرسال الإيميل عبر Resend
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

      if (!response.ok) {
        return res.status(500).json({
          error: resendData?.message || 'فشل إرسال البريد الإلكتروني',
          details: resendData,
        });
      }

      // 5) تحديث العداد فقط بعد نجاح الإرسال
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          najiz_used: (sub.najiz_used || 0) + 1,
        })
        .eq('phone', phone);

      if (updateError) {
        return res.status(500).json({
          error: 'تم إرسال البريد ولكن تعذر تحديث عداد الخدمة',
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
