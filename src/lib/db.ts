import { supabase } from './supabase';
import type { Store, Worker, Attendance, Schedule, Contract, SalesRecord, StoreOptions, BreakRule, WorkerAllowances } from './types';

// ── Store ──
export async function getStore(storeId: string): Promise<Store | null> {
  const { data } = await supabase.from('stores').select('*').eq('id', storeId).single();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    businessType: data.business_type,
    address: data.address,
    breakRules: data.break_rules as BreakRule[],
    payPeriodStart: data.pay_period_start,
    options: data.options as StoreOptions,
  };
}

export async function saveStore(storeId: string, store: Partial<Store>): Promise<void> {
  await supabase.from('stores').update({
    name: store.name,
    business_type: store.businessType,
    address: store.address,
    break_rules: store.breakRules,
    pay_period_start: store.payPeriodStart,
    options: store.options,
  }).eq('id', storeId);
}

export async function createStore(ownerId: string, name: string, businessType: string): Promise<string> {
  const { data, error } = await supabase.from('stores').insert({
    owner_id: ownerId,
    name,
    business_type: businessType,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

// ── Workers ──
export async function getWorkers(storeId: string): Promise<Worker[]> {
  const { data } = await supabase
    .from('workers')
    .select('*')
    .eq('store_id', storeId)
    .order('joined_at');
  return (data || []).map(mapWorker);
}

export async function getWorker(workerId: string): Promise<Worker | null> {
  const { data } = await supabase.from('workers').select('*').eq('id', workerId).single();
  return data ? mapWorker(data) : null;
}

export async function getWorkerByUserId(storeId: string, userId: string): Promise<Worker | null> {
  const { data } = await supabase
    .from('workers')
    .select('*')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .single();
  return data ? mapWorker(data) : null;
}

function mapWorker(d: any): Worker {
  return {
    id: d.id,
    storeId: d.store_id,
    name: d.name,
    phone: d.phone,
    wageType: d.wage_type || 'hourly',
    hourlyWage: d.hourly_wage,
    monthlyWage: d.monthly_wage || 0,
    status: d.status,
    joinedAt: d.joined_at,
    color: d.color,
    allowances: d.allowances as WorkerAllowances || {
      weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true,
    },
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export async function saveWorker(storeId: string, worker: Partial<Worker> & { id?: string }): Promise<void> {
  if (worker.id) {
    await supabase.from('workers').update({
      name: worker.name,
      phone: worker.phone,
      wage_type: worker.wageType,
      hourly_wage: worker.hourlyWage,
      monthly_wage: worker.monthlyWage,
      allowances: worker.allowances,
      status: worker.status,
    }).eq('id', worker.id);
  } else {
    const existing = await getWorkers(storeId);
    await supabase.from('workers').insert({
      store_id: storeId,
      name: worker.name,
      phone: worker.phone,
      wage_type: worker.wageType || 'hourly',
      hourly_wage: worker.hourlyWage ?? 10030,
      monthly_wage: worker.monthlyWage ?? 0,
      color: COLORS[existing.length % COLORS.length],
      allowances: worker.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true },
    });
  }
}

export async function deleteWorker(workerId: string): Promise<void> {
  await supabase.from('workers').delete().eq('id', workerId);
}

// ── Attendances ──
export async function getAttendances(storeId: string): Promise<Attendance[]> {
  const { data: workers } = await supabase.from('workers').select('id').eq('store_id', storeId);
  if (!workers || workers.length === 0) return [];
  const workerIds = workers.map(w => w.id);
  const { data } = await supabase
    .from('attendances')
    .select('*')
    .in('worker_id', workerIds)
    .order('clock_in', { ascending: false });
  return (data || []).map(mapAttendance);
}

export async function getAttendancesByWorker(workerId: string): Promise<Attendance[]> {
  const { data } = await supabase
    .from('attendances')
    .select('*')
    .eq('worker_id', workerId)
    .order('clock_in', { ascending: false });
  return (data || []).map(mapAttendance);
}

export async function getAttendancesByDate(storeId: string, date: string): Promise<Attendance[]> {
  const { data: workers } = await supabase.from('workers').select('id').eq('store_id', storeId);
  if (!workers || workers.length === 0) return [];
  const workerIds = workers.map(w => w.id);
  const { data } = await supabase
    .from('attendances')
    .select('*')
    .in('worker_id', workerIds)
    .gte('clock_in', `${date}T00:00:00`)
    .lt('clock_in', `${date}T23:59:59`);
  return (data || []).map(mapAttendance);
}

function mapAttendance(d: any): Attendance {
  return {
    id: d.id,
    workerId: d.worker_id,
    clockIn: d.clock_in,
    clockOut: d.clock_out,
    breakMinutes: d.break_minutes,
    actualWorkMinutes: d.actual_work_minutes,
    method: d.method,
    note: d.note,
  };
}

export async function saveAttendance(att: Partial<Attendance> & { workerId: string }): Promise<Attendance> {
  if (att.id) {
    const { data } = await supabase.from('attendances').update({
      clock_out: att.clockOut,
      break_minutes: att.breakMinutes,
      actual_work_minutes: att.actualWorkMinutes,
      note: att.note,
    }).eq('id', att.id).select('*').single();
    return mapAttendance(data);
  } else {
    const { data } = await supabase.from('attendances').insert({
      worker_id: att.workerId,
      clock_in: att.clockIn || new Date().toISOString(),
      clock_out: att.clockOut || null,
      break_minutes: att.breakMinutes ?? 0,
      actual_work_minutes: att.actualWorkMinutes ?? 0,
      method: att.method || 'qr',
      note: att.note || '',
    }).select('*').single();
    return mapAttendance(data!);
  }
}

// ── Schedules ──
export async function getSchedules(storeId: string): Promise<Schedule[]> {
  const { data: workers } = await supabase.from('workers').select('id').eq('store_id', storeId);
  if (!workers || workers.length === 0) return [];
  const workerIds = workers.map(w => w.id);
  const { data } = await supabase
    .from('schedules')
    .select('*')
    .in('worker_id', workerIds);
  return (data || []).map(mapSchedule);
}

export async function getSchedulesByWorker(workerId: string): Promise<Schedule[]> {
  const { data } = await supabase.from('schedules').select('*').eq('worker_id', workerId);
  return (data || []).map(mapSchedule);
}

function mapSchedule(d: any): Schedule {
  return {
    id: d.id,
    workerId: d.worker_id,
    date: d.date,
    startTime: d.start_time?.slice(0, 5) || '09:00',
    endTime: d.end_time?.slice(0, 5) || '18:00',
  };
}

export async function saveSchedule(sched: Partial<Schedule> & { workerId: string }): Promise<void> {
  if (sched.id) {
    await supabase.from('schedules').update({
      date: sched.date,
      start_time: sched.startTime,
      end_time: sched.endTime,
    }).eq('id', sched.id);
  } else {
    await supabase.from('schedules').insert({
      worker_id: sched.workerId,
      date: sched.date,
      start_time: sched.startTime,
      end_time: sched.endTime,
    });
  }
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  await supabase.from('schedules').delete().eq('id', scheduleId);
}

// ── Contracts ──
export async function getContracts(storeId: string): Promise<Contract[]> {
  const { data } = await supabase
    .from('contracts')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  return (data || []).map(d => ({
    id: d.id,
    workerId: d.worker_id,
    startDate: d.start_date,
    endDate: d.end_date,
    workLocation: d.work_location,
    jobDescription: d.job_description,
    workDays: d.work_days,
    workHours: d.work_hours as { start: string; end: string },
    breakTime: d.break_time,
    hourlyWage: d.hourly_wage,
    payDay: d.pay_day,
    payMethod: d.pay_method,
    ownerSignature: d.owner_signature,
    workerSignature: d.worker_signature,
    signedAt: d.signed_at,
    status: d.status,
  }));
}

export async function saveContract(storeId: string, contract: Partial<Contract>): Promise<void> {
  if (contract.id) {
    await supabase.from('contracts').update({
      worker_id: contract.workerId,
      start_date: contract.startDate,
      end_date: contract.endDate,
      work_location: contract.workLocation,
      job_description: contract.jobDescription,
      work_days: contract.workDays,
      work_hours: contract.workHours,
      break_time: contract.breakTime,
      hourly_wage: contract.hourlyWage,
      pay_day: contract.payDay,
      pay_method: contract.payMethod,
      owner_signature: contract.ownerSignature,
      worker_signature: contract.workerSignature,
      signed_at: contract.signedAt,
      status: contract.status,
    }).eq('id', contract.id);
  } else {
    await supabase.from('contracts').insert({
      store_id: storeId,
      worker_id: contract.workerId,
      start_date: contract.startDate,
      end_date: contract.endDate || null,
      work_location: contract.workLocation || '',
      job_description: contract.jobDescription || '',
      work_days: contract.workDays || [],
      work_hours: contract.workHours || { start: '09:00', end: '18:00' },
      break_time: contract.breakTime ?? 60,
      hourly_wage: contract.hourlyWage ?? 10030,
      pay_day: contract.payDay ?? 10,
      pay_method: contract.payMethod || '계좌이체',
      status: 'draft',
    });
  }
}

// ── Sales Records ──
export async function getSalesRecords(storeId: string): Promise<SalesRecord[]> {
  const { data } = await supabase
    .from('sales_records')
    .select('*')
    .eq('store_id', storeId)
    .order('date', { ascending: false });
  return (data || []).map(d => ({
    id: d.id,
    storeId: d.store_id,
    date: d.date,
    amount: d.amount,
    memo: d.memo,
  }));
}

export async function saveSalesRecord(storeId: string, record: Partial<SalesRecord>): Promise<void> {
  if (record.id) {
    await supabase.from('sales_records').update({
      date: record.date,
      amount: record.amount,
      memo: record.memo,
    }).eq('id', record.id);
  } else {
    await supabase.from('sales_records').insert({
      store_id: storeId,
      date: record.date,
      amount: record.amount ?? 0,
      memo: record.memo || '',
    });
  }
}

// ── QR Secret ──
export async function getQrSecret(storeId: string): Promise<string> {
  const { data } = await supabase.from('stores').select('qr_secret').eq('id', storeId).single();
  return data?.qr_secret || '';
}

// ── Invite Codes ──
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createInviteCode(storeId: string, workerId?: string): Promise<string> {
  const code = generateCode();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // 7일 유효
  await supabase.from('invite_codes').insert({
    store_id: storeId,
    worker_id: workerId || null,
    code,
    expires_at: expires.toISOString(),
  });
  return code;
}

export async function useInviteCode(code: string, userId: string): Promise<{ success: boolean; error?: string; storeId?: string }> {
  const { data } = await supabase
    .from('invite_codes')
    .select('*, stores(name)')
    .eq('code', code.toUpperCase())
    .eq('used', false)
    .single();

  if (!data) return { success: false, error: '유효하지 않은 초대코드입니다.' };
  if (new Date(data.expires_at) < new Date()) return { success: false, error: '만료된 초대코드입니다.' };

  // 특정 알바생에게 발급된 코드면 user_id 연결
  if (data.worker_id) {
    await supabase.from('workers').update({ user_id: userId }).eq('id', data.worker_id);
  } else {
    // 일반 초대코드면 프로필 정보로 알바생 생성
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    const existing = await getWorkers(data.store_id);
    await supabase.from('workers').insert({
      store_id: data.store_id,
      user_id: userId,
      name: profile?.name || '',
      phone: profile?.phone || '',
      color: COLORS[existing.length % COLORS.length],
    });
  }

  // 코드 사용 처리
  await supabase.from('invite_codes').update({ used: true }).eq('id', data.id);

  return { success: true, storeId: data.store_id };
}

// ── Store Search ──
export async function searchStores(query: string): Promise<{ id: string; name: string; businessType: string }[]> {
  const { data } = await supabase
    .from('stores')
    .select('id, name, business_type')
    .ilike('name', `%${query}%`)
    .limit(10);
  return (data || []).map(d => ({ id: d.id, name: d.name, businessType: d.business_type }));
}
