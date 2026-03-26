"use client";

import { useEffect, useState } from "react";
import { getCurrentWorkerId, getWorker, getStore, getAttendances, getSchedules } from "@/lib/store";
import { calcMonthlyPay, formatWon } from "@/lib/pay-calculator";
import { Worker } from "@/lib/types";

export default function WorkerPayPage() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [payData, setPayData] = useState<ReturnType<typeof calcMonthlyPay> | null>(null);

  useEffect(() => {
    const id = getCurrentWorkerId();
    if (!id) return;
    const w = getWorker(id);
    setWorker(w || null);
  }, []);

  useEffect(() => {
    if (!worker) return;
    const store = getStore();
    if (!store) return;
    const data = calcMonthlyPay(worker, store, getAttendances(), getSchedules(), year, month);
    setPayData(data);
  }, [worker, year, month]);

  const store = getStore();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">급여 내역</h1>

      {/* Month Nav */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
          className="px-3 py-1 text-gray-500">◀</button>
        <p className="font-semibold">{year}년 {month}월</p>
        <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
          className="px-3 py-1 text-gray-500">▶</button>
      </div>

      {payData && (
        <>
          {/* Total */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center">
            <p className="text-emerald-200 text-sm">이번 달 급여</p>
            <p className="text-3xl font-bold mt-2">{formatWon(payData.totalPay)}</p>
            <p className="text-emerald-200 text-sm mt-1">{payData.totalHours.toFixed(1)}시간 근무</p>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h2 className="font-bold text-sm text-gray-700">급여 상세</h2>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">기본급</span>
                <span className="font-semibold">{formatWon(payData.totalBasePay)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-amber-600">주휴수당</span>
                <span className="font-semibold text-amber-700">{formatWon(payData.totalWeeklyHolidayPay)}</span>
              </div>
              {store?.options.nightPay && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-purple-600">야간수당</span>
                  <span className="font-semibold text-purple-700">{formatWon(payData.totalNightPay)}</span>
                </div>
              )}
              {store?.options.overtimePay && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-red-600">연장수당</span>
                  <span className="font-semibold text-red-700">{formatWon(payData.totalOvertimePay)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 pt-3 border-t border-gray-200">
                <span className="font-bold">합계</span>
                <span className="font-bold text-lg">{formatWon(payData.totalPay)}</span>
              </div>
            </div>
          </div>

          {/* Weekly Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-bold text-sm text-gray-700 mb-3">주간별 내역</h2>
            <div className="space-y-2">
              {payData.weeklySummaries.map((w, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{w.weekStart} 주</p>
                    <p className="text-xs text-gray-400">
                      {w.actualHours.toFixed(1)}시간
                      {w.isFullAttendance && w.scheduledHours >= 15 && <span className="text-amber-500 ml-1">· 주휴수당</span>}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">{formatWon(w.totalPay)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
