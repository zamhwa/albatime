export interface Store {
  id: string;
  name: string;
  businessType: string;
  address: string;
  breakRules: BreakRule[];
  payPeriodStart: number; // 급여 정산 시작일
  options: StoreOptions;
}

export interface StoreOptions {
  nightPay: boolean;       // 야간수당 적용
  overtimePay: boolean;    // 연장근로수당 적용
  holidayPay: boolean;     // 휴일근로수당 적용
  nightPayRate: number;    // 야간수당 배율 (기본 1.5)
  overtimePayRate: number; // 연장수당 배율 (기본 1.5)
  holidayPayRate: number;  // 휴일수당 배율 (기본 1.5)
  roundingRule: 'none' | '5min' | '10min' | '15min' | '30min';
}

export interface BreakRule {
  minHours: number;   // 최소 근무시간
  breakMinutes: number; // 휴게시간(분)
}

export interface Worker {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  wageType: 'hourly' | 'monthly';  // 시급/월급
  hourlyWage: number;               // 시급 (시급제일 때 사용)
  monthlyWage: number;              // 월급 (월급제일 때 사용)
  status: 'active' | 'inactive';
  joinedAt: string;
  color: string;
  allowances: WorkerAllowances;     // 개별 수당 적용 여부
}

export interface WorkerAllowances {
  weeklyHolidayPay: boolean;  // 주휴수당
  nightPay: boolean;          // 야간수당
  overtimePay: boolean;       // 연장근로수당
  holidayPay: boolean;        // 휴일근로수당
}

export interface Attendance {
  id: string;
  workerId: string;
  clockIn: string;   // ISO string
  clockOut: string | null;
  breakMinutes: number;
  actualWorkMinutes: number;
  method: 'qr' | 'manual';
  note?: string;
}

export interface Schedule {
  id: string;
  workerId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
}

export interface Contract {
  id: string;
  workerId: string;
  startDate: string;
  endDate: string | null;
  workLocation: string;
  jobDescription: string;
  workDays: string[];
  workHours: { start: string; end: string };
  breakTime: number;
  hourlyWage: number;
  payDay: number;
  payMethod: string;
  ownerSignature: string | null;
  workerSignature: string | null;
  signedAt: string | null;
  status: 'draft' | 'sent' | 'signed';
}

export interface SalesRecord {
  id: string;
  storeId: string;
  date: string;
  amount: number;
  memo: string;
}

export interface WeeklyPaySummary {
  workerId: string;
  workerName: string;
  weekStart: string;
  scheduledHours: number;
  actualHours: number;
  isFullAttendance: boolean;
  basePay: number;
  weeklyHolidayPay: number;
  nightPay: number;
  overtimePay: number;
  totalPay: number;
}
