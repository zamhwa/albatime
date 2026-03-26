"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getWorkerByUserId, getSchedulesByWorker } from "@/lib/db";
import { Schedule } from "@/lib/types";

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function WorkerSchedulePage() {
  const { currentStore, user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (!currentStore || !user) return;
    const loadData = async () => {
      const w = await getWorkerByUserId(currentStore.id, user.id);
      if (!w) return;
      const scheds = await getSchedulesByWorker(w.id);
      setSchedules(scheds);
    };
    loadData();
  }, [currentStore, user]);

  if (!currentStore || !user) return null;

  const getWeekDates = (): string[] => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date.toISOString().split('T')[0];
    });
  };

  const weekDates = getWeekDates();
  const today = new Date().toISOString().split('T')[0];

  const totalHours = weekDates.reduce((sum, date) => {
    const s = schedules.find(sc => sc.date === date);
    if (!s) return sum;
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  }, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">내 스케줄</h1>

      {/* Week Nav */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <button onClick={() => setWeekOffset(v => v - 1)} className="px-3 py-1 text-gray-500">◀</button>
        <div className="text-center">
          <p className="font-semibold text-sm">{weekDates[0].slice(5)} ~ {weekDates[6].slice(5)}</p>
          <p className="text-xs text-gray-400">주 {totalHours.toFixed(1)}시간</p>
        </div>
        <button onClick={() => setWeekOffset(v => v + 1)} className="px-3 py-1 text-gray-500">▶</button>
      </div>

      {/* Schedule Cards */}
      <div className="space-y-2">
        {weekDates.map((date, i) => {
          const s = schedules.find(sc => sc.date === date);
          const isToday = date === today;
          const dayOfWeek = DAYS[new Date(date).getDay()];
          const isPast = date < today;

          return (
            <div key={date} className={`bg-white rounded-xl shadow-sm border p-4 ${
              isToday ? 'border-emerald-300 bg-emerald-50' : isPast ? 'border-gray-100 opacity-60' : 'border-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold ${
                    isToday ? 'bg-emerald-500 text-white' : s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="text-[10px]">{dayOfWeek}</span>
                    <span>{date.slice(8)}</span>
                  </div>
                  {s ? (
                    <div>
                      <p className="font-semibold text-sm">{s.startTime} ~ {s.endTime}</p>
                      <p className="text-xs text-gray-400">
                        {(() => {
                          const [sh, sm] = s.startTime.split(':').map(Number);
                          const [eh, em] = s.endTime.split(':').map(Number);
                          const h = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
                          return `${h}시간`;
                        })()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">휴무</p>
                  )}
                </div>
                {isToday && <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">오늘</span>}
              </div>
            </div>
          );
        })}
      </div>

      {totalHours >= 15 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          이번 주 {totalHours.toFixed(1)}시간 근무 예정 → 주휴수당 발생 조건 충족
        </div>
      )}
    </div>
  );
}
