"use client";

import { useEffect, useState, useRef } from "react";
import { getWorkers, getContracts, saveContract, getStore } from "@/lib/store";
import { Worker, Contract } from "@/lib/types";

const WORK_DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function ContractPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [form, setForm] = useState({
    workerId: '', startDate: '', endDate: '', workLocation: '',
    jobDescription: '', workDays: [] as string[],
    startTime: '09:00', endTime: '18:00', breakTime: 60,
    hourlyWage: 10030, payDay: 10, payMethod: '계좌이체',
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    setWorkers(getWorkers());
    setContracts(getContracts());
  }, []);

  const store = getStore();

  const handleCreate = () => {
    if (!form.workerId) { alert('알바생을 선택해주세요'); return; }
    if (!form.startDate) { alert('계약 시작일을 입력해주세요'); return; }
    const worker = workers.find(w => w.id === form.workerId);
    saveContract({
      workerId: form.workerId,
      startDate: form.startDate,
      endDate: form.endDate || null,
      workLocation: form.workLocation || store?.name || '',
      jobDescription: form.jobDescription,
      workDays: form.workDays,
      workHours: { start: form.startTime, end: form.endTime },
      breakTime: form.breakTime,
      hourlyWage: form.hourlyWage || worker?.hourlyWage || 10030,
      payDay: form.payDay,
      payMethod: form.payMethod,
      status: 'draft',
    });
    setContracts(getContracts());
    setShowForm(false);
  };

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day) ? prev.workDays.filter(d => d !== day) : [...prev.workDays, day],
    }));
  };

  const handleSign = (contract: Contract) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signature = canvas.toDataURL();
    saveContract({ ...contract, ownerSignature: signature, signedAt: new Date().toISOString(), status: 'signed' });
    setContracts(getContracts());
    setViewContract(null);
  };

  // Canvas drawing
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">근로계약서</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + 작성
        </button>
      </div>

      {/* Contract List */}
      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
          작성된 계약서가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map(c => {
            const worker = workers.find(w => w.id === c.workerId);
            return (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => setViewContract(c)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{worker?.name || '알 수 없음'}</p>
                    <p className="text-xs text-gray-400">{c.startDate} ~ {c.endDate || '무기한'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.status === 'signed' ? 'bg-green-100 text-green-700' :
                    c.status === 'sent' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {c.status === 'signed' ? '서명완료' : c.status === 'sent' ? '전송됨' : '초안'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">근로계약서 작성</h3>

            <div>
              <label className="block text-sm text-gray-600 mb-1">알바생</label>
              <select value={form.workerId} onChange={e => setForm({ ...form, workerId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">선택</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">계약 시작일</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">계약 종료일</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">근무 장소</label>
              <input type="text" value={form.workLocation} onChange={e => setForm({ ...form, workLocation: e.target.value })}
                placeholder={store?.name || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">업무 내용</label>
              <input type="text" value={form.jobDescription} onChange={e => setForm({ ...form, jobDescription: e.target.value })}
                placeholder="매장 서비스 및 음료 제조" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">근무요일</label>
              <div className="flex gap-2">
                {WORK_DAYS.map(day => (
                  <button key={day} onClick={() => toggleDay(day)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition ${
                      form.workDays.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">출근시간</label>
                <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">퇴근시간</label>
                <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">시급</label>
                <input type="number" value={form.hourlyWage} onChange={e => setForm({ ...form, hourlyWage: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">급여 지급일</label>
                <input type="number" value={form.payDay} onChange={e => setForm({ ...form, payDay: parseInt(e.target.value) || 10 })}
                  min={1} max={28} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>

            <button onClick={handleCreate} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">
              계약서 생성
            </button>
          </div>
        </div>
      )}

      {/* View Contract */}
      {viewContract && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setViewContract(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-center mb-4">근로계약서</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">근로자</span><span className="font-medium">{workers.find(w => w.id === viewContract.workerId)?.name}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">계약기간</span><span>{viewContract.startDate} ~ {viewContract.endDate || '무기한'}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">근무장소</span><span>{viewContract.workLocation}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">업무내용</span><span>{viewContract.jobDescription}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">근무요일</span><span>{viewContract.workDays.join(', ')}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">근무시간</span><span>{viewContract.workHours.start} ~ {viewContract.workHours.end}</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">시급</span><span>{viewContract.hourlyWage.toLocaleString()}원</span></div>
              <div className="flex justify-between py-2 border-b"><span className="text-gray-500">급여지급일</span><span>매월 {viewContract.payDay}일</span></div>
              <div className="flex justify-between py-2"><span className="text-gray-500">지급방법</span><span>{viewContract.payMethod}</span></div>
            </div>

            {viewContract.status !== 'signed' && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">사장 서명</p>
                <canvas
                  ref={canvasRef}
                  width={400} height={120}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={() => setIsDrawing(false)}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={clearCanvas} className="text-sm text-gray-500 hover:text-gray-700">서명 초기화</button>
                </div>
                <button onClick={() => handleSign(viewContract)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mt-3">
                  서명 완료
                </button>
              </div>
            )}

            {viewContract.ownerSignature && (
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400 mb-1">서명됨: {viewContract.signedAt?.split('T')[0]}</p>
                <img src={viewContract.ownerSignature} alt="서명" className="h-16 mx-auto" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
