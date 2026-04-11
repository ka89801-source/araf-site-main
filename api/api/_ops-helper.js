import { createClient } from '@supabase/supabase-js';

export function getServiceLabel(serviceType) {
  const map = {
    consultation: 'استشارة محامٍ',
    memo: 'إعداد مذكرة قانونية',
    najiz: 'خدمات ناجز',
  };
  return map[serviceType] || serviceType;
}

export function getServiceCapability(serviceType) {
  const map = {
    consultation: 'can_consultation',
    memo: 'can_memo',
    najiz: 'can_najiz',
  };
  return map[serviceType] || null;
}

export function getPriorityFromSubject(subject = '') {
  const text = String(subject || '');
  if (text.includes('عاجل') || text.includes('مستعجل')) return 'high';
  return 'med';
}

export function createSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE env vars are missing');
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function pickEmployeeForService(supabase, serviceType) {
  const capability = getServiceCapability(serviceType);

  const { data: employees, error } = await supabase
    .from('ops_employees')
    .select('*')
    .eq('active', true)
    .order('current_open_count', { ascending: true })
    .order('last_assigned_at', { ascending: true, nullsFirst: true });

  if (error) throw error;

  let eligible = employees || [];

  if (capability) {
    eligible = eligible.filter(e => e[capability] === true);
  }

  if (!eligible.length) return null;
  if (eligible.length === 1) return eligible[0];

  eligible.sort((a, b) => {
    const aOpen = a.current_open_count || 0;
    const bOpen = b.current_open_count || 0;

    if (aOpen !== bOpen) return aOpen - bOpen;

    const aDate = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
    const bDate = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
    return aDate - bDate;
  });

  return eligible[0];
}

export async function createOpsRequest({
  serviceType,
  requestType,
  clientName,
  clientPhone,
  subject,
  details,
  sourceApi,
  attachmentsCount = 0,
}) {
  const supabase = createSupabaseAdmin();

  const now = new Date().toISOString();
  const chosenEmployee = await pickEmployeeForService(supabase, serviceType);

  const requestPayload = {
    service_type: serviceType,
    request_type: requestType || getServiceLabel(serviceType),
    client_name: clientName,
    client_phone: clientPhone,
    subject,
    details,
    priority: getPriorityFromSubject(subject),
    status: chosenEmployee ? 'assigned' : 'new',
    assigned_to: chosenEmployee ? chosenEmployee.id : null,
    source_api: sourceApi || null,
    source_user_phone: clientPhone,
    attachments_count: attachmentsCount,
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('ops_requests')
    .insert([requestPayload])
    .select()
    .single();

  if (insertError) throw insertError;

  const requestNo = `REQ-${String(inserted.created_at ? new Date(inserted.created_at).getTime() : Date.now()).slice(-6)}`;

  await supabase
    .from('ops_requests')
    .update({ request_no: requestNo })
    .eq('id', inserted.id);

  await supabase
    .from('ops_request_timeline')
    .insert([{
      request_id: inserted.id,
      action: 'وصل الطلب',
      meta: 'منصة العملاء',
      note: null,
      color: 'blue',
      created_at: now,
      created_by_name: 'النظام',
    }]);

  if (chosenEmployee) {
    await supabase
      .from('ops_request_timeline')
      .insert([{
        request_id: inserted.id,
        action: `أُسند الطلب تلقائيًا إلى ${chosenEmployee.full_name}`,
        meta: 'إسناد آلي',
        note: null,
        color: 'gold',
        created_at: now,
        created_by_name: 'النظام',
      }]);

    await supabase
      .from('ops_employees')
      .update({
        current_open_count: (chosenEmployee.current_open_count || 0) + 1,
        last_assigned_at: now,
      })
      .eq('id', chosenEmployee.id);
  }

  return {
    requestId: inserted.id,
    requestNo,
    assignedEmployee: chosenEmployee
      ? {
          id: chosenEmployee.id,
          full_name: chosenEmployee.full_name,
          username: chosenEmployee.username,
        }
      : null,
  };
}
