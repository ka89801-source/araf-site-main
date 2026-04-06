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
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST only" });
  }

  const form = new formidable.IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    try {
      const phone = fields.phone?.[0];
      const details = fields.details?.[0];

      if (!phone || !details) {
        return res.status(400).json({ error: "بيانات ناقصة" });
      }

      // 1. جلب الاشتراك
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('phone', phone)
        .single();

      if (!sub) {
        return res.status(400).json({ error: "لا يوجد اشتراك" });
      }

      // 2. التحقق من الاستخدام
      if (sub.najiz_used >= sub.najiz_limit) {
        return res.status(400).json({
          error: "تم استخدام خدمة ناجز في هذه الباقة",
        });
      }

      // 3. تجهيز المرفقات
      let attachments = [];

      if (files.files) {
        const uploaded = Array.isArray(files.files)
          ? files.files
          : [files.files];

        for (let file of uploaded) {
          const fileData = fs.readFileSync(file.filepath);
          attachments.push({
            filename: file.originalFilename,
            content: fileData.toString("base64"),
          });
        }
      }

      // 4. إرسال إيميل (Resend)
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Araf <onboarding@resend.dev>",
          to: ["ka89801@gmail.com"], // عدلها
          subject: "طلب خدمة ناجز",
          html: `
            <h2>طلب جديد - خدمات ناجز</h2>
            <p><b>رقم الجوال:</b> ${phone}</p>
            <p><b>تفاصيل الطلب:</b></p>
            <p>${details}</p>
          `,
          attachments,
        }),
      });

      // 5. تحديث العداد
      await supabase
        .from('subscriptions')
        .update({
          najiz_used: sub.najiz_used + 1,
        })
        .eq('phone', phone);

      return res.json({ success: true });

    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
}
