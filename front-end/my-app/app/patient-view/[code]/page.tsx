"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Skeleton,
  Result,
  App as AntApp,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  PlayCircleFilled,
  RightOutlined,
  ReloadOutlined,
  IdcardOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  getPatient,
  getPatientPathway,
  type Patient,
  type PatientPathwayResponse,
  type PathwayStepView,
} from "../../lib/api";

type LoadState ="loading" |"success" |"error" |"empty";

// helper — translate stage name to friendly Thai label
function friendlyStage(stage: string): string {
  const map: Record<string, string> = {
    registration:"ลงทะเบียน",
    triage:"คัดกรองอาการ",
    vitals_check:"วัดสัญญาณชีพ",
    waiting:"รอพบแพทย์",
    in_consultation:"ตรวจรักษา",
    lab:"เจาะเลือด/ตรวจแล็บ",
    imaging:"เอกซเรย์/ตรวจภาพ",
    pharmacy:"รับยา",
    payment:"ชำระเงิน",
    discharge:"กลับบ้าน",
    follow_up:"นัดติดตามอาการ",
  };
  return map[stage] ?? stage;
}

// helper — friendly Thai for status
function statusThai(status?: string): { label: string; emoji: string } {
  switch (status) {
    case"in_progress":
      return { label: "กำลังตรวจ", emoji:"🔵" };
    case"completed":
      return { label: "เสร็จแล้ว", emoji:"✅" };
    case"pending":
      return { label: "รอคิว", emoji:"⏳" };
    case"skipped":
      return { label: "ข้าม", emoji:"⏭️" };
    default:
      return { label: "—", emoji:"·" };
  }
}

