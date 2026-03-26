"use client";

import { useEffect, useState } from "react";
import { getWorkers, getStore, getAttendances, getSchedules } from "@/lib/store";
import { calcMonthlyPay, calcWeeklyHolidayPay, calcEstimatedWeeklyLaborCost, formatWon, getMonday } from "@/lib/pay-calculator";
import { Worker, Store } from "@/lib/types";

function getWeekDates(baseDate: Date): string[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date.toISOString().split('T')[0];
  });
}

export default function PayPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [payData, setPayData] = useState<Record<string, ReturnType<typeof calcMonthlyPay>>>({});

  useEffect(() => {
    const s = getStore();
    const w = getWorkers().filter(w => w.status === 'active');
    setStore(s);
    setWorkers(w);
  }, []);

  useEffect(() => {
    if (!store) return;
    const atts = getAttendances();
    const scheds = getSchedules();
    const data: Record<string, ReturnType<typeof calcMonthlyPay>> = {};
    workers.forEach(w => {
      data[w.id] = calcMonthlyPay(w, store, atts, scheds, year, month);
    });
    setPayData(data);
  }, [store, workers, year, month]);

  const totalAll = Object.values(payData).reduce((s, d) => s + d.totalPay, 0);

  // 예상 월 인건비 (스케줄 기반)
  const estimatedMonthly = (() => {
    if (!store) return 0;
    const scheds = getSchedules();
    const weekDates = getWeekDates(new Date());
    const cost = calcEstimatedWeeklyLaborCost(workers, store, scheds, weekDates);
    return Math.round(cost.total * 4.345);
  })();

  // 주휴수당 시뮬레이터
  const [showSimulator, setShowSimulator] = useState(false);

  const getWeeklyHolidayInfo = () => {
    const monday = getMonday(new Date());
    const scheds = getSchedules();
    return workers.map(w => {
      const allowances = w.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
      const weekScheds = scheds.filter(s => {
        const weekStart = new Date(monday);
        const weekEnd = new Date(monday);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const sDate = new Date(s.date);
        return s.workerId === w.id && sDate >= weekStart && sDate <= weekEnd;
      });
      let totalMin = 0;
      weekScheds.forEach(s => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        totalMin += (eh * 60 + em) - (sh * 60 + sm);
      });
      const hours = totalMin / 60;
      const holidayPay = allowances.weeklyHolidayPay
        ? calcWeeklyHolidayPay(hours, true, w.hourlyWage)
        : 0;
      return { worker: w, hours, holidayPay, isOver15: hours >= 15, allowances };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">급여 관리</h1>
        <button onClick={() => setShowSimulator(!showSimulator)} className="text-sm bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-medium">
          주휴수당 시뮬레이터
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
          className="px-3 py-1 text-gray-500 hover:text-gray-800">◀</button>
        <p className="font-semibold">{year}년 {month}월</p>
        <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
          className="px-3 py-1 text-gray-500 hover:text-gray-800">▶</button>
      </div>

      {/* Total + Estimated */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <p className="text-blue-200 text-sm">총 인건비</p>
        <p className="text-3xl font-bold mt-1">{formatWon(totalAll)}</p>
        {estimatedMonthly > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between">
              <span className="text-blue-200 text-xs">예상 월 인건비 (스케줄 기준)</span>
              <span className="text-sm font-semibold">{formatWon(estimatedMonthly)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Per Worker */}
      <div className="space-y-3">
        {workers.map(w => {
          const data = payData[w.id];
          if (!data) return null;
          const isMonthly = w.wageType === 'monthly';
          const allowances = w.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
          return (
            <div key={w.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center" style={{ background: w.color }}>
                    {w.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{w.name}</p>
                    <p className="text-xs text-gray-400">
                      {isMonthly ? `월급 ${formatWon(w.monthlyWage || 0)}` : `시급 ${formatWon(w.hourlyWage)}`}
                      {!isMonthly && ` · ${data.totalHours.toFixed(1)}시간`}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-lg">{formatWon(data.totalPay)}</p>
              </div>

              {isMonthly ? (
                <div className="bg-gray-50 rounded-lg p-2 text-xs">
                  <span className="text-gray-500">월 고정급</span>
                  <span className="float-right font-medium">{formatWon(data.totalBasePay)}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-500">기본급</span>
                    <span className="float-right font-medium">{formatWon(data.totalBasePay)}</span>
                  </div>
                  {allowances.weeklyHolidayPay && (
                    <div className="bg-amber-50 rounded-lg p-2">
                      <span className="text-amber-600">주휴수당</span>
                      <span className="float-right font-medium text-amber-700">{formatWon(data.totalWeeklyHolidayPay)}</span>
                    </div>
                  )}
                  {store?.options.nightPay && allowances.nightPay && (
                    <div className="bg-purple-50 rounded-lg p-2">
                      <span className="text-purple-600">야간수당</span>
                      <span className="float-right font-medium text-purple-700">{formatWon(data.totalNightPay)}</span>
                    </div>
                  )}
                  {store?.options.overtimePay && allowances.overtimePay && (
                    <div className="bg-red-50 rounded-lg p-2">
                      <span className="text-red-600">연장수당</span>
                      <span className="float-right font-medium text-red-700">{formatWon(data.totalOvertimePay)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Weekly Holiday Pay Simulator */}
      {showSimulator && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowSimulator(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">주휴수당 시뮬레이터</h3>
            <p className="text-xs text-gray-500 mb-4">이번 주 스케줄 기준 · 주 15시간 미만이면 주휴수당 미발생</p>

            {getWeeklyHolidayInfo().map(({ worker, hours, holidayPay, isOver15, allowances: a }) => (
              <div key={worker.id} className={`p-3 rounded-lg mb-2 ${
                !a.weeklyHolidayPay ? 'bg-gray-50 border border-gray-200' :
                isOver15 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: worker.color }}>
                      {worker.name[0]}
                    </div>
                    <span className="font-medium text-sm">{worker.name}</span>
                    {worker.wageType === 'monthly' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">월급제</span>}
                  </div>
                  <span className={`text-sm font-bold ${
                    !a.weeklyHolidayPay ? 'text-gray-500' :
                    isOver15 ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    주 {hours.toFixed(1)}시간
                  </span>
                </div>
                {!a.weeklyHolidayPay ? (
                  <p className="text-xs text-gray-500 mt-1">주휴수당 미적용 (설정 OFF)</p>
                ) : isOver15 ? (
                  <div className="mt-2 text-xs">
                    <p className="text-amber-700">주휴수당 발생: <strong>{formatWon(holidayPay)}</strong>/주</p>
                    <p className="text-amber-600 mt-1">→ {hours.toFixed(1)}h를 14.5h로 줄이면 주휴수당 {formatWon(holidayPay)} 절감</p>
                  </div>
                ) : (
                  <p className="text-xs text-green-700 mt-1">주휴수당 미발생 (15시간 미만)</p>
                )}
              </div>
            ))}

            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                총 주휴수당: <strong>{formatWon(getWeeklyHolidayInfo().reduce((s, i) => s + i.holidayPay, 0))}</strong>/주
              </p>
            </div>

            <p className="text-[10px] text-gray-400 mt-3">
              ※ 본 기능은 참고용이며, 근로기준법 준수를 권장합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
