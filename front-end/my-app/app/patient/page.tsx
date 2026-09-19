"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPatients, type Patient } from "../lib/api";

type LoadState = "loading" | "success" | "error" | "empty";

/** แมป status → สี badge */
function statusBadge(status: Patient["status"]) {
  switch (status) {
    case "admitted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "treating":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "discharged":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

function statusLabel(status: Patient["status"]): string {
  switch (status) {
    case "admitted":
      return "ลงทะเบียนแล้ว";
    case "treating":
      return "กำลังรักษา";
    case "discharged":
      return "กลับบ้านแล้ว";
    default:
      return status;
  }
}

export default function PatientListPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function load() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await getPatients();
      setPatients(res.patients);
      setState(res.patients.length === 0 ? "empty" : "success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
      setState("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-teal-600 dark:text-teal-400">
              Hospital Carepath · Frontend
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              รายการผู้ป่วย
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              ดึงจาก <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">GET /patients</code>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={load}
              disabled={state === "loading"}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {state === "loading" ? "กำลังโหลด..." : "🔄 รีเฟรช"}
            </button>
            <Link
              href="/patients/new"
              className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              + เพิ่มผู้ป่วย
            </Link>
          </div>
        </header>

        {/* ─── states ─────────────────────────────────────────── */}

        {state === "loading" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-600" />
            <p className="mt-3 text-sm text-zinc-500">กำลังโหลดข้อมูล...</p>
          </div>
        )}

        {state === "error" && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <p className="font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="mt-1 text-xs">{errorMsg}</p>
            <button
              onClick={load}
              className="mt-3 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {state === "empty" && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-4xl">📋</p>
            <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">
              ยังไม่มีผู้ป่วยในระบบ
            </p>
            <Link
              href="/patients/new"
              className="mt-4 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              ลงทะเบียนผู้ป่วยคนแรก
            </Link>
          </div>
        )}

        {state === "success" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* table header */}
            <div className="grid grid-cols-[80px_1fr_80px_60px_120px_140px] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
              <div>รหัส</div>
              <div>ชื่อ</div>
              <div>เพศ</div>
              <div>อายุ</div>
              <div>สถานะ</div>
              <div className="text-right">การจัดการ</div>
            </div>

            {/* rows */}
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {patients.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[80px_1fr_80px_60px_120px_140px] gap-3 px-4 py-3 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                    {p.id}
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {p.name}
                    </div>
                    {p.symptom && (
                      <div className="truncate text-xs text-zinc-500">
                        {p.symptom}
                      </div>
                    )}
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400">
                    {p.gender || "—"}
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400">
                    {p.age ?? "—"}
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(
                        p.status
                      )}`}
                    >
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/patient/${p.id}`}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      ดู
                    </Link>
                    <Link
                      href={`/patient/${p.id}/pathway`}
                      className="rounded bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700"
                    >
                      เลือก Pathway
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
              ทั้งหมด {patients.length} คน
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
