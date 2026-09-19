"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Button,
  Avatar,
  Tag,
  Steps,
  Skeleton,
  Result,
  App,
  Card,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  HeartOutlined,
  PhoneOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  PlayCircleOutlined,
  ForwardOutlined,
} from "@ant-design/icons";
import {
  getPatient,
  updatePatientStatus,
  getPatientPathway,
  type Patient,
  type PatientPathwayResponse,
} from "../../lib/api";

type LoadState = "loading" | "success" | "error";

const { Text } = Typography;

// ─── Configs ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  admitted: {
    label: "ลงทะเบียนแล้ว",
    color: "#0369a1",
    bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    tagColor: "blue",
    icon: "📝",
  },
  treating: {
    label: "กำลังรักษา",
    color: "#b45309",
    bg: "linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)",
    tagColor: "gold",
    icon: "💊",
  },
  discharged: {
    label: "กลับบ้านแล้ว",
    color: "#15803d",
    bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    tagColor: "green",
    icon: "✅",
  },
} as const;

const AVATAR_PALETTES = [
  "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
  "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
  "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  "linear-gradient(135deg, #d946ef 0%, #a21caf 100%)",
  "linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarBg(name: string): string {
  return AVATAR_PALETTES[(name.charCodeAt(0) || 0) % AVATAR_PALETTES.length];
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function genderLabel(g?: string): string {
  switch (g) {
    case "M":
      return "ชาย";
    case "F":
      return "หญิง";
    case "other":
      return "อื่นๆ";
    default:
      return g || "—";
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [state, setState] = useState<LoadState>("loading");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [pathway, setPathway] = useState<PatientPathwayResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function load() {
    if (!id) return;
    setState("loading");
    setErrorMsg("");
    try {
      const p = await getPatient(id);
      setPatient(p);
      try {
        const pw = await getPatientPathway(id);
        setPathway(pw);
      } catch {
        setPathway(null);
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
      setState("error");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(next: Patient["status"]) {
    if (!patient || patient.status === next) return;
    setUpdatingStatus(true);
    try {
      const updated = await updatePatientStatus(patient.id, next);
      setPatient(updated);
      message.success(`อัปเดตเป็น "${STATUS_CONFIG[next].label}" เรียบร้อย`);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ"
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  // ─── loading ──────────────────────────────────────────
  if (state === "loading") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <Skeleton active paragraph={{ rows: 1 }} className="w-32!" />
        <Skeleton.Node
          active
          style={{ width: "100%", height: 200, borderRadius: 24, marginTop: 16 }}
        >
          <span />
        </Skeleton.Node>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton.Node
            active
            style={{ width: "100%", height: 160, borderRadius: 16 }}
          >
            <span />
          </Skeleton.Node>
          <Skeleton.Node
            active
            style={{ width: "100%", height: 160, borderRadius: 16 }}
          >
            <span />
          </Skeleton.Node>
        </div>
        <Skeleton.Node
          active
          style={{ width: "100%", height: 280, borderRadius: 16, marginTop: 16 }}
        >
          <span />
        </Skeleton.Node>
      </main>
    );
  }

  // ─── error ────────────────────────────────────────────
  if (state === "error") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/patient"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 transition hover:gap-2.5 hover:text-teal-900 dark:text-teal-400"
        >
          <ArrowLeftOutlined /> กลับไปรายการผู้ป่วย
        </Link>
        <div className="mt-4">
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
        </div>
      </main>
    );
  }

  if (!patient) return null;

  const statusCfg = STATUS_CONFIG[patient.status];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* ─── breadcrumb ─────────────────────────────────── */}
      <Link
        href="/patient"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 transition hover:gap-2.5 hover:text-teal-900 dark:text-teal-400"
      >
        <ArrowLeftOutlined /> กลับไปรายการผู้ป่วย
      </Link>

      {/* ─── HERO ───────────────────────────────────────── */}
      <section
        className="relative mt-4 overflow-hidden rounded-3xl shadow-lg shadow-teal-500/10"
        style={{ background: statusCfg.bg }}
      >
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ background: statusCfg.color }}
        />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/40 blur-3xl" />

        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-end gap-5">
              <div className="relative">
                <Avatar
                  size={112}
                  style={{
                    background: avatarBg(patient.name),
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 32,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                  }}
                >
                  {initials(patient.name)}
                </Avatar>
                <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-md ring-2 ring-white">
                  {statusCfg.icon}
                </span>
              </div>

              <div className="pb-1">
                <Text className="text-xs! font-bold! uppercase! tracking-[0.2em]! text-zinc-700!">
                  รหัสผู้ป่วย
                </Text>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                  {patient.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-sm">
                  <Tag className="m-0! rounded-md!" bordered={false}>
                    <span className="font-bold">{patient.id}</span>
                  </Tag>
                  {patient.age != null && (
                    <Tag className="m-0! rounded-md!" bordered={false}>
                      <span className="font-semibold">{patient.age} ปี</span>
                    </Tag>
                  )}
                  {patient.gender && (
                    <Tag className="m-0! rounded-md!" bordered={false}>
                      <span className="font-semibold">
                        {genderLabel(patient.gender)}
                      </span>
                    </Tag>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <Tag
                color={statusCfg.tagColor}
                className="text-sm! px-3! py-1! m-0!"
                style={{ fontWeight: 600 }}
                icon={
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: statusCfg.color }}
                  />
                }
              >
                {statusCfg.label}
              </Tag>
              {patient.updated_at && (
                <Text className="text-sm! font-semibold! text-zinc-700!">
                  อัปเดตล่าสุด {formatDateTime(patient.updated_at)}
                </Text>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATUS UPDATE ──────────────────────────────── */}
      <Card className="mt-6!" styles={{ body: { padding: 20 } }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg dark:bg-zinc-800">
            🔄
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
              อัปเดตสถานะ
            </h2>
            <Text className="mt-1 block text-sm! font-medium! text-zinc-600!">
              เปลี่ยนสถานะผู้ป่วย —{" "}
              <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-sm font-bold text-zinc-900">
                PATCH /patients/{patient.id}/status
              </code>
            </Text>

            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(STATUS_CONFIG) as Array<Patient["status"]>).map(
                (s) => {
                  const cfg = STATUS_CONFIG[s];
                  const active = patient.status === s;
                  return (
                    <Button
                      key={s}
                      onClick={() => changeStatus(s)}
                      disabled={updatingStatus || active}
                      type={active ? "primary" : "default"}
                      style={{
                        fontWeight: 600,
                        ...(active
                          ? {
                              background: `linear-gradient(135deg, ${cfg.color} 0%, ${cfg.color}cc 100%)`,
                              borderColor: cfg.color,
                            }
                          : undefined),
                      }}
                    >
                      <span className="mr-1.5">{cfg.icon}</span>
                      {cfg.label}
                      {active && (
                        <span className="ml-2 rounded-full bg-white/30 px-2 py-0.5 text-[11px] font-bold">
                          ปัจจุบัน
                        </span>
                      )}
                    </Button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── INFO GRID ─────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card styles={{ body: { padding: 20 } }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-lg dark:bg-sky-950">
              👤
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
              ข้อมูลส่วนตัว
            </h2>
          </div>
          <dl className="space-y-3 text-sm">
            <InfoRow
              icon={<HeartOutlined />}
              label="เพศ"
              value={genderLabel(patient.gender)}
            />
            <InfoRow
              icon="🎂"
              label="อายุ"
              value={patient.age != null ? `${patient.age} ปี` : "—"}
            />
            <InfoRow
              icon={<PhoneOutlined />}
              label="เบอร์โทร"
              value={patient.phone || "—"}
              mono={!!patient.phone}
            />
            <InfoRow
              icon={<CalendarOutlined />}
              label="ลงทะเบียน"
              value={formatDateTime(patient.created_at)}
            />
          </dl>
        </Card>

        <Card styles={{ body: { padding: 20 } }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-lg dark:bg-amber-950">
              💬
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
              อาการเบื้องต้น
            </h2>
          </div>
          {patient.symptom ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-zinc-900">
              {patient.symptom}
            </p>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm font-semibold text-zinc-600">
              ไม่มีข้อมูลอาการ
            </div>
          )}
        </Card>

        <Card styles={{ body: { padding: 20 } }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-lg dark:bg-rose-950">
              ⚠️
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
              เงื่อนไขพิเศษ
            </h2>
          </div>
          {pathway?.special_conditions &&
          pathway.special_conditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pathway.special_conditions.map((c) => (
                <Tag
                  key={c}
                  color="magenta"
                  icon={<EnvironmentOutlined />}
                  className="m-0!"
                  style={{ fontWeight: 600 }}
                >
                  {c}
                </Tag>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm font-semibold text-zinc-600">
              ไม่มีเงื่อนไขพิเศษ
            </div>
          )}
        </Card>
      </div>

      {/* ─── CARE PATHWAY ──────────────────────────────── */}
      <Card className="mt-6!" styles={{ body: { padding: 20 } }}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-lg dark:bg-teal-950">
              🛣️
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
                Care Pathway · ตำแหน่งปัจจุบัน
              </h2>
              <Text className="mt-1 block text-sm! font-semibold! text-zinc-700!">
                {pathway?.visit
                  ? `Visit #${pathway.visit.id} · ${pathway.visit.completed_steps}/${pathway.visit.total_steps} ผ่านแล้ว`
                  : "ลำดับขั้นตอนการดูแลผู้ป่วยตามแม่แบบ"}
              </Text>
            </div>
          </div>
          <Link href={`/patient/${patient.id}/pathway`}>
            <Button type="primary" style={{ fontWeight: 600 }}>
              {pathway?.pathway_template
                ? "เปลี่ยน Pathway"
                : "+ กำหนด Pathway"}
            </Button>
          </Link>
        </div>

        {pathway?.pathway_template ? (
          <>
            <div className="rounded-xl border border-teal-500 bg-linear-to-r from-teal-50 to-emerald-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-black text-teal-950">
                    {pathway.pathway_template.name}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-teal-800">
                    {pathway.pathway_template.code}
                  </p>
                </div>
                {pathway.visit && (
                  <Tag
                    color={
                      pathway.visit.status === "active"
                        ? "cyan"
                        : pathway.visit.status === "completed"
                        ? "green"
                        : "default"
                    }
                    className="m-0!"
                    style={{ fontWeight: 700 }}
                  >
                    {pathway.visit.status === "active"
                      ? "🔵 กำลังดำเนินการ"
                      : pathway.visit.status === "completed"
                      ? "✅ เสร็จสมบูรณ์"
                      : "⛔ ยกเลิก"}
                  </Tag>
                )}
              </div>
              {pathway.pathway_template.description && (
                <p className="mt-2 text-sm font-semibold leading-relaxed text-teal-900">
                  {pathway.pathway_template.description}
                </p>
              )}
            </div>

            {/* ─── ตำแหน่งปัจจุบัน highlight ───────────── */}
            {pathway.visit?.current_step && (
              <div className="mt-4 rounded-xl border-2 border-teal-500 bg-linear-to-br from-teal-50 via-emerald-50 to-cyan-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-500 text-2xl text-white shadow-md ring-4 ring-teal-200 dark:ring-teal-900">
                      📍
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                        ขณะนี้อยู่ที่
                      </p>
                      <p className="mt-1 text-xl font-black text-teal-950">
                        {pathway.visit.current_step.stage}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-teal-800">
                        ขั้นตอนที่{" "}
                        <span className="font-bold">
                          {pathway.visit.current_step.step_order}
                        </span>{" "}
                        จาก{" "}
                        <span className="font-bold">
                          {pathway.visit.total_steps}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {pathway.visit.current_step.status === "in_progress" ? (
                      <Tag
                        color="cyan"
                        className="m-0! animate-pulse"
                        style={{ fontWeight: 700 }}
                      >
                        ▶ กำลังตรวจ
                      </Tag>
                    ) : (
                      <Tag
                        color="gold"
                        className="m-0!"
                        style={{ fontWeight: 700 }}
                      >
                        ⏳ รอเรียก
                      </Tag>
                    )}
                    {pathway.visit.current_step.started_at && (
                      <span className="text-xs font-bold text-teal-700">
                        เริ่ม{" "}
                        {new Date(
                          pathway.visit.current_step.started_at
                        ).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-teal-700">
                      ความคืบหน้า
                    </span>
                    <span className="font-mono text-teal-900">
                      {pathway.visit.completed_steps}/{pathway.visit.total_steps}{" "}
                      ·{" "}
                      {Math.round(
                        (pathway.visit.completed_steps /
                          pathway.visit.total_steps) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-teal-200 dark:bg-teal-900">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                      style={{
                        width: `${
                          (pathway.visit.completed_steps /
                            pathway.visit.total_steps) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* quick action */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {pathway.visit.current_step.status === "pending" && (
                    <Link href="/queue">
                      <Button
                        type="primary"
                        style={{
                          fontWeight: 700,
                          background:
                            "linear-gradient(135deg, #0d9488 0%, #047857 100%)",
                          borderColor: "#0d9488",
                        }}
                      >
                        📢 ไปเรียกคิว →
                      </Button>
                    </Link>
                  )}
                  {pathway.visit.current_step.status === "in_progress" && (
                    <Link href="/queue">
                      <Button
                        type="primary"
                        icon={<CheckCircleFilled />}
                        style={{ fontWeight: 700 }}
                      >
                        ✓ ไปบันทึกตรวจเสร็จ →
                      </Button>
                    </Link>
                  )}
                  <Link href={`/patient/${patient.id}/pathway`}>
                    <Button>ดูหน้าเลือก Pathway</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* ─── ลำดับขั้นตอนทั้งหมด ───────────────────── */}
            <div className="mt-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-800">
                ลำดับขั้นตอนทั้งหมด
              </p>
              {pathway.visit?.steps && pathway.visit.steps.length > 0 ? (
                <ol className="relative space-y-2.5">
                  {pathway.visit.steps.map((step, idx) => {
                    const isCurrent =
                      pathway.visit!.current_step?.step_order ===
                        step.step_order &&
                      (step.status === "in_progress" ||
                        step.status === "pending");
                    return (
                      <li
                        key={`${step.step_order}-${step.stage}`}
                        className="relative flex items-start gap-3"
                      >
                        {/* connector line */}
                        {idx < pathway.visit!.steps.length - 1 && (
                          <span
                            aria-hidden
                            className={`absolute left-3.5 top-7 h-[calc(100%-12px)] w-0.5 ${
                              step.status === "completed"
                                ? "bg-emerald-300 dark:bg-emerald-800"
                                : step.status === "skipped"
                                ? "bg-zinc-300 dark:bg-zinc-700"
                                : "bg-zinc-200 dark:bg-zinc-800"
                            }`}
                          />
                        )}

                        {/* icon dot */}
                        <span
                          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ring-2 ring-white dark:ring-zinc-900 ${
                            step.status === "completed"
                              ? "bg-emerald-500 text-white"
                              : step.status === "in_progress"
                              ? "bg-teal-500 text-white"
                              : step.status === "skipped"
                              ? "bg-zinc-400 text-white"
                              : "bg-white text-zinc-400 ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-700"
                          } ${isCurrent ? "ring-teal-400 dark:ring-teal-600" : ""}`}
                        >
                          {step.status === "completed" ? (
                            <CheckCircleOutlined />
                          ) : step.status === "in_progress" ? (
                            <PlayCircleOutlined />
                          ) : step.status === "skipped" ? (
                            <ForwardOutlined />
                          ) : (
                            <span className="text-xs font-bold">
                              {step.step_order}
                            </span>
                          )}
                        </span>

                        {/* content */}
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span
                              className={`text-sm ${
                                step.status === "pending"
                                  ? "font-semibold text-zinc-700"
                                  : "font-bold text-zinc-950"
                              }`}
                            >
                              {step.stage}
                            </span>
                            {isCurrent && step.status === "in_progress" && (
                              <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                                กำลังตรวจ
                              </span>
                            )}
                            {isCurrent && step.status === "pending" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                รอเรียก
                              </span>
                            )}
                          </div>
                          {step.completed_at && (
                            <p className="mt-0.5 text-xs font-bold text-emerald-700">
                              ✓ ผ่านเมื่อ{" "}
                              {new Date(step.completed_at).toLocaleTimeString(
                                "th-TH",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </p>
                          )}
                          {step.notes && (
                            <p className="mt-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                              💬 {step.notes}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                // fallback ถ้ายังไม่มี visit — ใช้ stages จาก template
                <Steps
                  direction="vertical"
                  size="small"
                  items={pathway.pathway_template.stages.map(
                    (stage, idx) => ({
                      title: (
                        <span className="text-base font-bold text-zinc-950">
                          {stage}
                        </span>
                      ),
                      description: (
                        <span className="text-sm font-semibold text-zinc-700">
                          ขั้นตอนที่ {idx + 1} จาก{" "}
                          <span className="font-bold text-zinc-900">
                            {pathway.pathway_template!.stages.length}
                          </span>
                        </span>
                      ),
                      status: "wait",
                    })
                  )}
                />
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl dark:bg-teal-950">
              🛣️
            </div>
            <p className="mt-3 text-lg font-bold text-zinc-800">
              ยังไม่ได้กำหนด Care Pathway
            </p>
            <Text className="mt-1 block text-sm! font-semibold! text-zinc-700!">
              เลือกแม่แบบเพื่อกำหนดลำดับขั้นตอนการดูแล
            </Text>
            <Link href={`/patient/${patient.id}/pathway`}>
              <Button type="primary" className="mt-4!" style={{ fontWeight: 600 }}>
                เลือกแม่แบบเลย →
              </Button>
            </Link>
          </div>
        )}
      </Card>

      <Text className="mx-auto mt-8 block text-center text-sm! font-semibold! text-zinc-600!">
        ข้อมูลจาก GET /patients/{patient.id}
      </Text>
    </main>
  );
}

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-base font-bold text-zinc-700">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-700">
          {label}
        </p>
        <p
          className={`truncate text-sm font-bold text-zinc-900 ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
