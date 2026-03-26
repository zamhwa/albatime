"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createStore, useInviteCode } from "@/lib/db";

export default function Home() {
  const router = useRouter();
  const { user, profile, stores, currentStore, setCurrentStore, loading, signUp, signIn, signOut, refreshStores } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 매장 생성
  const [showCreate, setShowCreate] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [businessType, setBusinessType] = useState('카페');

  // 초대코드
  const [showInvite, setShowInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-white text-lg">로딩중...</div>
      </div>
    );
  }

  // 로그인 상태 + 매장 선택 완료 → 이동
  if (user && currentStore) {
    router.push(currentStore.role === 'owner' ? '/owner' : '/worker');
    return null;
  }

  // ── 로그인/회원가입 폼 ──
  if (!user) {
    const handleAuth = async () => {
      setError('');
      setSubmitting(true);
      if (mode === 'signup') {
        if (!name.trim()) { setError('이름을 입력해주세요'); setSubmitting(false); return; }
        const { error: e } = await signUp(email, password, name);
        if (e) setError(e);
      } else {
        const { error: e } = await signIn(email, password);
        if (e) setError(e);
      }
      setSubmitting(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="pt-12 pb-6 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">알바체크</h1>
            <p className="text-gray-400 text-sm mt-1">QR 출퇴근 & 급여관리</p>
          </div>

          <div className="px-8 pb-10 space-y-4">
            {/* 탭 */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                로그인
              </button>
              <button onClick={() => setMode('signup')} className={`flex-1 py-2 text-sm font-medium ${mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                회원가입
              </button>
            </div>

            {mode === 'signup' && (
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름"
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일"
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호 (6자 이상)"
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button onClick={handleAuth} disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100">
              {submitting ? '처리중...' : mode === 'login' ? '로그인' : '가입하기'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 로그인 완료, 매장 선택/생성/참여 ──
  const handleCreateStore = async () => {
    if (!storeName.trim()) { setError('매장명을 입력해주세요'); return; }
    setSubmitting(true);
    setError('');
    try {
      const storeId = await createStore(user.id, storeName, businessType);
      await refreshStores();
      setCurrentStore({ id: storeId, name: storeName, role: 'owner' });
      router.push('/owner');
    } catch (e: any) {
      setError(e.message || '매장 생성에 실패했습니다');
      setSubmitting(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) { setError('초대코드를 입력해주세요'); return; }
    setSubmitting(true);
    const result = await useInviteCode(inviteCode, user.id);
    if (!result.success) { setError(result.error!); setSubmitting(false); return; }
    await refreshStores();
    setCurrentStore({ id: result.storeId!, name: '', role: 'worker' });
    router.push('/worker');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="pt-10 pb-4 px-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">안녕하세요, {profile?.name || ''}님</h2>
          <p className="text-gray-400 text-sm mt-1">{profile?.email}</p>
        </div>

        <div className="px-8 pb-10 space-y-3">
          {/* 기존 매장 목록 */}
          {stores.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase">내 매장</p>
              {stores.map(s => (
                <button key={s.id} onClick={() => { setCurrentStore(s); router.push(s.role === 'owner' ? '/owner' : '/worker'); }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.role === 'owner' ? '사장님' : '알바생'}</p>
                    </div>
                    <span className="text-gray-400">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 매장 만들기 */}
          {!showCreate && !showInvite && (
            <>
              <button onClick={() => setShowCreate(true)}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                매장 만들기 (사장님)
              </button>
              <button onClick={() => setShowInvite(true)}
                className="w-full bg-emerald-500 text-white py-3.5 rounded-2xl font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-100">
                초대코드로 참여 (알바생)
              </button>
            </>
          )}

          {/* 매장 생성 폼 */}
          {showCreate && (
            <div className="space-y-3">
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="매장명 (예: 스타벅스 강남점)"
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              <select value={businessType} onChange={e => setBusinessType(e.target.value)}
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option>카페</option><option>음식점</option><option>편의점</option><option>소매점</option><option>기타</option>
              </select>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button onClick={handleCreateStore} disabled={submitting}
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? '생성중...' : '매장 생성'}
              </button>
              <button onClick={() => { setShowCreate(false); setError(''); }} className="w-full text-gray-400 py-2 text-sm">취소</button>
            </div>
          )}

          {/* 초대코드 폼 */}
          {showInvite && (
            <div className="space-y-3">
              <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="초대코드 6자리"
                maxLength={6}
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm text-center tracking-[0.3em] font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
              {error && <p className="text-red-500 text-xs text-center">{error}</p>}
              <button onClick={handleJoinWithCode} disabled={submitting}
                className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-bold hover:bg-emerald-600 disabled:opacity-50">
                {submitting ? '참여중...' : '참여하기'}
              </button>
              <button onClick={() => { setShowInvite(false); setError(''); }} className="w-full text-gray-400 py-2 text-sm">취소</button>
            </div>
          )}

          <button onClick={signOut} className="w-full text-gray-400 py-2 text-sm hover:text-red-500">
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
