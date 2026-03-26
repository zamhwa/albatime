"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getRole, setRole, getStore, saveStore, getWorkers, setCurrentWorkerId } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'setup' | 'worker-select'>('role');
  const [storeName, setStoreName] = useState('');
  const [businessType, setBusinessType] = useState('카페');
  const [selectedWorker, setSelectedWorker] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const role = getRole();
    if (role === 'owner' && getStore()) router.push('/owner');
    else if (role === 'worker') router.push('/worker');
  }, [router]);

  if (!mounted) return null;

  const handleOwner = () => {
    if (getStore()) { setRole('owner'); router.push('/owner'); }
    else setStep('setup');
  };

  const handleWorker = () => {
    const workers = getWorkers();
    if (workers.length === 0) { alert('등록된 알바생이 없습니다.\n사장님이 먼저 매장을 설정해주세요.'); return; }
    setStep('worker-select');
  };

  const handleStoreSetup = () => {
    if (!storeName.trim()) { alert('매장명을 입력해주세요'); return; }
    saveStore({ name: storeName, businessType });
    setRole('owner');
    router.push('/owner');
  };

  const handleWorkerLogin = () => {
    if (!selectedWorker) { alert('알바생을 선택해주세요'); return; }
    setRole('worker');
    setCurrentWorkerId(selectedWorker);
    router.push('/worker');
  };

  const workers = typeof window !== 'undefined' ? getWorkers() : [];

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in">
        {/* Logo */}
        <div className="pt-12 pb-8 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">알바체크</h1>
          <p className="text-gray-400 text-sm mt-1">QR 출퇴근 & 급여관리</p>
        </div>

        <div className="px-8 pb-10">
          {step === 'role' && (
            <div className="space-y-3">
              <button onClick={handleOwner}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                사장님 (관리자)
              </button>
              <button onClick={handleWorker}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-600 shadow-lg shadow-emerald-100 flex items-center justify-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>
                알바생
              </button>
            </div>
          )}

          {step === 'setup' && (
            <div className="space-y-5 animate-in">
              <h2 className="text-lg font-bold text-center text-gray-800">매장 설정</h2>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">매장명</label>
                <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                  placeholder="예: 스타벅스 강남점"
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">업종</label>
                <select value={businessType} onChange={e => setBusinessType(e.target.value)}
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option>카페</option><option>음식점</option><option>편의점</option><option>소매점</option><option>기타</option>
                </select>
              </div>
              <button onClick={handleStoreSetup} className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                시작하기
              </button>
              <button onClick={() => setStep('role')} className="w-full text-gray-400 py-2 text-sm hover:text-gray-600">뒤로</button>
            </div>
          )}

          {step === 'worker-select' && (
            <div className="space-y-4 animate-in">
              <h2 className="text-lg font-bold text-center text-gray-800">알바생 선택</h2>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {workers.map(w => (
                  <button key={w.id} onClick={() => setSelectedWorker(w.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition flex items-center gap-3 ${
                      selectedWorker === w.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: w.color }}>
                      {w.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{w.name}</p>
                      <p className="text-gray-400 text-xs">{w.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={handleWorkerLogin} className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-100">
                로그인
              </button>
              <button onClick={() => setStep('role')} className="w-full text-gray-400 py-2 text-sm hover:text-gray-600">뒤로</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
