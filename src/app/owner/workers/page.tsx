"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getWorkers, saveWorker, deleteWorker } from "@/lib/db";
import { Worker, WorkerAllowances } from "@/lib/types";
import { formatWon } from "@/lib/pay-calculator";

export default function WorkersPage() {
  const { currentStore } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wageType, setWageType] = useState<'hourly' | 'monthly'>('hourly');
  const [wage, setWage] = useState("10030");
  const [monthlyWage, setMonthlyWage] = useState("2000000");
  const [allowances, setAllowances] = useState<WorkerAllowances>({
    weeklyHolidayPay: true,
    nightPay: true,
    overtimePay: true,
    holidayPay: true,
  });

  useEffect(() => {
    if (!currentStore) return;
    getWorkers(currentStore.id).then(setWorkers);
  }, [currentStore]);

  const handleSubmit = async () => {
    if (!currentStore) return;
    if (!name.trim()) { alert('이름을 입력해주세요'); return; }
    if (wageType === 'hourly') {
      const wageNum = parseInt(wage) || 10030;
      if (wageNum < 10030) {
        if (!confirm('2026년 최저시급(10,030원) 미만입니다. 계속하시겠습니까?')) return;
      }
      await saveWorker(currentStore.id, { id: editId || undefined, name, phone, wageType, hourlyWage: wageNum, monthlyWage: 0, allowances });
    } else {
      const mWage = parseInt(monthlyWage) || 0;
      if (mWage <= 0) { alert('월급을 입력해주세요'); return; }
      await saveWorker(currentStore.id, { id: editId || undefined, name, phone, wageType, hourlyWage: 0, monthlyWage: mWage, allowances });
    }
    const updated = await getWorkers(currentStore.id);
    setWorkers(updated);
    resetForm();
  };

  const handleEdit = (w: Worker) => {
    setEditId(w.id);
    setName(w.name);
    setPhone(w.phone);
    setWageType(w.wageType || 'hourly');
    setWage(w.hourlyWage.toString());
    setMonthlyWage((w.monthlyWage || 2000000).toString());
    setAllowances(w.allowances || {
      weeklyHolidayPay: true,
      nightPay: true,
      overtimePay: true,
      holidayPay: true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, workerName: string) => {
    if (!currentStore) return;
    if (confirm(`${workerName}을(를) 삭제하시겠습니까?`)) {
      await deleteWorker(id);
      const updated = await getWorkers(currentStore.id);
      setWorkers(updated);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName("");
    setPhone("");
    setWageType('hourly');
    setWage("10030");
    setMonthlyWage("2000000");
    setAllowances({
      weeklyHolidayPay: true,
      nightPay: true,
      overtimePay: true,
      holidayPay: true,
    });
  };

  const toggleAllowance = (key: keyof WorkerAllowances) => {
    setAllowances(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getWageDisplay = (w: Worker) => {
    if (w.wageType === 'monthly') return `월급 ${formatWon(w.monthlyWage || 0)}`;
    return `시급 ${formatWon(w.hourlyWage)}`;
  };

  const getAllowanceTags = (w: Worker) => {
    const a = w.allowances || { weeklyHolidayPay: true, nightPay: true, overtimePay: true, holidayPay: true };
    const tags: string[] = [];
    if (a.weeklyHolidayPay) tags.push('주휴');
    if (a.nightPay) tags.push('야간');
    if (a.overtimePay) tags.push('연장');
    if (a.holidayPay) tags.push('휴일');
    return tags;
  };

  if (!currentStore) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">알바생 관리</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold">{editId ? '알바생 수정' : '새 알바생'}</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="홍길동" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">전화번호</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="010-1234-5678" />
          </div>

          {/* 시급/월급 선택 */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">급여 유형</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setWageType('hourly')}
                className={`flex-1 py-2.5 text-sm font-medium transition ${wageType === 'hourly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                시급제
              </button>
              <button
                onClick={() => setWageType('monthly')}
                className={`flex-1 py-2.5 text-sm font-medium transition ${wageType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                월급제
              </button>
            </div>
          </div>

          {wageType === 'hourly' ? (
            <div>
              <label className="block text-sm text-gray-600 mb-1">시급</label>
              <div className="relative">
                <input type="number" value={wage} onChange={e => setWage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">원</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">2026년 최저시급: 10,030원</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-600 mb-1">월급</label>
              <div className="relative">
                <input type="number" value={monthlyWage} onChange={e => setMonthlyWage(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">원</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">월 고정 급여액을 입력하세요</p>
            </div>
          )}

          {/* 수당 적용 여부 */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">수당 적용</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'weeklyHolidayPay' as const, label: '주휴수당', desc: '주 15h 이상 + 개근' },
                { key: 'nightPay' as const, label: '야간수당', desc: '22시~06시 1.5배' },
                { key: 'overtimePay' as const, label: '연장수당', desc: '일 8시간 초과 1.5배' },
                { key: 'holidayPay' as const, label: '휴일수당', desc: '공휴일 근무 1.5배' },
              ]).map(item => (
                <button
                  key={item.key}
                  onClick={() => toggleAllowance(item.key)}
                  className={`p-3 rounded-lg border text-left transition ${
                    allowances[item.key]
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      allowances[item.key] ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {allowances[item.key] && <span className="text-white text-[10px]">✓</span>}
                    </div>
                    <span className={`text-sm font-medium ${allowances[item.key] ? 'text-blue-700' : 'text-gray-600'}`}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-6">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
              {editId ? '수정' : '추가'}
            </button>
            <button onClick={resetForm} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
              취소
            </button>
          </div>
        </div>
      )}

      {workers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
          등록된 알바생이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {workers.map(w => (
            <div key={w.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: w.color }}>
                    {w.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-gray-400">{w.phone} · {getWageDisplay(w)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(w)} className="text-blue-600 text-sm px-2 py-1 hover:bg-blue-50 rounded">수정</button>
                  <button onClick={() => handleDelete(w.id, w.name)} className="text-red-500 text-sm px-2 py-1 hover:bg-red-50 rounded">삭제</button>
                </div>
              </div>
              {/* 수당 태그 */}
              <div className="flex gap-1 mt-2 ml-13">
                {getAllowanceTags(w).map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">{tag}</span>
                ))}
                {getAllowanceTags(w).length === 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">수당 미적용</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
