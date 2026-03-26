"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStore, getSalesRecords, saveSalesRecord, getWorkers, getAttendances, getSchedules } from "@/lib/db";
import { calcMonthlyPay, formatWon } from "@/lib/pay-calculator";
import { SalesRecord, Store } from "@/lib/types";

const BENCHMARKS: Record<string, { min: number; max: number }> = {
  '카페': { min: 20, max: 30 },
  '음식점': { min: 25, max: 35 },
  '편의점': { min: 15, max: 25 },
  '소매점': { min: 10, max: 20 },
  '기타': { min: 20, max: 30 },
};

export default function SalesPage() {
  const { currentStore } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [totalLabor, setTotalLabor] = useState(0);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAmount, setNewAmount] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    if (!currentStore) return;
    const loadData = async () => {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const [allSales, s, workers, atts, scheds] = await Promise.all([
        getSalesRecords(currentStore.id),
        getStore(currentStore.id),
        getWorkers(currentStore.id),
        getAttendances(currentStore.id),
        getSchedules(currentStore.id),
      ]);

      setSales(allSales.filter(s => s.date.startsWith(monthStr)));
      setStore(s);

      if (s) {
        const activeWorkers = workers.filter(w => w.status === 'active');
        let total = 0;
        activeWorkers.forEach(w => {
          const data = calcMonthlyPay(w, s, atts, scheds, year, month);
          total += data.totalPay;
        });
        setTotalLabor(total);
      }
    };
    loadData();
  }, [currentStore, year, month]);

  const totalSales = sales.reduce((s, r) => s + r.amount, 0);
  const laborRatio = totalSales > 0 ? (totalLabor / totalSales) * 100 : 0;

  const benchmark = BENCHMARKS[store?.businessType || '기타'];

  const handleAdd = async () => {
    if (!currentStore) return;
    const amount = parseInt(newAmount);
    if (!amount || amount <= 0) { alert('매출액을 입력해주세요'); return; }
    await saveSalesRecord(currentStore.id, { date: newDate, amount, memo: newMemo });
    setNewAmount('');
    setNewMemo('');
    // reload
    const allSales = await getSalesRecords(currentStore.id);
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    setSales(allSales.filter(s => s.date.startsWith(monthStr)));
  };

  const getRatioColor = () => {
    if (laborRatio === 0) return 'text-gray-400';
    if (laborRatio <= benchmark.min) return 'text-green-600';
    if (laborRatio <= benchmark.max) return 'text-amber-600';
    return 'text-red-600';
  };

  const getRatioStatus = () => {
    if (laborRatio === 0) return '';
    if (laborRatio <= benchmark.min) return '우수';
    if (laborRatio <= benchmark.max) return '적정';
    return '초과';
  };

  if (!currentStore) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">매출 / 인건비</h1>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }}
          className="px-3 py-1 text-gray-500">◀</button>
        <p className="font-semibold">{year}년 {month}월</p>
        <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }}
          className="px-3 py-1 text-gray-500">▶</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <p className="text-xs text-gray-500">매출</p>
          <p className="font-bold text-sm mt-1">{formatWon(totalSales)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <p className="text-xs text-gray-500">인건비</p>
          <p className="font-bold text-sm mt-1">{formatWon(totalLabor)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 text-center">
          <p className="text-xs text-gray-500">비율</p>
          <p className={`font-bold text-lg mt-1 ${getRatioColor()}`}>
            {laborRatio.toFixed(1)}%
          </p>
          {getRatioStatus() && (
            <span className={`text-[10px] font-medium ${getRatioColor()}`}>{getRatioStatus()}</span>
          )}
        </div>
      </div>

      {/* Benchmark */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-xs text-blue-600 font-medium">업종 적정 인건비 비율 ({store?.businessType || '기타'})</p>
        <div className="mt-2 h-3 bg-blue-200 rounded-full relative overflow-hidden">
          <div className="absolute left-0 h-full bg-green-400 rounded-full" style={{ width: `${benchmark.min}%` }} />
          <div className="absolute h-full bg-amber-400" style={{ left: `${benchmark.min}%`, width: `${benchmark.max - benchmark.min}%` }} />
          {laborRatio > 0 && (
            <div className="absolute top-0 w-0.5 h-full bg-red-600" style={{ left: `${Math.min(laborRatio, 100)}%` }} />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-blue-400 mt-1">
          <span>0%</span>
          <span>{benchmark.min}%</span>
          <span>{benchmark.max}%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Add Sales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="font-bold text-sm">매출 입력</h2>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <div className="relative">
            <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)}
              placeholder="매출액" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <input type="text" value={newMemo} onChange={e => setNewMemo(e.target.value)}
          placeholder="메모 (선택)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={handleAdd} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition">
          저장
        </button>
      </div>

      {/* Sales List */}
      {sales.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {sales.sort((a, b) => b.date.localeCompare(a.date)).map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.date.slice(5)}</p>
                {s.memo && <p className="text-xs text-gray-400">{s.memo}</p>}
              </div>
              <p className="font-semibold text-sm">{formatWon(s.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
