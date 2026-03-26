"use client";

import { Store, Worker, WorkerAllowances, Attendance, Schedule, Contract, SalesRecord, StoreOptions } from './types';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  STORE: 'albacheck_store',
  WORKERS: 'albacheck_workers',
  ATTENDANCES: 'albacheck_attendances',
  SCHEDULES: 'albacheck_schedules',
  CONTRACTS: 'albacheck_contracts',
  SALES: 'albacheck_sales',
  QR_SECRET: 'albacheck_qr_secret',
  ROLE: 'albacheck_role',
  CURRENT_WORKER: 'albacheck_current_worker',
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

function set(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Role ──
export function getRole(): 'owner' | 'worker' | null {
  return get<'owner' | 'worker' | null>(KEYS.ROLE, null);
}
export function setRole(role: 'owner' | 'worker') {
  set(KEYS.ROLE, role);
}

// ── Current Worker (for worker mode) ──
export function getCurrentWorkerId(): string | null {
  return get<string | null>(KEYS.CURRENT_WORKER, null);
}
export function setCurrentWorkerId(id: string) {
  set(KEYS.CURRENT_WORKER, id);
}

// ── Store ──
const defaultOptions: StoreOptions = {
  nightPay: false,
  overtimePay: false,
  holidayPay: false,
  nightPayRate: 1.5,
  overtimePayRate: 1.5,
  holidayPayRate: 1.5,
  roundingRule: 'none',
};

export function getStore(): Store | null {
  return get<Store | null>(KEYS.STORE, null);
}

export function saveStore(store: Partial<Store>): Store {
  const existing = getStore();
  const merged: Store = {
    id: existing?.id || uuidv4(),
    name: store.name || existing?.name || '',
    businessType: store.businessType || existing?.businessType || '카페',
    address: store.address || existing?.address || '',
    breakRules: store.breakRules || existing?.breakRules || [
      { minHours: 4, breakMinutes: 30 },
      { minHours: 8, breakMinutes: 60 },
    ],
    payPeriodStart: store.payPeriodStart || existing?.payPeriodStart || 1,
    options: { ...defaultOptions, ...existing?.options, ...store.options },
  };
  set(KEYS.STORE, merged);
  return merged;
}

// ── Workers ──
export function getWorkers(): Worker[] {
  return get<Worker[]>(KEYS.WORKERS, []);
}

export function getWorker(id: string): Worker | undefined {
  return getWorkers().find(w => w.id === id);
}

const defaultAllowances: WorkerAllowances = {
  weeklyHolidayPay: true,
  nightPay: true,
  overtimePay: true,
  holidayPay: true,
};

export function saveWorker(worker: Partial<Worker>): Worker {
  const workers = getWorkers();
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
  const existing = workers.find(w => w.id === worker.id);
  const newWorker: Worker = {
    id: worker.id || uuidv4(),
    storeId: worker.storeId || getStore()?.id || '',
    name: worker.name || existing?.name || '',
    phone: worker.phone || existing?.phone || '',
    wageType: worker.wageType || existing?.wageType || 'hourly',
    hourlyWage: worker.hourlyWage ?? existing?.hourlyWage ?? 10030,
    monthlyWage: worker.monthlyWage ?? existing?.monthlyWage ?? 0,
    status: worker.status || existing?.status || 'active',
    joinedAt: worker.joinedAt || existing?.joinedAt || new Date().toISOString(),
    color: worker.color || existing?.color || colors[workers.length % colors.length],
    allowances: { ...defaultAllowances, ...existing?.allowances, ...worker.allowances },
  };
  const idx = workers.findIndex(w => w.id === newWorker.id);
  if (idx >= 0) workers[idx] = newWorker;
  else workers.push(newWorker);
  set(KEYS.WORKERS, workers);
  return newWorker;
}

export function deleteWorker(id: string) {
  set(KEYS.WORKERS, getWorkers().filter(w => w.id !== id));
}

// ── Attendances ──
export function getAttendances(): Attendance[] {
  return get<Attendance[]>(KEYS.ATTENDANCES, []);
}

export function getAttendancesByWorker(workerId: string): Attendance[] {
  return getAttendances().filter(a => a.workerId === workerId);
}

export function getAttendancesByDate(date: string): Attendance[] {
  return getAttendances().filter(a => a.clockIn.startsWith(date));
}

export function saveAttendance(att: Partial<Attendance>): Attendance {
  const atts = getAttendances();
  const existing = atts.find(a => a.id === att.id);
  const newAtt: Attendance = {
    id: att.id || uuidv4(),
    workerId: att.workerId || existing?.workerId || '',
    clockIn: att.clockIn || existing?.clockIn || new Date().toISOString(),
    clockOut: att.clockOut !== undefined ? att.clockOut : (existing?.clockOut || null),
    breakMinutes: att.breakMinutes ?? existing?.breakMinutes ?? 0,
    actualWorkMinutes: att.actualWorkMinutes ?? existing?.actualWorkMinutes ?? 0,
    method: att.method || existing?.method || 'qr',
    note: att.note || existing?.note,
  };
  const idx = atts.findIndex(a => a.id === newAtt.id);
  if (idx >= 0) atts[idx] = newAtt;
  else atts.push(newAtt);
  set(KEYS.ATTENDANCES, atts);
  return newAtt;
}

// ── Schedules ──
export function getSchedules(): Schedule[] {
  return get<Schedule[]>(KEYS.SCHEDULES, []);
}

export function getSchedulesByDate(date: string): Schedule[] {
  return getSchedules().filter(s => s.date === date);
}

export function getSchedulesByWorker(workerId: string): Schedule[] {
  return getSchedules().filter(s => s.workerId === workerId);
}

export function saveSchedule(schedule: Partial<Schedule>): Schedule {
  const schedules = getSchedules();
  const newSchedule: Schedule = {
    id: schedule.id || uuidv4(),
    workerId: schedule.workerId || '',
    date: schedule.date || '',
    startTime: schedule.startTime || '09:00',
    endTime: schedule.endTime || '18:00',
  };
  const idx = schedules.findIndex(s => s.id === newSchedule.id);
  if (idx >= 0) schedules[idx] = newSchedule;
  else schedules.push(newSchedule);
  set(KEYS.SCHEDULES, schedules);
  return newSchedule;
}

export function deleteSchedule(id: string) {
  set(KEYS.SCHEDULES, getSchedules().filter(s => s.id !== id));
}

// ── Contracts ──
export function getContracts(): Contract[] {
  return get<Contract[]>(KEYS.CONTRACTS, []);
}

export function saveContract(contract: Partial<Contract>): Contract {
  const contracts = getContracts();
  const existing = contracts.find(c => c.id === contract.id);
  const newContract: Contract = {
    id: contract.id || uuidv4(),
    workerId: contract.workerId || existing?.workerId || '',
    startDate: contract.startDate || existing?.startDate || '',
    endDate: contract.endDate !== undefined ? contract.endDate : (existing?.endDate || null),
    workLocation: contract.workLocation || existing?.workLocation || '',
    jobDescription: contract.jobDescription || existing?.jobDescription || '',
    workDays: contract.workDays || existing?.workDays || [],
    workHours: contract.workHours || existing?.workHours || { start: '09:00', end: '18:00' },
    breakTime: contract.breakTime ?? existing?.breakTime ?? 60,
    hourlyWage: contract.hourlyWage ?? existing?.hourlyWage ?? 10030,
    payDay: contract.payDay ?? existing?.payDay ?? 10,
    payMethod: contract.payMethod || existing?.payMethod || '계좌이체',
    ownerSignature: contract.ownerSignature !== undefined ? contract.ownerSignature : (existing?.ownerSignature || null),
    workerSignature: contract.workerSignature !== undefined ? contract.workerSignature : (existing?.workerSignature || null),
    signedAt: contract.signedAt !== undefined ? contract.signedAt : (existing?.signedAt || null),
    status: contract.status || existing?.status || 'draft',
  };
  const idx = contracts.findIndex(c => c.id === newContract.id);
  if (idx >= 0) contracts[idx] = newContract;
  else contracts.push(newContract);
  set(KEYS.CONTRACTS, contracts);
  return newContract;
}

// ── Sales ──
export function getSalesRecords(): SalesRecord[] {
  return get<SalesRecord[]>(KEYS.SALES, []);
}

export function saveSalesRecord(record: Partial<SalesRecord>): SalesRecord {
  const records = getSalesRecords();
  const newRecord: SalesRecord = {
    id: record.id || uuidv4(),
    storeId: record.storeId || getStore()?.id || '',
    date: record.date || '',
    amount: record.amount ?? 0,
    memo: record.memo || '',
  };
  const idx = records.findIndex(r => r.id === newRecord.id);
  if (idx >= 0) records[idx] = newRecord;
  else records.push(newRecord);
  set(KEYS.SALES, records);
  return newRecord;
}

// ── QR Secret ──
export function getQrSecret(): string {
  let secret = get<string>(KEYS.QR_SECRET, '');
  if (!secret) {
    secret = uuidv4();
    set(KEYS.QR_SECRET, secret);
  }
  return secret;
}
