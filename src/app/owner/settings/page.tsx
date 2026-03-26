"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStore, saveStore } from "@/lib/db";
import { Store, StoreOptions, BreakRule } from "@/lib/types";

export default function SettingsPage() {
  const { currentStore } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('카페');
  const [payPeriodStart, setPayPeriodStart] = useState(1);
  const [options, setOptions] = useState<StoreOptions>({
    nightPay: false, overtimePay: false, holidayPay: false,
    nightPayRate: 1.5, overtimePayRate: 1.5, holidayPayRate: 1.5,
    roundingRule: 'none',
  });
  const [breakRules, setBreakRules] = useState<BreakRule[]>([
    { minHours: 4, breakMinutes: 30 },
    { minHours: 8, breakMinutes: 60 },
  ]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentStore) return;
    const loadData = async () => {
      const s = await getStore(currentStore.id);
      if (s) {
        setStore(s);
        setName(s.name);
        setBusinessType(s.businessType);
        setPayPeriodStart(s.payPeriodStart);
        setOptions(s.options);
        setBreakRules(s.breakRules);
      }
    };
    loadData();
  }, [currentStore]);

  const handleSave = async () => {
    if (!currentStore) return;
    await saveStore(currentStore.id, { name, businessType, payPeriodStart, options, breakRules });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateOption = (key: keyof StoreOptions, value: boolean | number | string) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  if (!currentStore) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">매장 설정</h1>

      {/* Basic Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-sm text-gray-700">기본 정보</h2>
        <div>
          <label className="block text-sm text-gray-600 mb-1">매장명</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">업종</label>
          <select value={businessType} onChange={e => setBusinessType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2">
            <option>카페</option><option>음식점</option><option>편의점</option><option>소매점</option><option>기타</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">급여 정산 시작일</label>
          <input type="number" value={payPeriodStart} onChange={e => setPayPeriodStart(parseInt(e.target.value) || 1)}
            min={1} max={28} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
        </div>
      </div>

      {/* Pay Options - 사장이 선택 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-sm text-gray-700">수당 설정</h2>
        <p className="text-xs text-gray-400">적용할 수당을 선택하세요 (5인 이상 사업장 의무)</p>

        {/* Night Pay */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <div>
            <p className="font-medium text-sm">야간수당</p>
            <p className="text-xs text-gray-400">22:00~06:00 근무 시 추가 수당</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={options.nightPay} onChange={e => updateOption('nightPay', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {options.nightPay && (
          <div className="pl-4">
            <label className="text-xs text-gray-500">배율</label>
            <select value={options.nightPayRate} onChange={e => updateOption('nightPayRate', parseFloat(e.target.value))}
              className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm">
              <option value={1.5}>1.5배</option><option value={2}>2배</option>
            </select>
          </div>
        )}

        {/* Overtime Pay */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <div>
            <p className="font-medium text-sm">연장근로수당</p>
            <p className="text-xs text-gray-400">1일 8시간 초과 근무 시 추가 수당</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={options.overtimePay} onChange={e => updateOption('overtimePay', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {options.overtimePay && (
          <div className="pl-4">
            <label className="text-xs text-gray-500">배율</label>
            <select value={options.overtimePayRate} onChange={e => updateOption('overtimePayRate', parseFloat(e.target.value))}
              className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm">
              <option value={1.5}>1.5배</option><option value={2}>2배</option>
            </select>
          </div>
        )}

        {/* Holiday Pay */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-sm">휴일근로수당</p>
            <p className="text-xs text-gray-400">공휴일 근무 시 추가 수당</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={options.holidayPay} onChange={e => updateOption('holidayPay', e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        {options.holidayPay && (
          <div className="pl-4">
            <label className="text-xs text-gray-500">배율</label>
            <select value={options.holidayPayRate} onChange={e => updateOption('holidayPayRate', parseFloat(e.target.value))}
              className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm">
              <option value={1.5}>1.5배</option><option value={2}>2배</option>
            </select>
          </div>
        )}
      </div>

      {/* Rounding Rule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-sm text-gray-700">근무시간 절사</h2>
        <select value={options.roundingRule} onChange={e => updateOption('roundingRule', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2">
          <option value="none">절사 안 함</option>
          <option value="5min">5분 단위 절사</option>
          <option value="10min">10분 단위 절사</option>
          <option value="15min">15분 단위 절사</option>
          <option value="30min">30분 단위 절사</option>
        </select>
      </div>

      {/* Break Rules */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-sm text-gray-700">휴게시간 규칙</h2>
        {breakRules.map((rule, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="number" value={rule.minHours} onChange={e => {
              const r = [...breakRules]; r[i].minHours = parseInt(e.target.value) || 0; setBreakRules(r);
            }} className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <span className="text-sm text-gray-500">시간 이상 →</span>
            <input type="number" value={rule.breakMinutes} onChange={e => {
              const r = [...breakRules]; r[i].breakMinutes = parseInt(e.target.value) || 0; setBreakRules(r);
            }} className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <span className="text-sm text-gray-500">분 휴게</span>
          </div>
        ))}
      </div>

      {/* Save */}
      <button onClick={handleSave}
        className={`w-full py-3 rounded-xl font-semibold transition ${saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {saved ? '저장 완료!' : '설정 저장'}
      </button>
    </div>
  );
}
