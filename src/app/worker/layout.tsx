"use client";
import WorkerNav from "@/components/WorkerNav";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <WorkerNav />
      <main className="max-w-2xl mx-auto p-4">{children}</main>
    </div>
  );
}
