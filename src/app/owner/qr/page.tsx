"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth-context";
import { getQrSecret, getStore } from "@/lib/db";
import { Store } from "@/lib/types";

export default function QRPage() {
  const { currentStore } = useAuth();
  const [qrValue, setQrValue] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    if (!currentStore) return;
    getStore(currentStore.id).then(setStore);
  }, [currentStore]);

  const generateQR = async () => {
    if (!currentStore) return;
    const secret = await getQrSecret(currentStore.id);
    const timestamp = Math.floor(Date.now() / 30000) * 30000;
    const nonce = Math.random().toString(36).substring(2, 10);
    const payload = JSON.stringify({ s: currentStore.id, t: timestamp, n: nonce, k: secret });
    setQrValue(btoa(payload));
    setCountdown(30);
  };

  useEffect(() => {
    if (!currentStore) return;
    generateQR();
    const i = setInterval(generateQR, 30000);
    return () => clearInterval(i);
  }, [currentStore]);

  useEffect(() => { const t = setInterval(() => setCountdown(p => p > 0 ? p - 1 : 30), 1000); return () => clearInterval(t); }, []);

  if (!currentStore) return null;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center cursor-pointer" onClick={() => setIsFullscreen(false)}>
        <p className="text-gray-400 text-sm mb-6 font-medium">{store?.name}</p>
        <div className="p-6 rounded-3xl" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)' }}>
          <QRCodeSVG value={qrValue || "loading"} size={280} level="H" />
        </div>
        <div className="mt-8 flex items-center gap-3">
          <div className="w-52 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-1000 rounded-full" style={{ width: `${(countdown / 30) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400 w-8 font-mono">{countdown}s</span>
        </div>
        <p className="text-gray-300 text-xs mt-6">터치하면 돌아갑니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/></svg>
        </div>
        <h1 className="text-xl font-extrabold text-gray-900">QR 출퇴근</h1>
        <p className="text-gray-400 text-sm mt-1">알바생이 이 QR을 스캔하면 자동 기록됩니다</p>

        <div className="my-8 inline-block p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)' }}>
          <QRCodeSVG value={qrValue || "loading"} size={200} level="H" />
        </div>

        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-44 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-1000 rounded-full" style={{ width: `${(countdown / 30) * 100}%` }} />
          </div>
          <span className="text-xs text-gray-400 font-mono w-6">{countdown}</span>
        </div>
        <p className="text-gray-300 text-[11px]">30초마다 자동 갱신</p>
      </div>

      <button onClick={() => setIsFullscreen(true)}
        className="w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-indigo-100 transition hover:shadow-xl"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
        전체화면으로 보기
      </button>
    </div>
  );
}
