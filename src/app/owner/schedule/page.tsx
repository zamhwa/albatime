"use client";

import { useEffect, useState } from "react";
import { getWorkers, getSchedules, getStore, saveSchedule, deleteSchedule } from "@/lib/store";
import { Worker, Schedule, Store } from "@/lib/types";
import { calcEstimatedWeeklyLaborCost, formatWon } from "@/lib/pay-calculator";

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

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

export default function SchedulePage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ workerId: '', date: '', startTime: '09:00', endTime: '18:00' });

  useEffect(() => {
    setWorkers(getWorkers().filter(w => w.status === 'active'));
    setStore(getStore());
    reload();
  }, []);

  useEffect(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const dates = getWeekDates(base);
    setWeekDates(dates);
  }, [weekOffset]);

  const reload = () => setSchedules(getSchedules());

  const getScheduleFor = (workerId: string, date: string): Schedule | undefined => {
    return schedules.find(s => s.workerId === workerId && s.date === date);
  };

  const handleCellClick = (workerId: string, date: string) => {
    const existing = getScheduleFor(workerId, date);
    if (existing) {
      if (confirm('이 스케줄을 삭제하시겠습니까?')) {
        deleteSchedule(existing.id);
        reload();
      }
      return;
    }
    setFormData({ workerId, date, startTime: '09:00', endTime: '18:00' });
    setShowForm(true);
  };

  const handleSaveSchedule = () => {
    saveSchedule(formData);
    reload();
    setShowForm(false);
  };

  const getWorkerWeeklyHours = (workerId: string): number => {
    let total = 0;
    weekDates.forEach(date => {
      const s = getScheduleFor(workerId, date);
      if (s) {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        total += (eh * 60 + em) - (sh * 60 + sm);
      }
    });
    return total / 60;
  };

  const copyToNextWeek = () => {
    const nextWeekDates = weekDates.map(d => {
      const date = new Date(d);
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    });

    workers.forEach(w => {
      weekDates.forEach((date, i) => {
        const s = getScheduleFor(w.id, date);
        if (s) {
          const existing = schedules.find(x => x.workerId === w.id && x.date === nextWeekDates[i]);
          if (!existing) {
            saveSchedule({ workerId: w.id, date: nextWeekDates[i], startTime: s.startTime, endTime: s.endTime });
          }
        }
      });
    });
    alert('다음 주에 복사했습니다!');
    reload();
  };

  // 예상 인건비 계산
  const laborCost = store
    ? calcEstimatedWeeklyLaborCost(workers, store, schedules, weekDates)
    : null;

  const weekLabel = weekDates.length > 0
    ? `${weekDates[0].slice(5)} ~ ${weekDates[6].slice(5)}`
    : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">스케줄 관리</h1>
        <button onClick={copyToNextWeek} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          다음 주 복사
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <button onClick={() => setWeekOffset(v => v - 1)} className="px-3 py-1 text-gray-500 hover:text-gray-800">◀</button>
        <div className="text-center">
          <p className="font-semibold text-sm">{weekLabel}</p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-600">이번 주로</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(v => v + 1)} className="px-3 py-1 text-gray-500 hover:text-gray-800">▶</button>
      </div>

      {/* 예상 인건비 */}
      {laborCost && workers.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
          <p className="text-emerald-100 text-xs font-medium">이번 주 예상 인건비</p>
          <p className="text-2xl font-bold mt-0.5">{formatWon(laborCost.total)}</p>
          <p className="text-emerald-200 text-[10px] mt-1">월 환산 약 {formatWon(laborCost.total * 4.345)}</p>
          <div className="mt-3 space-y-1">
            {laborCost.perWorker.filter(p => p.hours > 0 || p.estimatedPay > 0).map(p => (
              <div key={p.worker.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center" style={{ background: p.worker.color }}>
                    {p.worker.name[0]}
                  </div>
                  <span>{p.worker.name}</span>
                  <span className="text-emerald-200">{p.hours.toFixed(1)}h</span>
                </div>
                <span className="font-semibold">{formatWon(p.estimatedPay)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="p-2 text-left text-gray-500 font-medium w-20">이름</th>
              {weekDates.map((d, i) => {
                const isToday = d === new Date().toISOString().split('T')[0];
                return (
                  <th key={d} className={`p-2 text-center font-medium min-w-[60px] ${isToday ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}>
                    <div>{DAYS[i]}</div>
                    <div className="text-xs">{d.slice(8)}</div>
                  </th>
                );
              })}
              <th className="p-2 text-center text-gray-500 font-medium w-16">합계</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => {
              const weeklyH = getWorkerWeeklyHours(w.id);
              const isOver15 = weeklyH >= 15;
              const allowances = w.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
              return (
                <tr key={w.id} className="border-b border-gray-50">
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold" style={{ background: w.color }}>
                        {w.name[0]}
                      </div>
                      <span className="font-medium text-xs">{w.name}</span>
                    </div>
                  </td>
                  {weekDates.map(date => {
                    const s = getScheduleFor(w.id, date);
                    return (
                      <td key={date} className="p-1 text-center cursor-pointer" onClick={() => handleCellClick(w.id, date)}>
                        {s ? (
                          <div className="rounded-lg px-1 py-1.5 text-white text-[10px] leading-tight font-medium" style={{ background: w.color }}>
                            {s.startTime}<br />{s.endTime}
                          </div>
                        ) : (
                          <div className="rounded-lg px-1 py-1.5 text-gray-300 hover:bg-gray-50 text-[10px]">+</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    <span className={`text-xs font-bold ${isOver15 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {weeklyH.toFixed(1)}h
                    </span>
                    {isOver15 && allowances.weeklyHolidayPay && <span className="block text-[9px] text-amber-500">주휴발생</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {workers.length === 0 && (
        <div className="text-center text-gray-400 py-8">알바생을 먼저 등록해주세요</div>
      )}

      {/* Add Schedule Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">스케줄 추가</h3>
            <p className="text-sm text-gray-500">
              {workers.find(w => w.id === formData.workerId)?.name} · {formData.date}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">출근</label>
                <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">퇴근</label>
                <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <button onClick={handleSaveSchedule} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
