const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { full_name, phone } = req.body || {};

   if (!full_name || !phone) {
  return res.status(400).json({
    success: false,
    error: "الاسم ورقم الجوال مطلوبان"
  });
}

if (!/^0\d{9}$/.test(phone)) {
  return res.status(400).json({
    success: false,
    error: "رقم الجوال غير صحيح، يجب أن يتكون من 10 أرقام ويبدأ بـ 0"
  });
} 

    if (!full_name || !phone) {
      return res.status(400).json({ error: 'الاسم ورقم الجوال مطلوبان' });
    }

    const cleanName = String(full_name).trim();
    const cleanPhone = String(phone).trim();

    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (findError) {
      return res.status(500).json({ error: findError.message });
    }

    if (existingUser) {
      return res.status(200).json({
        success: true,
        user: existingUser,
        isNew: false
      });
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          full_name: cleanName,
          phone: cleanPhone
        }
      ])
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    const today = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const { error: subError } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: newUser.id,
          phone: cleanPhone,
          plan_name: 'basic',
          status: 'active',

          assistant_limit: 10,
          assistant_used: 0,

          contracts_limit: 5,
          contracts_used: 0,

          analyzer_limit: 5,
          analyzer_used: 0,

          consultation_limit: 10,
          consultation_used: 0,

          memo_limit: 1,
          memo_used: 0,

          najiz_limit: 1,
          najiz_used: 0,

          start_date: today.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10)
        }
      ]);

    if (subError) {
      return res.status(500).json({ error: subError.message });
    }

    return res.status(200).json({
      success: true,
      user: newUser,
      isNew: true
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
