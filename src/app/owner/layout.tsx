"use client";
import OwnerNav from "@/components/OwnerNav";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <OwnerNav />
      <main className="max-w-2xl mx-auto p-4">{children}</main>
    </div>
  );
}
