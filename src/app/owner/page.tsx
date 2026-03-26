"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStore, getWorkers, getAttendances, getSchedules, createInviteCode } from "@/lib/db";
import { calcWeeklySummary, getMonday, formatWon } from "@/lib/pay-calculator";
import { Store, Worker, Attendance } from "@/lib/types";
import Link from "next/link";

export default function OwnerDashboard() {
  const { currentStore } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [todayAtts, setTodayAtts] = useState<Attendance[]>([]);
  const [weeklyPay, setWeeklyPay] = useState(0);
  const [holidayNames, setHolidayNames] = useState<string[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!currentStore) return;
    loadData();
  }, [currentStore]);

  const loadData = async () => {
    const storeId = currentStore!.id;
    const s = await getStore(storeId);
    const w = (await getWorkers(storeId)).filter(w => w.status === 'active');
    const allAtts = await getAttendances(storeId);
    const allScheds = await getSchedules(storeId);
    const today = new Date().toISOString().split('T')[0];

    setStore(s);
    setWorkers(w);
    setTodayAtts(allAtts.filter(a => a.clockIn.startsWith(today)));

    if (s) {
      const monday = getMonday(new Date());
      let total = 0;
      const names: string[] = [];
      w.forEach(worker => {
        const sum = calcWeeklySummary(worker, s, allAtts, allScheds, monday);
        total += sum.totalPay;
        if (sum.weeklyHolidayPay > 0) names.push(worker.name);
      });
      setWeeklyPay(total);
      setHolidayNames(names);
    }
  };

  const handleCreateInvite = async () => {
    const code = await createInviteCode(currentStore!.id);
    setInviteCode(code);
    setShowInvite(true);
  };

  if (!currentStore) return null;

  const getStatus = (id: string) => {
    const att = todayAtts.find(a => a.workerId === id);
    if (!att) return { label: '미출근', cls: 'bg-gray-100 text-gray-400' };
    if (!att.clockOut) return { label: '근무중', cls: 'bg-emerald-50 text-emerald-600' };
    return { label: '퇴근', cls: 'bg-indigo-50 text-indigo-500' };
  };

  const getTime = (id: string) => {
    const att = todayAtts.find(a => a.workerId === id);
    return att ? new Date(att.clockIn).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
  };

  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="space-y-5 animate-in">
      {/* Header Card */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(20%, -30%)' }} />
        <p className="text-indigo-200 text-xs font-medium">{dateStr}</p>
        <h1 className="text-2xl font-extrabold mt-1">{store?.name || currentStore.name}</h1>
        <div className="flex gap-8 mt-5">
          <div>
            <p className="text-indigo-200 text-[10px] uppercase tracking-wider">알바생</p>
            <p className="text-2xl font-extrabold">{workers.length}<span className="text-sm font-normal ml-0.5">명</span></p>
          </div>
          <div>
            <p className="text-indigo-200 text-[10px] uppercase tracking-wider">오늘 출근</p>
            <p className="text-2xl font-extrabold">{todayAtts.length}<span className="text-sm font-normal ml-0.5">명</span></p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/owner/qr" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition text-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <p className="font-bold text-xs text-gray-800">QR 표시</p>
        </Link>
        <Link href="/owner/workers" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <p className="font-bold text-xs text-gray-800">알바생</p>
        </Link>
        <button onClick={handleCreateInvite} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </div>
          <p className="font-bold text-xs text-gray-800">초대코드</p>
        </button>
      </div>

      {/* Invite Code Modal */}
      {showInvite && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-sm text-amber-700 font-medium mb-2">알바생 초대코드</p>
          <p className="text-3xl font-extrabold tracking-[0.3em] text-amber-800">{inviteCode}</p>
          <p className="text-xs text-amber-500 mt-2">7일간 유효 · 알바생에게 이 코드를 전달하세요</p>
          <button onClick={() => { navigator.clipboard?.writeText(inviteCode); alert('복사됨!'); }}
            className="mt-3 text-xs bg-amber-200 text-amber-800 px-4 py-1.5 rounded-lg font-medium">
            코드 복사
          </button>
          <button onClick={() => setShowInvite(false)} className="block mx-auto mt-2 text-xs text-amber-500">닫기</button>
        </div>
      )}

      {/* Today */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm">오늘 출근 현황</h2>
          <span className="text-[11px] text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">{todayAtts.length}/{workers.length}</span>
        </div>
        {workers.length === 0 ? (
          <div className="px-5 pb-6 text-center">
            <p className="text-gray-300 text-sm">등록된 알바생이 없습니다</p>
            <Link href="/owner/workers" className="text-indigo-500 text-xs mt-1 inline-block font-medium">추가하기 →</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {workers.map(w => {
              const { label, cls } = getStatus(w.id);
              const time = getTime(w.id);
              return (
                <div key={w.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: w.color }}>
                      {w.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{w.name}</p>
                      {time && <p className="text-[11px] text-gray-400">{time}</p>}
                    </div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${cls}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-800 text-sm mb-4">이번 주 요약</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)' }}>
            <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider">예상 인건비</p>
            <p className="text-lg font-extrabold text-indigo-700 mt-1">{formatWon(weeklyPay)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)' }}>
            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">주휴수당 발생</p>
            <p className="text-lg font-extrabold text-amber-700 mt-1">{holidayNames.length}명</p>
            {holidayNames.length > 0 && (
              <p className="text-[10px] text-amber-500 mt-0.5">{holidayNames.join(', ')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
