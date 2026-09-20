"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  Tag,
  Progress,
  Skeleton,
  Result,
  Empty,
  App,
  Avatar,
  Input,
} from "antd";
import {
  ReloadOutlined,
  SoundOutlined,
  CheckCircleOutlined,
  ForwardOutlined,
  SearchOutlined,
  StopOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  EnvironmentOutlined,
  TagOutlined,
} from "@ant-design/icons";
import {
  getQueue,
  callQueue,
  completeQueueStep,
  skipQueueStep,
  completeVisit,
  cancelVisit,
  type QueueEntry,
  type StepStatus,
} from "../lib/api";

// ─── Configs ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTES = ["linear-gradient(135deg, #f43f5e 0%, #be123c 100%)","linear-gradient(135deg, #f97316 0%, #c2410c 100%)","linear-gradient(135deg, #10b981 0%, #047857 100%)","linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)","linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)","linear-gradient(135deg, #d946ef 0%, #a21caf 100%)","linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)","linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarBg(name: string): string {
  return AVATAR_PALETTES[(name.charCodeAt(0) || 0) % AVATAR_PALETTES.length];
}

function formatTime(iso?: string | null): string {
  if (!iso) return"";
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour:"2-digit",
    minute:"2-digit",
  });
}

const STEP_META: Record<
  StepStatus,
  { icon: React.ReactNode; label: string; tone: string; dot: string; text: string }
> = {
  pending: {
    icon: <ClockCircleOutlined />,
    label: "รอ",
    tone:"text-amber-700",
    dot:"bg-amber-100 ring-2 ring-amber-400",
    text:"text-amber-800",
  },
  in_progress: {
    icon: <PlayCircleOutlined />,
    label: "กำลังตรวจ",
    tone:"text-teal-700",
    dot:"bg-teal-500",
    text:"text-white",
  },
  completed: {
    icon: <CheckCircleOutlined />,
    label: "ผ่านแล้ว",
    tone:"text-emerald-700",
    dot:"bg-emerald-500",
    text:"text-white",
  },
  skipped: {
    icon: <ForwardOutlined />,
    label: "ข้าม",
    tone:"text-zinc-500",
    dot:"bg-zinc-300 ring-2 ring-zinc-400",
    text:"text-zinc-700",
  },
};

const PATHWAY_PALETTES: Array<{ bg: string; ring: string; accent: string }> = [
  { bg:"from-teal-50 via-emerald-50 to-cyan-50", ring:"ring-teal-200", accent:"text-teal-800" },
  { bg:"from-sky-50 via-blue-50 to-indigo-50", ring:"ring-sky-200", accent:"text-sky-800" },
  { bg:"from-amber-50 via-orange-50 to-yellow-50", ring:"ring-amber-200", accent:"text-amber-800" },
  { bg:"from-rose-50 via-pink-50 to-fuchsia-50", ring:"ring-rose-200", accent:"text-rose-800" },
];

