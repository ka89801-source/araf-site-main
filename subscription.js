export async function checkAndConsumeLimit({ supabase, phone, service }) {
  const { data: sub, error } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('phone', phone)
  .single();

if (error || !sub) {
  return { ok: false, status: 404, message: 'لا يوجد اشتراك لهذا المستخدم' };
}

const today = new Date();
const end = new Date(sub.end_date);

if (today > end) {
  const newEnd = new Date();
  newEnd.setMonth(newEnd.getMonth() + 1);

  await supabase
    .from('subscriptions')
    .update({
      assistant_used: 0,
      contracts_used: 0,
      analyzer_used: 0,
      start_date: today.toISOString(),
      end_date: newEnd.toISOString()
    })
    .eq('phone', phone);

  sub.assistant_used = 0;
  sub.contracts_used = 0;
  sub.analyzer_used = 0;
}
    .from('subscriptions')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error || !sub) {
    return { ok: false, status: 404, message: 'لا يوجد اشتراك لهذا المستخدم' };
  }

  const map = {
    assistant: {
      usedKey: 'assistant_used',
      limitKey: 'assistant_limit',
      message: 'انتهى حد المساعد القانوني'
    },
    contracts: {
      usedKey: 'contracts_used',
      limitKey: 'contracts_limit',
      message: 'انتهى حد توليد العقود'
    },
    analyzer: {
      usedKey: 'analyzer_used',
      limitKey: 'analyzer_limit',
      message: 'انتهى حد فحص العقود'
    }
  };

  const cfg = map[service];
  const used = sub[cfg.usedKey];
  const limit = sub[cfg.limitKey];

  if (used >= limit) {
    return { ok: false, status: 400, message: cfg.message };
  }

  await supabase
    .from('subscriptions')
    .update({
      [cfg.usedKey]: used + 1
    })
    .eq('phone', phone);

  return { ok: true };
}
