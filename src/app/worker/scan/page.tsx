"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentWorkerId, getWorker, getAttendances, saveAttendance, getStore, getQrSecret } from "@/lib/store";
import { calcBreakMinutes, calcActualMinutes } from "@/lib/pay-calculator";

export default function ScanPage() {
  const [status, setStatus] = useState<'ready' | 'success' | 'error'>('ready');
  const [message, setMessage] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);

  useEffect(() => {
    let scanner: any = null;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        html5QrRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            handleScan(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {}
        );
        setScannerReady(true);
      } catch (err) {
        console.error('Scanner error:', err);
        setStatus('error');
        setMessage('카메라를 사용할 수 없습니다. 카메라 권한을 확인해주세요.');
      }
    };

    initScanner();

    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleScan = (data: string) => {
    try {
      const payload = JSON.parse(atob(data));
      const secret = getQrSecret();
      const store = getStore();

      // Verify QR
      if (payload.k !== secret) {
        setStatus('error');
        setMessage('유효하지 않은 QR코드입니다');
        return;
      }

      // Check timestamp (60초 이내)
      const now = Date.now();
      if (Math.abs(now - payload.t) > 60000) {
        setStatus('error');
        setMessage('만료된 QR코드입니다. 사장님에게 새 QR을 요청해주세요.');
        return;
      }

      const workerId = getCurrentWorkerId();
      if (!workerId) {
        setStatus('error');
        setMessage('로그인 정보를 찾을 수 없습니다');
        return;
      }

      const worker = getWorker(workerId);
      if (!worker) return;

      const today = new Date().toISOString().split('T')[0];
      const todayAtts = getAttendances().filter(a => a.workerId === workerId && a.clockIn.startsWith(today));
      const openAtt = todayAtts.find(a => !a.clockOut);

      if (openAtt) {
        // 퇴근 처리
        const clockOut = new Date().toISOString();
        const totalMin = Math.floor((new Date(clockOut).getTime() - new Date(openAtt.clockIn).getTime()) / 60000);
        const breakMin = store ? calcBreakMinutes(totalMin, store.breakRules) : 0;
        const actualMin = store ? calcActualMinutes(openAtt.clockIn, clockOut, breakMin, store.options.roundingRule) : totalMin - breakMin;

        saveAttendance({
          ...openAtt,
          clockOut,
          breakMinutes: breakMin,
          actualWorkMinutes: actualMin,
        });

        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const hours = Math.floor(actualMin / 60);
        const mins = actualMin % 60;
        setStatus('success');
        setMessage(`퇴근 완료! (${time})\n실근무: ${hours}시간 ${mins}분`);
      } else {
        // 출근 처리
        saveAttendance({
          workerId,
          clockIn: new Date().toISOString(),
          clockOut: null,
          breakMinutes: 0,
          actualWorkMinutes: 0,
          method: 'qr',
        });

        const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setStatus('success');
        setMessage(`출근 완료! (${time})\n오늘도 화이팅!`);
      }
    } catch {
      setStatus('error');
      setMessage('QR코드를 인식할 수 없습니다');
    }
  };

  const retry = () => {
    setStatus('ready');
    setMessage('');
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-center">QR 스캔</h1>

      {status === 'ready' && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div id="qr-reader" ref={scannerRef} className="w-full" />
          </div>
          <p className="text-center text-gray-500 text-sm">
            사장님 핸드폰의 QR코드를 스캔해주세요
          </p>
        </>
      )}

      {status === 'success' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-bold text-green-700 whitespace-pre-line">{message}</p>
          <button onClick={() => window.history.back()} className="mt-6 bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold">
            확인
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-lg font-bold text-red-600">{message}</p>
          <button onClick={retry} className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold">
            다시 스캔
          </button>
        </div>
      )}
    </div>
  );
}
