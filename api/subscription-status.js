const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const phone = String(req.query.phone || '').trim();

    if (!phone) {
      return res.status(400).json({ error: 'رقم الجوال مطلوب' });
    }

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !sub) {
      return res.status(404).json({ error: 'لا يوجد اشتراك لهذا المستخدم' });
    }

    return res.status(200).json({
      success: true,
      subscription: {
        plan_name: sub.plan_name,
        assistant_limit: sub.assistant_limit || 0,
        assistant_used: sub.assistant_used || 0,
        assistant_left: (sub.assistant_limit || 0) - (sub.assistant_used || 0),

        contracts_limit: sub.contracts_limit || 0,
        contracts_used: sub.contracts_used || 0,
        contracts_left: (sub.contracts_limit || 0) - (sub.contracts_used || 0),

        analyzer_limit: sub.analyzer_limit || 0,
        analyzer_used: sub.analyzer_used || 0,
        analyzer_left: (sub.analyzer_limit || 0) - (sub.analyzer_used || 0),

        consultation_limit: sub.consultation_limit || 0,
        consultation_used: sub.consultation_used || 0,
        consultation_left: (sub.consultation_limit || 0) - (sub.consultation_used || 0),

        najiz_limit: sub.najiz_limit || 0,
        najiz_used: sub.najiz_used || 0,
        najiz_left: (sub.najiz_limit || 0) - (sub.najiz_used || 0),
        
        start_date: sub.start_date,
        end_date: sub.end_date,
        status: sub.status
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
