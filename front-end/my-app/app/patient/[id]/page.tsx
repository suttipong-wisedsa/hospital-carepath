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
                <Text className="text-xs! font-bold! uppercase! tracking-[0.2em]! text-zinc-700! dark:text-zinc-300!">
                  รหัสผู้ป่วย
                </Text>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
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
                <Text className="text-sm! font-medium! text-zinc-700! dark:text-zinc-300!">
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
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              อัปเดตสถานะ
            </h2>
            <Text className="mt-1 block text-sm! text-zinc-600! dark:text-zinc-400!">
              เปลี่ยนสถานะผู้ป่วย —{" "}
              <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-sm font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
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
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
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
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              อาการเบื้องต้น
            </h2>
          </div>
          {patient.symptom ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-zinc-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-zinc-100">
              {patient.symptom}
            </p>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
              ไม่มีข้อมูลอาการ
            </div>
          )}
        </Card>

        <Card styles={{ body: { padding: 20 } }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-lg dark:bg-rose-950">
              ⚠️
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
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
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
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
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                Care Pathway
              </h2>
              <Text className="mt-1 block text-sm! text-zinc-700! dark:text-zinc-300!">
                ลำดับขั้นตอนการดูแลผู้ป่วยตามแม่แบบ
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
            <div className="rounded-xl border border-teal-300 bg-linear-to-r from-teal-50 to-emerald-50 p-4 dark:border-teal-900 dark:from-teal-950/40 dark:to-emerald-950/40">
              <p className="text-lg font-bold text-teal-900 dark:text-teal-100">
                {pathway.pathway_template.name}
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-teal-800 dark:text-teal-300">
                {pathway.pathway_template.code}
              </p>
              {pathway.pathway_template.description && (
                <p className="mt-2 text-sm font-medium leading-relaxed text-teal-900 dark:text-teal-100">
                  {pathway.pathway_template.description}
                </p>
              )}
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                ลำดับขั้นตอน ·{" "}
                <span className="text-teal-700 dark:text-teal-400">
                  {pathway.pathway_template.stages.length} ขั้น
                </span>
              </p>
              <Steps
                direction="vertical"
                size="small"
                current={pathway.pathway_template.stages.length - 1}
                items={pathway.pathway_template.stages.map((stage, idx) => ({
                  title: (
                    <span className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                      {stage}
                    </span>
                  ),
                  description: (
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      ขั้นตอนที่ {idx + 1} จาก{" "}
                      <span className="font-bold text-zinc-900 dark:text-zinc-50">
                        {pathway.pathway_template!.stages.length}
                      </span>
                    </span>
                  ),
                  status:
                    idx === pathway.pathway_template!.stages.length - 1
                      ? "process"
                      : "finish",
                }))}
              />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl dark:bg-teal-950">
              🛣️
            </div>
            <p className="mt-3 text-lg font-bold text-zinc-800 dark:text-zinc-100">
              ยังไม่ได้กำหนด Care Pathway
            </p>
            <Text className="mt-1 block text-sm! text-zinc-700! dark:text-zinc-300!">
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

      <Text className="mx-auto mt-8 block text-center text-sm! font-semibold! text-zinc-600! dark:text-zinc-400!">
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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-base font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
          {label}
        </p>
        <p
          className={`truncate text-sm font-bold text-zinc-900 dark:text-zinc-50 ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
