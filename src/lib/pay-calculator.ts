import { Attendance, Worker, Store, Schedule, BreakRule, WeeklyPaySummary } from './types';

// 휴게시간 자동 계산
export function calcBreakMinutes(totalMinutes: number, rules: BreakRule[]): number {
  const sorted = [...rules].sort((a, b) => b.minHours - a.minHours);
  for (const rule of sorted) {
    if (totalMinutes >= rule.minHours * 60) return rule.breakMinutes;
  }
  return 0;
}

// 실근무시간 계산 (분)
export function calcActualMinutes(clockIn: string, clockOut: string, breakMinutes: number, roundingRule: string): number {
  const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  let totalMin = Math.floor(diffMs / 60000) - breakMinutes;
  if (totalMin < 0) totalMin = 0;

  // 절사 규칙
  const roundMap: Record<string, number> = { '5min': 5, '10min': 10, '15min': 15, '30min': 30 };
  const roundUnit = roundMap[roundingRule];
  if (roundUnit) totalMin = Math.floor(totalMin / roundUnit) * roundUnit;

  return totalMin;
}

// 야간시간 계산 (22:00~06:00 사이 근무 분)
export function calcNightMinutes(clockIn: string, clockOut: string): number {
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  let nightMin = 0;
  const cur = new Date(start);

  while (cur < end) {
    const h = cur.getHours();
    if (h >= 22 || h < 6) nightMin++;
    cur.setMinutes(cur.getMinutes() + 1);
  }
  return nightMin;
}

// 연장근로시간 (일 8시간 초과분)
export function calcOvertimeMinutes(actualMinutes: number): number {
  return Math.max(0, actualMinutes - 480);
}

// 일급 계산
export function calcDayPay(
  attendance: Attendance,
  worker: Worker,
  store: Store,
): { basePay: number; nightPay: number; overtimePay: number; totalPay: number } {
  if (!attendance.clockOut) return { basePay: 0, nightPay: 0, overtimePay: 0, totalPay: 0 };

  // 월급제: 수당은 월급에 포함된 것으로 간주, 일별 분배하지 않음
  if (worker.wageType === 'monthly') {
    return { basePay: 0, nightPay: 0, overtimePay: 0, totalPay: 0 };
  }

  const allowances = worker.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
  const wagePerMin = worker.hourlyWage / 60;
  const actual = attendance.actualWorkMinutes;

  // 기본급
  let baseMinutes = actual;
  let overtimeMin = 0;
  let nightMin = 0;
  let nightPay = 0;
  let overtimePay = 0;

  // 연장근로 (매장 설정 + 개인 설정 모두 켜져있어야)
  if (store.options.overtimePay && allowances.overtimePay) {
    overtimeMin = calcOvertimeMinutes(actual);
    baseMinutes = actual - overtimeMin;
    overtimePay = Math.round(overtimeMin * wagePerMin * (store.options.overtimePayRate - 1));
  }

  // 야간수당
  if (store.options.nightPay && allowances.nightPay) {
    nightMin = calcNightMinutes(attendance.clockIn, attendance.clockOut);
    nightPay = Math.round(nightMin * wagePerMin * (store.options.nightPayRate - 1));
  }

  const basePay = Math.round(actual * wagePerMin);
  const totalPay = basePay + nightPay + overtimePay;

  return { basePay, nightPay, overtimePay, totalPay };
}

// 주휴수당 계산
// 조건: 주 15시간 이상 + 소정근로일 개근
export function calcWeeklyHolidayPay(
  weeklyScheduledHours: number,
  isFullAttendance: boolean,
  hourlyWage: number
): number {
  if (weeklyScheduledHours < 15 || !isFullAttendance) return 0;
  const hours = Math.min(weeklyScheduledHours, 40);
  return Math.round((hours / 40) * 8 * hourlyWage);
}

// 주간 요약 계산
export function calcWeeklySummary(
  worker: Worker,
  store: Store,
  attendances: Attendance[],
  schedules: Schedule[],
  weekStart: string, // YYYY-MM-DD (월요일)
): WeeklyPaySummary {
  const weekStartDate = new Date(weekStart);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  // 해당 주 스케줄
  const weekSchedules = schedules.filter(s => s.workerId === worker.id && weekDates.includes(s.date));
  let scheduledMinutes = 0;
  weekSchedules.forEach(s => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    scheduledMinutes += (eh * 60 + em) - (sh * 60 + sm);
  });
  const scheduledHours = scheduledMinutes / 60;

  // 해당 주 출퇴근 기록
  const weekAttendances = attendances.filter(a =>
    a.workerId === worker.id && weekDates.some(d => a.clockIn.startsWith(d))
  );

  let totalActualMin = 0;
  let totalBasePay = 0;
  let totalNightPay = 0;
  let totalOvertimePay = 0;

  weekAttendances.forEach(a => {
    if (!a.clockOut) return;
    totalActualMin += a.actualWorkMinutes;
    const day = calcDayPay(a, worker, store);
    totalBasePay += day.basePay;
    totalNightPay += day.nightPay;
    totalOvertimePay += day.overtimePay;
  });

  // 개근 여부: 스케줄이 있는 날에 출퇴근 기록이 있는지
  const scheduledDates = weekSchedules.map(s => s.date);
  const attendedDates = weekAttendances.filter(a => a.clockOut).map(a => a.clockIn.split('T')[0]);
  const isFullAttendance = scheduledDates.length > 0 && scheduledDates.every(d => attendedDates.includes(d));

  const allowances = worker.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
  const weeklyHolidayPay = allowances.weeklyHolidayPay
    ? calcWeeklyHolidayPay(scheduledHours, isFullAttendance, worker.hourlyWage)
    : 0;

  return {
    workerId: worker.id,
    workerName: worker.name,
    weekStart,
    scheduledHours,
    actualHours: totalActualMin / 60,
    isFullAttendance,
    basePay: totalBasePay,
    weeklyHolidayPay,
    nightPay: totalNightPay,
    overtimePay: totalOvertimePay,
    totalPay: totalBasePay + weeklyHolidayPay + totalNightPay + totalOvertimePay,
  };
}

