"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Input,
  Segmented,
  Button,
  Avatar,
  Tag,
  Empty,
  Skeleton,
  Result,
  App,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { getPatients, type Patient } from "../lib/api";

type LoadState = "loading" | "success" | "error" | "empty";
type StatusFilter = "all" | Patient["status"];

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "admitted", label: "ลงทะเบียน" },
  { value: "treating", label: "กำลังรักษา" },
  { value: "discharged", label: "กลับบ้าน" },
];

// สี Tag ตามสถานะ
function statusTag(status: Patient["status"]) {
  switch (status) {
    case "admitted":
      return { color: "blue", label: "ลงทะเบียนแล้ว", icon: "📝" };
    case "treating":
      return { color: "gold", label: "กำลังรักษา", icon: "💊" };
    case "discharged":
      return { color: "green", label: "กลับบ้านแล้ว", icon: "✅" };
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarGradient(name: string): string {
  const palettes = [
    "linear-gradient(135deg, #fb7185 0%, #be123c 100%)",
    "linear-gradient(135deg, #fb923c 0%, #c2410c 100%)",
    "linear-gradient(135deg, #34d399 0%, #047857 100%)",
    "linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)",
    "linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)",
    "linear-gradient(135deg, #e879f9 0%, #a21caf 100%)",
    "linear-gradient(135deg, #a3e635 0%, #4d7c0f 100%)",
    "linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)",
  ];
  const code = name.charCodeAt(0) || 0;
  return palettes[code % palettes.length];
}

export default function PatientListPage() {
  const { message } = App.useApp();
  const [state, setState] = useState<LoadState>("loading");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

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
      message.error("โหลดข้อมูลไม่สำเร็จ");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    return patients.reduce(
      (acc, p) => {
        acc.all += 1;
        acc[p.status] = (acc[p.status] ?? 0) + 1;
        return acc;
      },
      { all: 0, admitted: 0, treating: 0, discharged: 0 } as Record<
        "all" | Patient["status"],
        number
      >
    );
  }, [patients]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients.filter((p) => {
      const matchStatus = filter === "all" || p.status === filter;
      if (!matchStatus) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.symptom ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [patients, filter, search]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
              Dashboard · ผู้ป่วย
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
              ภาพรวมผู้ป่วย
            </h1>
            <p className="mt-2 text-base text-zinc-700 dark:text-zinc-300">
              ติดตามสถานะและ Care Pathway ของผู้ป่วยทั้งหมดในระบบ
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<ReloadOutlined />}
              onClick={load}
              loading={state === "loading"}
            >
              รีเฟรช
            </Button>
            <Link href="/patients/new">
              <Button type="primary" icon={<PlusOutlined />}>
                ลงทะเบียนผู้ป่วย
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── KPI Cards ───────────────────────────────────────── */}
      {state === "success" && (
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <KpiCard label="ผู้ป่วยทั้งหมด" value={counts.all} tone="default" icon="👥" />
          <KpiCard label="ลงทะเบียน" value={counts.admitted} tone="sky" icon="📝" />
          <KpiCard label="กำลังรักษา" value={counts.treating} tone="amber" icon="💊" />
          <KpiCard label="กลับบ้านแล้ว" value={counts.discharged} tone="emerald" icon="✅" />
        </section>
      )}

      {/* ─── States ──────────────────────────────────────────── */}

      {state === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton.Node
              key={i}
              active
              style={{ width: "100%", height: 176, borderRadius: 16 }}
            >
              <span />
            </Skeleton.Node>
          ))}
        </div>
      )}

      {state === "error" && (
        <Result
          status="error"
          title="โหลดข้อมูลไม่สำเร็จ"
          subTitle={errorMsg}
          extra={[
            <Button key="retry" type="primary" onClick={load}>
              ลองอีกครั้ง
            </Button>,
          ]}
        />
      )}

      {state === "empty" && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <Empty
            image={<div className="text-5xl">🏥</div>}
            styles={{ image: { height: 80 } }}
            description={
              <div>
                <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  ยังไม่มีผู้ป่วยในระบบ
                </p>
                <p className="text-sm text-zinc-500">
                  เริ่มต้นด้วยการลงทะเบียนผู้ป่วยคนแรกของคุณ
                </p>
              </div>
            }
          >
            <Link href="/patients/new">
              <Button type="primary" icon={<PlusOutlined />}>
                ลงทะเบียนผู้ป่วยคนแรก
              </Button>
            </Link>
          </Empty>
        </div>
      )}

      {/* ─── Search + Filter + Grid ──────────────────────────── */}
      {state === "success" && (
        <>
          <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-zinc-400" />}
              placeholder="ค้นหาชื่อ / รหัส / อาการ / เบอร์โทร"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm!"
              size="large"
            />
            <Segmented
              value={filter}
              onChange={(v) => setFilter(v as StatusFilter)}
              options={FILTER_OPTIONS.map((o) => ({
                value: o.value,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {o.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        filter === o.value
                          ? "bg-white/25"
                          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      {counts[o.value]}
                    </span>
                  </span>
                ),
              }))}
            />
          </section>

          {/* grid */}
          {visible.length === 0 ? (
            <Empty
              description={
                <span className="text-zinc-600 dark:text-zinc-400">
                  ไม่พบผู้ป่วยที่ตรงกับเงื่อนไข
                </span>
              }
              className="py-12! rounded-2xl border border-dashed border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => {
                const tag = statusTag(p.status);
                return (
                  <li
                    key={p.id}
                    className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  >
                    {/* header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          size={44}
                          style={{
                            background: avatarGradient(p.name),
                            color: "#fff",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {initials(p.name)}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {p.name}
                          </p>
                          <p className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {p.id}
                          </p>
                        </div>
                      </div>
                      <Tag color={tag.color} className="m-0!">
                        <span className="mr-1">{tag.icon}</span>
                        {tag.label}
                      </Tag>
                    </div>

                    {/* meta */}
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                      <dt className="text-zinc-600 dark:text-zinc-400">เพศ</dt>
                      <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                        {p.gender || "—"}
                      </dd>
                      <dt className="text-zinc-600 dark:text-zinc-400">อายุ</dt>
                      <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                        {p.age != null ? `${p.age} ปี` : "—"}
                      </dd>
                      {p.phone && (
                        <>
                          <dt className="text-zinc-600 dark:text-zinc-400">โทร</dt>
                          <dd className="font-mono font-medium text-zinc-900 dark:text-zinc-50">
                            {p.phone}
                          </dd>
                        </>
                      )}
                    </dl>

                    {/* symptom */}
                    {p.symptom && (
                      <p className="mt-3 line-clamp-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                        <span className="mr-1.5">💬</span>
                        {p.symptom}
                      </p>
                    )}

                    {/* actions */}
                    <div className="mt-4 flex gap-2 pt-3">
                      <Link href={`/patient/${p.id}`} className="flex-1">
                        <Button block size="middle">
                          ดูรายละเอียด
                        </Button>
                      </Link>
                      <Link href={`/patient/${p.id}/pathway`} className="flex-1">
                        <Button block type="primary" size="middle">
                          เลือก Pathway
                          <ArrowRightOutlined />
                        </Button>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            แสดง <span className="font-semibold text-zinc-900 dark:text-zinc-50">{visible.length}</span> จาก <span className="font-semibold text-zinc-900 dark:text-zinc-50">{patients.length}</span> คน
          </p>
        </>
      )}
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "default" | "sky" | "amber" | "emerald";
  icon: string;
}) {
  const toneStyles = {
    default:
      "from-zinc-100 to-zinc-50 text-zinc-900 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-50",
    sky: "from-sky-100 to-sky-50 text-sky-900 dark:from-sky-950 dark:to-sky-900/30 dark:text-sky-200",
    amber:
      "from-amber-100 to-amber-50 text-amber-900 dark:from-amber-950 dark:to-amber-900/30 dark:text-amber-200",
    emerald:
      "from-emerald-100 to-emerald-50 text-emerald-900 dark:from-emerald-950 dark:to-emerald-900/30 dark:text-emerald-200",
  }[tone];

  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-linear-to-br p-4 shadow-sm dark:border-zinc-800 ${toneStyles}`}
    >
      <div className="flex items-center justify-between text-xs font-medium opacity-70">
        <span>{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
