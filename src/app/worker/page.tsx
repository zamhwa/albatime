"use client";

import { useEffect, useState } from "react";
import { getCurrentWorkerId, getWorker, getAttendances, getSchedules, getStore } from "@/lib/store";
import { calcMonthlyPay, formatWon } from "@/lib/pay-calculator";
import { Worker, Attendance, Schedule } from "@/lib/types";
import Link from "next/link";

export default function WorkerDashboard() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [todayAtt, setTodayAtt] = useState<Attendance | null>(null);
  const [nextSchedule, setNextSchedule] = useState<Schedule | null>(null);
  const [monthlyPay, setMonthlyPay] = useState(0);

  useEffect(() => {
    const id = getCurrentWorkerId();
    if (!id) return;
    const w = getWorker(id);
    if (!w) return;
    setWorker(w);

    const today = new Date().toISOString().split('T')[0];
    const atts = getAttendances().filter(a => a.workerId === id);
    const todayRecord = atts.find(a => a.clockIn.startsWith(today));
    setTodayAtt(todayRecord || null);

    const schedules = getSchedules().filter(s => s.workerId === id && s.date >= today);
    schedules.sort((a, b) => a.date.localeCompare(b.date));
    setNextSchedule(schedules[0] || null);

    const store = getStore();
    if (store) {
      const now = new Date();
      const data = calcMonthlyPay(w, store, getAttendances(), getSchedules(), now.getFullYear(), now.getMonth() + 1);
      setMonthlyPay(data.totalPay);
    }
  }, []);

  const getStatus = () => {
    if (!todayAtt) return { text: '출근 전', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
    if (!todayAtt.clockOut) return { text: '근무중', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' };
    return { text: '퇴근 완료', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' };
  };

  const status = getStatus();

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <p className="text-emerald-200 text-sm">안녕하세요</p>
        <h1 className="text-2xl font-bold mt-1">{worker?.name || ''}님</h1>
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${status.dot} animate-pulse`} />
          <span className="font-medium">{status.text}</span>
        </div>
        {todayAtt && (
          <div className="mt-2 text-emerald-100 text-sm">
            출근: {new Date(todayAtt.clockIn).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            {todayAtt.clockOut && (
              <span> · 퇴근: {new Date(todayAtt.clockOut).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
        )}
      </div>

      {/* Quick Action */}
      <Link href="/worker/scan" className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center hover:shadow-md transition">
        <div className="text-4xl mb-2">📷</div>
        <p className="font-bold text-lg">QR 스캔하기</p>
        <p className="text-gray-400 text-sm">출퇴근 체크</p>
      </Link>

      {/* Monthly Pay */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">이번 달 예상 급여</p>
            <p className="text-2xl font-bold mt-1">{formatWon(monthlyPay)}</p>
          </div>
          <Link href="/worker/pay" className="text-blue-600 text-sm font-medium">상세 →</Link>
        </div>
      </div>

      {/* Next Schedule */}
      {nextSchedule && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500 mb-2">다음 근무</p>
          <div className="flex items-center justify-between">
            <p className="font-semibold">{nextSchedule.date} ({['일','월','화','수','목','금','토'][new Date(nextSchedule.date).getDay()]})</p>
            <p className="text-sm text-gray-600">{nextSchedule.startTime} ~ {nextSchedule.endTime}</p>
          </div>
        </div>
      )}
    </div>
  );
}