// 월요일 구하기
export function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// 월간 급여 계산
export function calcMonthlyPay(
  worker: Worker,
  store: Store,
  attendances: Attendance[],
  schedules: Schedule[],
  year: number,
  month: number // 1-12
): { weeklySummaries: WeeklyPaySummary[]; totalPay: number; totalBasePay: number; totalWeeklyHolidayPay: number; totalNightPay: number; totalOvertimePay: number; totalHours: number } {
  // 월급제: 고정 월급 반환
  if (worker.wageType === 'monthly') {
    return {
      weeklySummaries: [],
      totalPay: worker.monthlyWage || 0,
      totalBasePay: worker.monthlyWage || 0,
      totalWeeklyHolidayPay: 0,
      totalNightPay: 0,
      totalOvertimePay: 0,
      totalHours: 0,
    };
  }

  // 해당 월의 모든 월요일
  const mondays: string[] = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  let cur = new Date(firstDay);
  const firstMonday = getMonday(cur);
  cur = new Date(firstMonday);

  while (cur <= lastDay) {
    const monday = cur.toISOString().split('T')[0];
    mondays.push(monday);
    cur.setDate(cur.getDate() + 7);
  }

  const weeklySummaries = mondays.map(m => calcWeeklySummary(worker, store, attendances, schedules, m));

  return {
    weeklySummaries,
    totalPay: weeklySummaries.reduce((s, w) => s + w.totalPay, 0),
    totalBasePay: weeklySummaries.reduce((s, w) => s + w.basePay, 0),
    totalWeeklyHolidayPay: weeklySummaries.reduce((s, w) => s + w.weeklyHolidayPay, 0),
    totalNightPay: weeklySummaries.reduce((s, w) => s + w.nightPay, 0),
    totalOvertimePay: weeklySummaries.reduce((s, w) => s + w.overtimePay, 0),
    totalHours: weeklySummaries.reduce((s, w) => s + w.actualHours, 0),
  };
}

// 스케줄 기반 예상 주간 인건비 계산
export function calcEstimatedWeeklyLaborCost(
  workers: Worker[],
  store: Store,
  schedules: Schedule[],
  weekDates: string[],
): { perWorker: { worker: Worker; hours: number; estimatedPay: number }[]; total: number } {
  const perWorker = workers.map(w => {
    if (w.wageType === 'monthly') {
      // 월급제: 월급 / 4.345주 (평균 주수)
      const weeklyPay = Math.round((w.monthlyWage || 0) / 4.345);
      const weekScheds = schedules.filter(s => s.workerId === w.id && weekDates.includes(s.date));
      let totalMin = 0;
      weekScheds.forEach(s => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        totalMin += (eh * 60 + em) - (sh * 60 + sm);
      });
      return { worker: w, hours: totalMin / 60, estimatedPay: weeklyPay };
    }

    // 시급제
    const weekScheds = schedules.filter(s => s.workerId === w.id && weekDates.includes(s.date));
    let totalMin = 0;
    let nightMin = 0;
    weekScheds.forEach(s => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      totalMin += mins;

      // 야간 시간 추정 (22:00~06:00)
      const allowances = w.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
      if (store.options.nightPay && allowances.nightPay) {
        const startH = sh;
        const endH = eh;
        // 간단 추정: 22시 이후 또는 6시 이전 근무
        for (let h = startH; h < endH; h++) {
          if (h >= 22 || h < 6) nightMin += 60;
        }
      }
    });

    const hours = totalMin / 60;
    const basePay = Math.round(hours * w.hourlyWage);

    // 주휴수당 추정
    const allowances = w.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
    const weeklyHolidayPay = allowances.weeklyHolidayPay
      ? calcWeeklyHolidayPay(hours, true, w.hourlyWage)
      : 0;

    // 야간수당 추정
    const nightPay = (store.options.nightPay && allowances.nightPay)
      ? Math.round((nightMin / 60) * w.hourlyWage * (store.options.nightPayRate - 1))
      : 0;

    // 연장수당 추정 (일별 8시간 초과)
    let overtimePay = 0;
    if (store.options.overtimePay && allowances.overtimePay) {
      weekScheds.forEach(s => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins > 480) {
          overtimePay += Math.round(((mins - 480) / 60) * w.hourlyWage * (store.options.overtimePayRate - 1));
        }
      });
    }

    const estimatedPay = basePay + weeklyHolidayPay + nightPay + overtimePay;
    return { worker: w, hours, estimatedPay };
  });

  return { perWorker, total: perWorker.reduce((s, p) => s + p.estimatedPay, 0) };
}

// 숫자 포맷 (원)
export function formatWon(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

// 시간 포맷
export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}