// helper — time format
function hhmm(iso?: string | null): string {
  if (!iso) return"";
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour:"2-digit",
    minute:"2-digit",
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PatientViewPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ??"";
  const { message } = AntApp.useApp();

  const [state, setState] = useState<LoadState>("loading");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [pathway, setPathway] = useState<PatientPathwayResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!code) return;
    if (!silent) setState("loading");
    setErrorMsg("");
    try {
      const [p, pw] = await Promise.all([
        getPatient(code),
        getPatientPathway(code),
      ]);
      setPatient(p);
      setPathway(pw);
      setState(pw.pathway_template ? "success" : "empty");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
      setState("error");
    }
  }

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      load();
    }, 0);
    // auto-refresh ทุก 30 วินาที เพื่อให้คิวอัปเดตเอง
    const t = setInterval(() => {
      load(true);
    }, 30_000);

    // ─── Navigation guard ─────────────────────────
    // กันไม่ให้ผู้ป่วยกด back ไปยังหน้า staff (/queue, /patient/*, /patients/new)
    // โดย push history state เพิ่ม 1 ชั้น แล้วดัก popstate → redirect ไป /patient-view
    if (typeof window !== "undefined") {
      window.history.pushState({ patientView: true },"");

      function onPopState() {
        // ถ้าผู้ใช้กด back → ดีดไปหน้า entry เสมอ (ไม่ทิ้งให้หลุดไปหน้า staff)
        window.history.pushState({ patientView: true },"");
        window.location.replace("/patient-view");
      }

      window.addEventListener("popstate", onPopState);
      // cleanup
      return () => {
        clearTimeout(loadTimer);
        clearInterval(t);
        window.removeEventListener("popstate", onPopState);
      };
    }

    return () => {
      clearTimeout(loadTimer);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function manualRefresh() {
    setRefreshing(true);
    try {
      await load(true);
      message.success("อัปเดตข้อมูลแล้ว");
    } finally {
      setRefreshing(false);
    }
  }

  // ─── loading ───────────────────────────────────────────
  if (state === "loading") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Skeleton active paragraph={{ rows: 6 }} />
      </main>
    );
  }

  // ─── error ─────────────────────────────────────────────
  if (state === "error") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Result
          status="error"
          title="ไม่พบข้อมูลผู้ป่วย"
          subTitle={
            errorMsg ||"กรุณาตรวจสอบรหัสผู้ป่วย เช่น P0001 แล้วลองอีกครั้ง"
          }
          extra={
            <Link href="/patient-view">
              <Button type="primary" size="large">
                กรอกรหัสใหม่
              </Button>
            </Link>
          }
        />
      </main>
    );
  }

  // ─── success / empty ──────────────────────────────────
  const visit = pathway?.visit;
  const current = visit?.current_step;
  const totalSteps = visit?.total_steps ?? 0;
  const completedSteps = visit?.completed_steps ?? 0;
  const percent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const currentStepInfo = statusThai(current?.status);

  // หา step ถัดไป (ที่ยัง pending หลัง current)
  const nextStep = (() => {
    if (!visit?.steps || !current) return null;
    const curIdx = visit.steps.findIndex(
      (s) => s.step_order === current.step_order
    );
    if (curIdx < 0) return null;
    for (let i = curIdx + 1; i < visit.steps.length; i++) {
      if (visit.steps[i].status === "pending") return visit.steps[i];
    }
    return null;
  })();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      {/* ─── top bar (ไม่มี link ไปยังหน้า staff) ─────── */}
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/patient-view"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          title="ดูรหัสผู้ป่วยอื่น"
        >
          <ArrowLeftOutlined />
          ดูผู้ป่วยอื่น
        </Link>
        <button
          type="button"
          onClick={manualRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:opacity-50"
        >
          <ReloadOutlined spin={refreshing} />
          รีเฟรช
        </button>
      </header>

      {/* ─── welcome ──────────────────────────────── */}
      <section className="rounded-3xl bg-linear-to-br from-teal-500 via-emerald-500 to-cyan-600 px-6 py-7 text-white shadow-xl shadow-teal-500/30 sm:px-8 sm:py-9">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl backdrop-blur-sm">
            👋
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-white/80">
              ยินดีต้อนรับ
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {patient?.name ??"ผู้ป่วย"}
            </h1>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
            <IdcardOutlined />
            รหัส {patient?.id ?? code}
          </span>
          {patient?.gender && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <UserOutlined />
              {patient.gender === "M"
                ? "ชาย"
                : patient.gender === "F"
                  ? "หญิง"
                  : patient.gender}
              {patient.age ?` · ${patient.age} ปี` : ""}
            </span>
          )}
          {pathway?.pathway_template && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              🛣️ {pathway.pathway_template.name}
            </span>
          )}
        </div>
      </section>

      {/* ─── main status card ─────────────────────── */}
      {state === "empty" || !visit ? (
        <section className="mt-5 rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-4xl">
            🛣️
          </div>
          <p className="text-xl font-black text-zinc-900">
            ยังไม่ได้ลงทะเบียน Care Pathway
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-700">
            เจ้าหน้าที่จะช่วยกำหนดลำดับขั้นตอนการดูแลให้คุณในขั้นตอนถัดไป
          </p>
        </section>
      ) : visit.status === "completed" ? (
        <section className="mt-5 rounded-3xl border-2 border-emerald-300 bg-linear-to-br from-emerald-50 to-teal-50 p-8 text-center shadow-md">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-5xl text-white shadow-lg shadow-emerald-500/40">
            ✅
          </div>
          <p className="text-2xl font-black text-emerald-900">
            ตรวจเสร็จเรียบร้อยแล้ว
          </p>
          <p className="mt-2 text-base font-bold text-emerald-800">
            ขอบคุณที่ใช้บริการ 🙏
          </p>
          {visit.completed_at && (
            <p className="mt-3 text-xs font-bold text-emerald-700">
              เสร็จเมื่อ {hhmm(visit.completed_at)}
            </p>
          )}
        </section>
      ) : visit.status === "cancelled" ? (
        <section className="mt-5 rounded-3xl border-2 border-zinc-300 bg-zinc-50 p-8 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-400 text-5xl text-white">
            ⛔
          </div>
          <p className="text-2xl font-black text-zinc-700">
            visit ถูกยกเลิก
          </p>
        </section>
      ) : current ? (
        <>
          {/* ตำแหน่งปัจจุบัน — primary card */}
          <section
            className={`mt-5 rounded-3xl p-7 shadow-lg ring-1 sm:p-8 ${
              current.status === "in_progress"
                ? "bg-linear-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/40 ring-teal-300"
                : "bg-white text-zinc-900 ring-zinc-200"
              }`}
          >
            <p
              className={`text-xs font-black uppercase tracking-[0.15em] ${
                current.status === "in_progress"
                  ? "text-white/80"
                  : "text-teal-700"
                }`}
            >
              📍 ตำแหน่งปัจจุบัน
            </p>

            <p className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              {friendlyStage(current.stage)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black ${
                  current.status === "in_progress"
                    ? "bg-white/25 text-white"
                    : currentStepInfo.emoji === "⏳"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-teal-100 text-teal-900"
                  }`}
              >
                <span className="text-base">{currentStepInfo.emoji}</span>
                {currentStepInfo.label}
              </span>
              <span
                className={`text-sm font-bold ${
                  current.status === "in_progress"
                    ? "text-white/80"
                    : "text-zinc-600"
                  }`}
              >
                ขั้นตอนที่ {current.step_order} จาก {totalSteps}
              </span>
            </div>

            {current.started_at && current.status === "in_progress" && (
              <p
                className={`mt-3 text-sm font-bold ${
                  current.status === "in_progress"
                    ? "text-white/90"
                    : "text-teal-700"
                  }`}
              >
                ▶ เริ่มเมื่อ {hhmm(current.started_at)}
              </p>
            )}
          </section>

          {/* progress bar */}
          <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-wider text-zinc-700">
                ความคืบหน้า
              </p>
              <p className="font-mono text-2xl font-black tabular-nums text-teal-700">
                {percent}%
              </p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-linear-to-r from-teal-500 to-emerald-500 transition-all duration-700"
                style={{ width:`${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-zinc-600">
              ผ่านแล้ว {completedSteps} จาก {totalSteps} ขั้นตอน
            </p>
          </section>

          {/* ขั้นต่อไป — guidance */}
          {nextStep && current.status === "pending" && (
            <section className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-2xl text-white shadow-md">
                  ⏳
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                    รอเรียกคิว
                  </p>
                  <p className="mt-1 text-lg font-black text-amber-900">
                    {friendlyStage(current.stage)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-amber-800">
                    เจ้าหน้าที่จะเรียกคุณเข้ารับการตรวจ โปรดรอสักครู่
                  </p>
                </div>
              </div>
            </section>
          )}

          {nextStep && current.status === "in_progress" && (
            <section className="mt-4 rounded-2xl border-2 border-teal-300 bg-teal-50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-2xl text-white shadow-md">
                  <RightOutlined />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-teal-800">
                    ขั้นต่อไป
                  </p>
                  <p className="mt-1 text-lg font-black text-teal-900">
                    {friendlyStage(nextStep.stage)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-teal-800">
                    หลังเสร็จขั้นนี้ ระบบจะพาคุณไปขั้นถัดไปอัตโนมัติ
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ลำดับขั้นตอนทั้งหมด — read-only timeline */}
          <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="mb-4 text-sm font-black uppercase tracking-wider text-zinc-700">
              🛣️ ลำดับขั้นตอนทั้งหมด
            </p>
            <ol className="space-y-3">
              {visit.steps?.map((step, idx) => (
                <PatientStepRow
                  key={`${step.step_order}-${step.stage}`}
                  step={step}
                  isLast={idx === (visit.steps?.length ?? 0) - 1}
                  isCurrent={current?.step_order === step.step_order}
                />
              ))}
            </ol>
          </section>

          {/* ข้อมูลเพิ่มเติม */}
          {patient?.symptom && (
            <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-600">
                อาการที่ลงทะเบียน
              </p>
              <p className="mt-1.5 text-base font-bold text-zinc-900">
                {patient.symptom}
              </p>
            </section>
          )}
        </>
      ) : null}

      {/* ─── footer ─────────────────────────────────── */}
      <footer className="mt-10 text-center">
        <p className="text-xs font-bold text-zinc-500">
          หน้านี้สำหรับผู้ป่วยดูเท่านั้น · อัปเดตอัตโนมัติทุก 30 วินาที
        </p>
        <p className="mt-1 text-[10px] font-medium text-zinc-400">
          หากมีข้อสงสัย กรุณาสอบถามเจ้าหน้าที่
        </p>
      </footer>
    </main>
  );
}

// ─── Patient Step Row ─────────────────────────────────────────────────────────

function PatientStepRow({
  step,
  isLast,
  isCurrent,
}: {
  step: PathwayStepView;
  isLast: boolean;
  isCurrent: boolean;
}) {
  const isDone = step.status === "completed";
  const isSkipped = step.status === "skipped";
  const isPending = step.status === "pending";
  const isActive = step.status === "in_progress";

  return (
    <li className="relative flex items-start gap-4">
      {/* connector */}
      {!isLast && (
        <span
          aria-hidden
          className={`absolute left-5 top-11 h-[calc(100%-22px)] w-1 rounded ${
            isDone
              ? "bg-emerald-300"
              : "bg-zinc-200"
            }`}
        />
      )}

      {/* dot */}
      <span
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl shadow-md ring-4 ring-white ${
          isDone
            ? "bg-emerald-500 text-white"
            : isSkipped
              ? "bg-zinc-300 text-zinc-600"
              : isActive
                ? "bg-teal-500 text-white ring-teal-200"
                : isCurrent && isPending
                  ? "bg-amber-400 text-white ring-amber-200"
                  : "bg-white text-zinc-500 ring-zinc-200"
          }`}
      >
        {isDone ? (
          <CheckCircleFilled />
        ) : isSkipped ? ("⏭"
        ) : isActive ? (
          <PlayCircleFilled />
        ) : isCurrent && isPending ? ("⏳"
        ) : (
          <span className="text-base font-black">{step.step_order}</span>
        )}
      </span>

      {/* content */}
      <div className="min-w-0 flex-1 pb-1 pt-1">
        <p
          className={`text-lg ${
            isSkipped
              ? "font-medium text-zinc-500 line-through decoration-zinc-400"
              : isPending && !isCurrent
                ? "font-bold text-zinc-700"
                : isActive || (isCurrent && isPending)
                  ? "font-black text-zinc-950"
                  : isDone
                    ? "font-extrabold text-emerald-900"
                    : "font-extrabold text-zinc-950"
            }`}
        >
          {friendlyStage(step.stage)}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-bold">
          {isDone && step.completed_at && (
            <span className="text-emerald-700">
              ✓ เสร็จเมื่อ {hhmm(step.completed_at)}
            </span>
          )}
          {isActive && step.started_at && (
            <span className="text-teal-700">
              ▶ เริ่ม {hhmm(step.started_at)}
            </span>
          )}
          {isSkipped && <span className="text-zinc-500">ข้าม</span>}
          {isCurrent && isPending && (
            <span className="text-amber-700">
              ⏳ รอเรียกคิว
            </span>
          )}
          {isPending && !isCurrent && (
            <span className="text-zinc-500">ยังไม่ถึงคิว</span>
          )}
        </div>
      </div>
    </li>
  );
}
