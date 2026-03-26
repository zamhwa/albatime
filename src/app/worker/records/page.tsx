"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getWorkerByUserId, getAttendancesByWorker } from "@/lib/db";
import { formatHours } from "@/lib/pay-calculator";
import { Attendance } from "@/lib/types";

export default function RecordsPage() {
  const { currentStore, user } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [workerId, setWorkerId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentStore || !user) return;
    const loadWorker = async () => {
      const w = await getWorkerByUserId(currentStore.id, user.id);
      if (w) setWorkerId(w.id);
    };
    loadWorker();
  }, [currentStore, user]);

  useEffect(() => {
    if (!workerId) return;
    const loadRecords = async () => {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const atts = await getAttendancesByWorker(workerId);
      const filtered = atts
        .filter(a => a.clockIn.startsWith(monthStr))
        .sort((a, b) => b.clockIn.localeCompare(a.clockIn));
      setRecords(filtered);
    };
    loadRecords();
  }, [workerId, month, year]);

  if (!currentStore || !user) return null;

  const totalMinutes = records.reduce((s, r) => s + r.actualWorkMinutes, 0);
  const totalDays = records.filter(r => r.clockOut).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">근무기록</h1>

      {/* Month Nav */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
          className="px-3 py-1 text-gray-500">◀</button>
        <p className="font-semibold">{year}년 {month}월</p>
        <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
          className="px-3 py-1 text-gray-500">▶</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-500">총 근무일</p>
          <p className="text-2xl font-bold mt-1">{totalDays}일</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-500">총 근무시간</p>
          <p className="text-2xl font-bold mt-1">{formatHours(totalMinutes)}</p>
        </div>
      </div>

      {/* Records */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-400">이번 달 기록이 없습니다</div>
        ) : (
          records.map(r => {
            const clockIn = new Date(r.clockIn);
            const dateStr = clockIn.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
            const inTime = clockIn.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const outTime = r.clockOut
              ? new Date(r.clockOut).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
              : '근무중';

            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{dateStr}</p>
                  <p className="text-sm text-gray-500">{formatHours(r.actualWorkMinutes)}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{inTime}</span>
                  <span>→</span>
                  <span className={r.clockOut ? '' : 'text-green-600 font-medium'}>{outTime}</span>
                  {r.breakMinutes > 0 && <span className="text-gray-300">· 휴게 {r.breakMinutes}분</span>}
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${r.method === 'qr' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {r.method === 'qr' ? 'QR' : '수동'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