function pathwayPalette(code?: string) {
  if (!code) return PATHWAY_PALETTES[0];
  return PATHWAY_PALETTES[
    code.charCodeAt(0) % PATHWAY_PALETTES.length
  ];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const { message } = App.useApp();
  const [state, setState] = useState<"loading" |"success" |"error" |"empty">("loading"
  );
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [pointFilter, setPointFilter] = useState<string>("all"); //"all" | stage name
  const [pathwayFilter, setPathwayFilter] = useState<string>("all"); //"all" | template code
  const [busyVisitId, setBusyVisitId] = useState<number | null>(null);

  async function load() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await getQueue();
      setEntries(res.queue);
      setState(res.queue.length === 0 ? "empty" : "success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "โหลดคิวไม่สำเร็จ");
      setState("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Refresh queue after an action
  async function refreshOne(visitId: number) {
    try {
      const fresh = await import("../lib/api").then((m) =>
        m.getQueueEntry(visitId)
      );
      setEntries((prev) => {
        if (fresh.visit_status !== "active") {
          // ลบออกจากคิว
          return prev.filter((e) => e.visit_id !== visitId);
        }
        const exists = prev.some((e) => e.visit_id === visitId);
        return exists
          ? prev.map((e) => (e.visit_id === visitId ? fresh : e))
          : [...prev, fresh];
      });
    } catch {
      // best-effort refresh
    }
  }

  // ─── action handlers ─────────────────────────────────

  async function onCall(entry: QueueEntry) {
    setBusyVisitId(entry.visit_id);
    try {
      const res = await callQueue(entry.visit_id);
      message.success(`📢 เรียก ${entry.patient_name} เข้าห้อง"${res.called_step.stage}"`
      );
      await refreshOne(entry.visit_id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "เรียกคิวไม่สำเร็จ");
    } finally {
      setBusyVisitId(null);
    }
  }

  async function onComplete(entry: QueueEntry) {
    if (!entry.current_step) return;
    setBusyVisitId(entry.visit_id);
    try {
      const res = await completeQueueStep(
        entry.visit_id,
        entry.current_step.step_order
      );
      const doneMsg =`✓ ตรวจ"${res.completed_step.stage}" เสร็จแล้ว`;
      if (res.next_step) {
        message.success(`${doneMsg} → ถัดไป"${res.next_step.stage}"`);
      } else {
        message.success(`${doneMsg} 🎉 Visit เสร็จสมบูรณ์`);
      }
      await refreshOne(entry.visit_id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusyVisitId(null);
    }
  }

  async function onSkip(entry: QueueEntry) {
    if (!entry.current_step) return;
    setBusyVisitId(entry.visit_id);
    try {
      await skipQueueStep(entry.visit_id, entry.current_step.step_order);
      message.info(`ข้ามขั้นตอน"${entry.current_step.stage}" แล้ว`);
      await refreshOne(entry.visit_id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "ข้ามไม่สำเร็จ");
    } finally {
      setBusyVisitId(null);
    }
  }

  async function onCompleteVisit(entry: QueueEntry) {
    setBusyVisitId(entry.visit_id);
    try {
      await completeVisit(entry.visit_id);
      message.success(`ปิด visit ของ ${entry.patient_name} แล้ว`);
      await refreshOne(entry.visit_id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "ปิด visit ไม่สำเร็จ");
    } finally {
      setBusyVisitId(null);
    }
  }

  async function onCancel(entry: QueueEntry) {
    setBusyVisitId(entry.visit_id);
    try {
      await cancelVisit(entry.visit_id);
      message.warning(`ยกเลิก visit ของ ${entry.patient_name}`);
      await refreshOne(entry.visit_id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "ยกเลิกไม่สำเร็จ");
    } finally {
      setBusyVisitId(null);
    }
  }

  // ─── derived data ──────────────────────────────────────

  const counts = useMemo(() => {
    const c = { total: entries.length, waiting: 0, calling: 0 };
    for (const e of entries) {
      if (!e.current_step) continue;
      if (e.current_step.status === "in_progress") c.calling++;
      else if (e.current_step.status === "pending") c.waiting++;
    }
    return c;
  }, [entries]);

  // รวมจุดรักษาทั้งหมดที่มีอยู่ในคิว (นับจาก current_step.stage) + จำนวนคนต่อจุด
  const pointCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const stage = e.current_step?.stage;
      if (!stage) continue;
      map.set(stage, (map.get(stage) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => a.stage.localeCompare(b.stage));
  }, [entries]);

  // รวม Care Pathway template ทั้งหมดที่มีอยู่ในคิว + จำนวนคนต่อ pathway
  const pathwayCounts = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; count: number }
    >();
    for (const e of entries) {
      const code = e.pathway_template_code;
      if (!code) continue;
      const cur = map.get(code);
      if (cur) cur.count++;
      else
        map.set(code, {
          code,
          name: e.pathway_template_name ?? code,
          count: 1,
        });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [entries]);

  // ถ้าจุด/pathway ที่เลือกหายไปจากคิว (เช่น visit เสร็จ/ถูกลบ) → reset กลับเป็น all
  useEffect(() => {
    if (pointFilter !== "all" && !pointCounts.some((p) => p.stage === pointFilter)) {
      setPointFilter("all");
    }
  }, [pointFilter, pointCounts]);

  useEffect(() => {
    if (
      pathwayFilter !== "all" &&
      !pathwayCounts.some((p) => p.code === pathwayFilter)
    ) {
      setPathwayFilter("all");
    }
  }, [pathwayFilter, pathwayCounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      // ฟิลเตอร์ตาม Care Pathway
      if (pathwayFilter !== "all") {
        if (e.pathway_template_code !== pathwayFilter) return false;
      }
      // ฟิลเตอร์ตามจุดรักษา
      if (pointFilter !== "all") {
        if (e.current_step?.stage !== pointFilter) return false;
      }
      // ฟิลเตอร์ตามคำค้น
      if (q) {
        const hit =
          e.patient_name.toLowerCase().includes(q) ||
          e.patient_code.toLowerCase().includes(q) ||
          (e.pathway_template_code ??"").toLowerCase().includes(q) ||
          (e.pathway_template_name ??"").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [entries, search, pointFilter, pathwayFilter]);

  const hasActiveFilter =
    pointFilter !== "all" || pathwayFilter !== "all" || search !== "";

  function clearAllFilters() {
    setPointFilter("all");
    setPathwayFilter("all");
    setSearch("");
  }

  // ─── loading ───────────────────────────────────────────
  if (state === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <Skeleton active paragraph={{ rows: 1 }} className="w-32!" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton.Node
              key={i}
              active
              style={{ width:"100%", height: 72, borderRadius: 16 }}
            >
              <span />
            </Skeleton.Node>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton.Node
              key={i}
              active
              style={{ width:"100%", height: 280, borderRadius: 20 }}
            >
              <span />
            </Skeleton.Node>
          ))}
        </div>
      </main>
    );
  }

  // ─── error ─────────────────────────────────────────────
  if (state === "error") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mt-4">
          <Result
            status="error"
            title="โหลดคิวไม่สำเร็จ"
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* ─── header ────────────────────────────────────── */}
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-teal-700">
            Queue · คิวผู้ป่วย
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            คิวตรวจ
          </h1>
          <p className="mt-2 text-base font-medium text-zinc-700">
            เรียกคิว บันทึกการตรวจ และติดตามสถานะผู้ป่วยแบบ real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-zinc-400" />}
            placeholder="ค้นหาชื่อ / รหัส / pathway"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs!"
            size="large"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={load}
            size="large"
          >
            รีเฟรช
          </Button>
        </div>
      </section>

      {/* ─── KPI strip ──────────────────────────────────── */}
      <section className="mb-6 grid grid-cols-3 gap-3">
        <KpiCard label="ทั้งหมดในคิว" value={counts.total} tone="default" icon="📋" />
        <KpiCard label="กำลังตรวจ" value={counts.calling} tone="teal" icon="🔵" />
        <KpiCard label="รอเรียก" value={counts.waiting} tone="amber" icon="⏳" />
      </section>

      {/* ─── ฟิลเตอร์ตาม Care Pathway ─────────────────────────────── */}
      {pathwayCounts.length > 0 && (
        <section className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <TagOutlined className="text-sky-700" />
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              ฟิลเตอร์ตาม Care Pathway
            </p>
            <span className="text-xs font-semibold text-zinc-600">
              · ดูเฉพาะคิวของแม่แบบที่สนใจ
            </span>
            {hasActiveFilter && (
              <Button
                type="link"
                size="small"
                onClick={clearAllFilters}
                className="ml-auto!"
              >
                ล้างตัวกรองทั้งหมด
              </Button>
            )}
          </div>
          <div
            role="tablist"
            aria-label="กรองตาม Care Pathway"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            <PathwayFilterPill
              active={pathwayFilter === "all"}
              onClick={() => setPathwayFilter("all")}
              label="ทั้งหมด"
              count={entries.length}
              icon="📋"
              palette={{
                bg:"from-zinc-700 to-zinc-900",
                ring:"ring-zinc-300",
                accent:"text-white",
              }}
            />
            {pathwayCounts.map((p) => {
              const palette = pathwayPalette(p.code);
              return (
                <PathwayFilterPill
                  key={p.code}
                  active={pathwayFilter === p.code}
                  onClick={() =>
                    setPathwayFilter(pathwayFilter === p.code ? "all" : p.code)
                  }
                  label={p.name}
                  count={p.count}
                  icon="🛣️"
                  palette={{
                    bg: palette.bg,
                    ring: palette.ring,
                    accent: palette.accent,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ─── ฟิลเตอร์จุดรักษา ─────────────────────────────── */}
      {pointCounts.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <EnvironmentOutlined className="text-teal-700" />
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              ฟิลเตอร์ตามจุดรักษา
            </p>
            <span className="text-xs font-semibold text-zinc-600">
              · เลือกดูเฉพาะคิวของจุดที่รับผิดชอบ
            </span>
          </div>
          <div
            role="tablist"
            aria-label="กรองตามจุดรักษา"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          >
            {/* pill: ทั้งหมด */}
            <PointFilterPill
              active={pointFilter === "all"}
              onClick={() => setPointFilter("all")}
              label="ทั้งหมด"
              count={entries.length}
              icon="📋"
            />
            {pointCounts.map((p) => (
              <PointFilterPill
                key={p.stage}
                active={pointFilter === p.stage}
                onClick={() =>
                  setPointFilter(pointFilter === p.stage ? "all" : p.stage)
                }
                label={p.stage}
                count={p.count}
                icon="📍"
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── queue list ─────────────────────────────────── */}
      {state === "empty" ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12">
          <Empty
            image={<div className="text-6xl">📭</div>}
            styles={{ image: { height: 96 } }}
            description={
              <div>
                <p className="text-lg font-bold text-zinc-900">
                  คิวว่างเปล่า
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-600">
                  ยังไม่มี visit ที่ active — ลงทะเบียนผู้ป่วยและกำหนด pathway
                  เพื่อเริ่มคิว
                </p>
              </div>
            }
          >
            <Link href="/patient">
              <Button type="primary">ไปหน้าผู้ป่วย →</Button>
            </Link>
          </Empty>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-zinc-700">
            ไม่พบคิวที่ตรงกับ
            {pathwayFilter !== "all" && (
              <>
                {""}
                pathway{""}
                <span className="font-black text-sky-700">"
                  {pathwayCounts.find((p) => p.code === pathwayFilter)?.name ??
                    pathwayFilter}"
                </span>
              </>
            )}
            {pointFilter !== "all" && (
              <>
                {""}
                จุด{""}
                <span className="font-black text-teal-700">"{pointFilter}"
                </span>
              </>
            )}
            {search && (
              <>
                {""}และคำค้น{""}
                <span className="font-black text-teal-700">"{search}"
                </span>
              </>
            )}
          </p>
          <Button type="link" onClick={clearAllFilters}>
            ล้างตัวกรองทั้งหมด
          </Button>
        </div>
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {filtered.map((entry) => (
            <QueueCard
              key={entry.visit_id}
              entry={entry}
              busy={busyVisitId === entry.visit_id}
              onCall={() => onCall(entry)}
              onComplete={() => onComplete(entry)}
              onSkip={() => onSkip(entry)}
              onCompleteVisit={() => onCompleteVisit(entry)}
              onCancel={() => onCancel(entry)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

// ─── QueueCard ────────────────────────────────────────────────────────────────

function QueueCard({
  entry,
  busy,
  onCall,
  onComplete,
  onSkip,
  onCompleteVisit,
  onCancel,
}: {
  entry: QueueEntry;
  busy: boolean;
  onCall: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onCompleteVisit: () => void;
  onCancel: () => void;
}) {
  const palette = pathwayPalette(entry.pathway_template_code);
  const currentStep = entry.current_step;
  const noMoreSteps = !currentStep; // visit ที่ไม่มี step เหลือแล้ว (กรณี edge)

  const percent =
    entry.total_steps > 0
      ? Math.round((entry.completed_steps / entry.total_steps) * 100)
      : 0;

  return (
    <li
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm ring-1 transition hover:shadow-md ${
        currentStep?.status === "in_progress"
          ? "border-teal-400 ring-2 ring-teal-300"
          : "border-zinc-300 ring-1 ring-zinc-200"
        }`}
    >
      {/* ─── gradient header ──────────────────────── */}
      <div
        className={`bg-linear-to-br ${palette.bg} px-5 py-4 ring-1 ring-inset ${palette.ring}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              size={52}
              style={{
                background: avatarBg(entry.patient_name),
                color:"#fff",
                fontWeight: 700,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {initials(entry.patient_name)}
            </Avatar>
            <div className="min-w-0">
              <p
                className={`text-[11px] font-black uppercase tracking-[0.12em] ${palette.accent}`}
              >
                Visit #{entry.visit_id}
              </p>
              <p className="truncate text-lg font-black text-zinc-950">
                {entry.patient_name}
              </p>
              <p className="font-mono text-sm font-bold text-zinc-800">
                {entry.patient_code}
              </p>
            </div>
          </div>

          {currentStep ? (
            <Tag
              color={
                currentStep.status === "in_progress"
                  ? "cyan"
                  : currentStep.status === "completed"
                    ? "green"
                    : "gold"
              }
              className="m-0! px-2.5! py-1! text-sm!"
              style={{ fontWeight: 700 }}
              icon={STEP_META[currentStep.status].icon}
            >
              {STEP_META[currentStep.status].label}
            </Tag>
          ) : (
            <Tag color="green" className="m-0!" style={{ fontWeight: 700 }}>
              ✓ เสร็จสมบูรณ์
            </Tag>
          )}
        </div>

        {/* pathway + progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span
              className={`font-bold tracking-wide ${palette.accent}`}
            >
              {entry.pathway_template_name ??"ไม่มี pathway"}
            </span>
            <span className="font-mono font-extrabold text-zinc-900">
              {entry.completed_steps}/{entry.total_steps}
              <span className="ml-1.5 text-[10px] font-bold text-zinc-700">
                · {percent}%
              </span>
            </span>
          </div>
          <Progress
            percent={percent}
            showInfo={false}
            strokeColor={
              percent >= 100
                ? "#10b981"
                : currentStep?.status === "in_progress"
                  ? "#0d9488"
                  : "#71717a"
            }
            trailColor="rgba(0,0,0,0.06)"
            size="small"
            className="mt-1!"
          />
        </div>

        {/* special conditions */}
        {entry.special_conditions && entry.special_conditions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.special_conditions.map((c) => (
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
        )}
      </div>

      {/* ─── step list ─────────────────────────────── */}
      <div className="px-5 py-4">
        <ol className="relative space-y-2.5">
          {(entry.steps ?? []).map((step, idx) => {
            const meta = STEP_META[step.status];
            const isCurrent =
              currentStep?.step_order === step.step_order &&
              step.status === "in_progress";
            const isPendingCall =
              currentStep?.step_order === step.step_order &&
              step.status === "pending";
            return (
              <li key={step.id} className="relative flex items-start gap-3">
                {/* connector line */}
                {idx < (entry.steps?.length ?? 0) - 1 && (
                  <span
                    aria-hidden
                    className={`absolute left-3.5 top-7 h-[calc(100%-12px)] w-0.5 ${
                      step.status === "completed"
                        ? "bg-emerald-400"
                        : step.status === "skipped"
                          ? "bg-zinc-300"
                          : "bg-zinc-300"
                      }`}
                  />
                )}

                {/* icon dot */}
                <span
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ring-2 ring-white ${meta.dot} ${meta.text}`}
                >
                  {step.status === "completed" ? (
                    <CheckCircleOutlined />
                  ) : step.status === "skipped" ? (
                    <ForwardOutlined />
                  ) : step.status === "in_progress" ? (
                    <PlayCircleOutlined />
                  ) : (
                    <span className="text-xs font-extrabold">
                      {step.step_order}
                    </span>
                  )}
                </span>

                {/* content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className={`text-[15px] ${
                        step.status === "pending"
                          ? "font-semibold text-zinc-700"
                          : step.status === "skipped"
                            ? "font-bold text-zinc-500 line-through decoration-zinc-400"
                            : step.status === "in_progress"
                              ? "font-extrabold text-teal-900"
                              : "font-extrabold text-zinc-950"
                        }`}
                    >
                      {step.stage}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                        กำลังตรวจ
                      </span>
                    )}
                    {isPendingCall && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                        รอเรียก
                      </span>
                    )}
                  </div>
                  {step.completed_at && (
                    <p className="mt-0.5 text-xs font-bold text-emerald-700">
                      ✓ {formatTime(step.completed_at)}
                    </p>
                  )}
                  {step.started_at && step.status === "in_progress" && (
                    <p className="mt-0.5 text-xs font-bold text-teal-800">
                      ▶ เริ่ม {formatTime(step.started_at)}
                    </p>
                  )}
                  {step.notes && (
                    <p className="mt-1.5 rounded-md border-l-4 border-teal-400 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-800">
                      💬 {step.notes}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* ─── actions ─────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-zinc-200 pt-4">
          {noMoreSteps ? (
            <Tag color="green" className="m-0!" style={{ fontWeight: 700 }}>
              ✓ ผ่านทุกขั้นตอนแล้ว
            </Tag>
          ) : currentStep?.status === "in_progress" ? (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={onComplete}
                loading={busy}
                size="middle"
                style={{ fontWeight: 700 }}
              >
                ตรวจเสร็จ → ถัดไป
              </Button>
              <Button
                icon={<ForwardOutlined />}
                onClick={onSkip}
                loading={busy}
                size="middle"
              >
                ข้าม
              </Button>
            </>
          ) : currentStep?.status === "pending" ? (
            <Button
              type="primary"
              icon={<SoundOutlined />}
              onClick={onCall}
              loading={busy}
              size="middle"
              style={{
                fontWeight: 700,
                background:"linear-gradient(135deg, #0d9488 0%, #047857 100%)",
                borderColor:"#0d9488",
              }}
            >
              📢 เรียกคิว
            </Button>
          ) : null}

          <div className="ml-auto flex gap-2">
            <Link href={`/patient/${entry.patient_code}`}>
              <Button size="middle">ดูผู้ป่วย</Button>
            </Link>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={onCompleteVisit}
              loading={busy}
              size="middle"
              title="ปิด visit (mark ทุก step ที่เหลือเป็น completed)"
              style={{ fontWeight: 600 }}
            >
              ปิด Visit
            </Button>
            <Button
              danger
              type="text"
              icon={<StopOutlined />}
              onClick={onCancel}
              loading={busy}
              size="middle"
              title="ยกเลิก visit"
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

// ─── Pathway Filter Pill ────────────────────────────────────────────────────────

function PathwayFilterPill({
  active,
  onClick,
  label,
  count,
  icon,
  palette,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: string;
  palette: { bg: string; ring: string; accent: string };
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-all duration-150 ${
        active
          ?`border-transparent bg-linear-to-r ${palette.bg} ${palette.accent} shadow-md ring-2 ${palette.ring}`
          :`border-zinc-200 bg-white text-zinc-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800`
        }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-black tabular-nums leading-none ${
          active
            ? "bg-white/75 text-zinc-900"
            : "bg-zinc-100 text-zinc-700 group-hover:bg-sky-100 group-hover:text-sky-800"
          }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Point Filter Pill ─────────────────────────────────────────────────────────

function PointFilterPill({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-all duration-150 ${
        active
          ? "border-teal-500 bg-linear-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30 ring-2 ring-teal-200"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
        }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-black tabular-nums leading-none ${
          active
            ? "bg-white/25 text-white"
            : "bg-zinc-100 text-zinc-700 group-hover:bg-teal-100 group-hover:text-teal-800"
          }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone:"default" |"teal" |"amber";
  icon: string;
}) {
  const toneStyles = {
    default:"from-zinc-100 to-zinc-50 text-zinc-900",
    teal:"from-teal-100 to-teal-50 text-teal-900",
    amber:"from-amber-100 to-amber-50 text-amber-900",
  }[tone];

  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-linear-to-br p-4 shadow-sm ${toneStyles}`}
    >
      <div className="flex items-center justify-between text-xs font-bold opacity-80">
        <span>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}
