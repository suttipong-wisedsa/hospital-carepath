"use client";

import { useEffect, useState } from "react";
import { Input, App as AntApp } from "antd";
import {
  RightOutlined,
  IdcardOutlined,
  SafetyOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { Search } = Input;

export default function PatientViewEntryPage() {
  const { message } = AntApp.useApp();
  const [code, setCode] = useState("");

  function onSubmit(value: string) {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      message.warning("กรุณากรอกรหัสผู้ป่วย");
      return;
    }
    window.location.href =`/patient-view/${trimmed}`;
  }

  // ดัก back button — ถ้ากดย้อนกลับจาก entry นี้ ให้อยู่ที่ entry เดิม (ไม่ทะลุไปหน้า staff)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.pushState({ patientViewEntry: true },"");
    function onPopState() {
      window.history.pushState({ patientViewEntry: true },"");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-20">
      {/* ─── hero ──────────────────────────────── */}
      <section className="rounded-3xl bg-linear-to-br from-teal-500 via-emerald-500 to-cyan-600 p-8 text-center text-white shadow-xl shadow-teal-500/40">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 text-5xl backdrop-blur-sm">
          🏥
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          หน้าสำหรับผู้ป่วย
        </h1>
        <p className="mt-2 text-sm font-bold text-white/90">
          กรอกรหัสผู้ป่วยของคุณเพื่อดูสถานะคิวและขั้นตอนการดูแล
        </p>
      </section>

      {/* ─── form ──────────────────────────────── */}
      <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-black text-zinc-900">
            รหัสผู้ป่วย
          </span>
          <div className="mt-2">
            <Search
              size="large"
              enterButton={
                <span className="inline-flex items-center gap-1.5 px-2 font-bold">
                  <RightOutlined /> เปิดดู
                </span>
              }
              onSearch={onSubmit}
              onChange={(e) => setCode(e.target.value)}
              value={code}
              allowClear
            />
          </div>
        </label>
        <p className="mt-3 text-xs font-semibold text-zinc-600">
          รหัสผู้ป่วยอยู่บนบัตรคิวหรือเอกสารลงทะเบียนของคุณ
        </p>
      </section>

      {/* ─── info chips ──────────────────────────────── */}
      <section className="mt-6 grid gap-3">
        <InfoChip
          icon={<SafetyOutlined />}
          title="ปลอดภัย · ส่วนตัว"
          desc="หน้านี้แสดงเฉพาะข้อมูลของคุณเท่านั้น ไม่สามารถแก้ไขใดๆ ได้"
        />
        <InfoChip
          icon={<ReloadOutlined />}
          title="อัปเดตอัตโนมัติ"
          desc="ข้อมูลคิวจะรีเฟรชทุก 30 วินาที คุณไม่ต้องทำอะไร"
        />
        <InfoChip
          icon={<IdcardOutlined />}
          title="ต้องใช้รหัสผู้ป่วย"
          desc="รหัสอยู่บนเอกสารลงทะเบียน เช่น P0001, P0002"
        />
      </section>
    </main>
  );
}

function InfoChip({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-base text-teal-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-zinc-950">
          {title}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-zinc-600">
          {desc}
        </p>
      </div>
    </div>
  );
}
