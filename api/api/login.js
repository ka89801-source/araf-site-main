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

    return res.status(200).json({
      success: true,
      user: newUser,
      isNew: true
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
