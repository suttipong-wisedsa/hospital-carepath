"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Input,
  Tag,
  Steps,
  Skeleton,
  Result,
  App,
  Card,
  Empty,
} from "antd";
import {
  ArrowLeftOutlined,
  CloseOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  getPatient,
  getPathwayTemplates,
  getPatientPathway,
  assignPatientPathway,
  type Patient,
  type PathwayTemplate,
  type PatientPathwayResponse,
} from "../../../lib/api";

type LoadState ="loading" |"ready" |"error";

const TEMPLATE_PALETTES = [
  { bg:"from-teal-50 to-emerald-50", ring:"ring-teal-300", accent:"text-teal-700", dot:"bg-teal-500" },
  { bg:"from-sky-50 to-blue-50", ring:"ring-sky-300", accent:"text-sky-700", dot:"bg-sky-500" },
  { bg:"from-amber-50 to-orange-50", ring:"ring-amber-300", accent:"text-amber-700", dot:"bg-amber-500" },
  { bg:"from-rose-50 to-pink-50", ring:"ring-rose-300", accent:"text-rose-700", dot:"bg-rose-500" },
  { bg:"from-violet-50 to-purple-50", ring:"ring-violet-300", accent:"text-violet-700", dot:"bg-violet-500" },
  { bg:"from-lime-50 to-green-50", ring:"ring-lime-300", accent:"text-lime-700", dot:"bg-lime-500" },
];

function paletteFor(code: string) {
  const c = code.charCodeAt(0) || 0;
  return TEMPLATE_PALETTES[c % TEMPLATE_PALETTES.length];
}

const QUICK_CONDITIONS = ["wheelchair","fast_required","pregnancy","elderly","diabetic","allergy_penicillin",
];

export default function AssignPathwayPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const patientId = params?.id ??"";

  const [state, setState] = useState<LoadState>("loading");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [templates, setTemplates] = useState<PathwayTemplate[]>([]);
  const [currentPathway, setCurrentPathway] =
    useState<PatientPathwayResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedCode, setSelectedCode] = useState<string>("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [newCondition, setNewCondition] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setState("loading");
      try {
        const [p, tplRes, pw] = await Promise.all([
          getPatient(patientId),
          getPathwayTemplates(),
          getPatientPathway(patientId).catch(() => null),
        ]);
        setPatient(p);
        setTemplates(tplRes.templates);
        setCurrentPathway(pw);

        if (pw?.pathway_template) {
          setSelectedCode(pw.pathway_template.code);
          setConditions(pw.special_conditions ?? []);
        }
        setState("ready");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "โหลดไม่สำเร็จ");
        setState("error");
      }
    })();
  }, [patientId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.code === selectedCode) ?? null,
    [templates, selectedCode]
  );

  const isDirty = useMemo(() => {
    const currentCode = currentPathway?.pathway_template?.code ??"";
    const currentConds = currentPathway?.special_conditions ?? [];
    const sameCode = selectedCode === currentCode;
    const sameConds =
      conditions.length === currentConds.length &&
      [...conditions].sort().join("|") ===
      [...currentConds].sort().join("|");
    return !(sameCode && sameConds);
  }, [selectedCode, conditions, currentPathway]);

  function addCondition(raw: string) {
    const c = raw.trim().toLowerCase().replace(/\s+/g,"_");
    if (!c) return;
    if (conditions.includes(c)) return;
    setConditions([...conditions, c]);
  }

  function removeCondition(c: string) {
    setConditions(conditions.filter((x) => x !== c));
  }

  async function handleSave() {
    if (!patient) return;
    if (!selectedCode) {
      message.error("กรุณาเลือก Care Pathway");
      return;
    }
    setSaving(true);
    try {
      const res = await assignPatientPathway(patient.id, {
        template_code: selectedCode,
        special_conditions: conditions,
      });
      const steps = res.steps_created ?? 0;
      message.success(
        steps > 0
          ?`บันทึกสำเร็จ — สร้างขั้นตอนใหม่ ${steps} ขั้น`
          : "บันทึกสำเร็จ"
      );
      setTimeout(() => router.push(`/patient/${patient.id}`), 1200);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "บันทึกไม่สำเร็จ"
      );
    } finally {
      setSaving(false);
    }
  }

  // ─── loading ──────────────────────────────────────────
  if (state === "loading") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <Skeleton active paragraph={{ rows: 1 }} className="w-32!" />
        <Skeleton.Node
          active
          style={{ width:"100%", height: 160, borderRadius: 24, marginTop: 16 }}
        >
          <span />
        </Skeleton.Node>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Skeleton.Node
            active
            style={{ width:"100%", height: 256, borderRadius: 16 }}
          >
            <span />
          </Skeleton.Node>
          <Skeleton.Node
            active
            style={{ width:"100%", height: 256, borderRadius: 16 }}
          >
            <span />
          </Skeleton.Node>
        </div>
      </main>
    );
  }

  // ─── error ────────────────────────────────────────────
  if (state === "error" || !patient) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/patient"
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 transition hover:gap-2 hover:text-teal-900"
        >
          <ArrowLeftOutlined /> กลับไปรายการผู้ป่วย
        </Link>
        <div className="mt-4">
          <Result
            status="error"
            title="โหลดข้อมูลไม่สำเร็จ"
            subTitle={errorMsg}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      {/* breadcrumb */}
      <Link
        href={`/patient/${patient.id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 transition hover:gap-2 hover:text-teal-900"
      >
        <ArrowLeftOutlined /> กลับไปหน้ารายละเอียดผู้ป่วย
      </Link>

      {/* ─── HERO ───────────────────────────────────────── */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-linear-to-br from-teal-500 via-teal-600 to-emerald-600 px-6 py-7 shadow-lg shadow-teal-500/20 sm:px-10 sm:py-9">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl ring-1 ring-white/30 backdrop-blur">
            🛣️
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">
              กำหนด Care Pathway
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {patient.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm text-white">
              <span className="rounded-md bg-white/20 px-2 py-0.5 font-semibold backdrop-blur">
                {patient.id}
              </span>
              {patient.age != null && <span>{patient.age} ปี</span>}
              {patient.gender && <span>• {patient.gender}</span>}
            </div>
          </div>

          {currentPathway?.pathway_template && (
            <div className="rounded-xl bg-white/20 px-3 py-2 text-right text-sm text-white backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-50">
                Pathway ปัจจุบัน
              </p>
              <p className="mt-0.5 font-semibold">
                {currentPathway.pathway_template.name}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── TEMPLATE PICKER ────────────────────────────── */}
      <Card className="mt-6!" styles={{ body: { padding: 20 } }}>
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg">
            📋
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-zinc-900">
              เลือกแม่แบบ Care Pathway
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              เลือก 1 แม่แบบ — ระบบจะสร้าง visit และขั้นตอนให้อัตโนมัติ
            </p>
          </div>
        </div>

        {templates.length === 0 ? (
          <Empty
            description={
              <span className="text-zinc-600">
                ไม่มีแม่แบบในระบบ
              </span>
            }
            className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 py-8!"
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {templates.map((tpl) => {
              const palette = paletteFor(tpl.code);
              const selected = selectedCode === tpl.code;
              return (
                <li key={tpl.code}>
                  <button
                    type="button"
                    onClick={() => setSelectedCode(tpl.code)}
                    className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition ${
                      selected
                        ?`border-transparent bg-linear-to-br ${palette.bg} ring-2 ${palette.ring} shadow-md`
                        : "border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm"
                      }`}
                  >
                    {selected && (
                      <span
                        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow ${palette.dot}`}
                      >
                        ✓
                      </span>
                    )}

                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${palette.dot}`}
                      />
                      <div className="min-w-0 flex-1">
                        <h3
                          className={`text-base font-semibold ${
                            selected
                              ? palette.accent
                              : "text-zinc-900"
                            }`}
                        >
                          {tpl.name}
                        </h3>
                        <p className="mt-0.5 font-mono text-xs font-semibold text-zinc-600">
                          {tpl.code}
                        </p>
                      </div>
                    </div>

                    {tpl.description && (
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-zinc-700">
                        {tpl.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Tag className="m-0!" color={selected ? "default" : undefined}>
                        {tpl.stages.length} ขั้นตอน
                      </Tag>
                      <span className="line-clamp-1 font-medium text-zinc-600">
                        {tpl.stages.slice(0, 3).join(" →")}
                        {tpl.stages.length > 3 &&" …"}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ─── PREVIEW + CONDITIONS ───────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" styles={{ body: { padding: 20 } }}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg">
              👁️
            </span>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                ตัวอย่างขั้นตอน
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                ระบบจะสร้าง visit และ visit_step ตามลำดับนี้
              </p>
            </div>
          </div>

          {selectedTemplate ? (
            <>
              <div className="rounded-xl border border-emerald-700 bg-emerald-100 p-4">
                <p className="text-base font-bold text-emerald-950">
                  {selectedTemplate.name}
                </p>
                <p className="mt-0.5 font-mono text-xs font-bold text-emerald-700">
                  {selectedTemplate.code}
                </p>
              </div>

              <div className="mt-5">
                <Steps
                  direction="vertical"
                  size="small"
                  current={selectedTemplate.stages.length - 1}
                  items={selectedTemplate.stages.map((stage: string, idx: number) => ({
                    title: (
                      <span className="font-bold text-zinc-950">
                        {stage}
                      </span>
                    ),
                    description: (
                      <span className="text-xs font-semibold text-zinc-600">
                        ขั้นตอนที่ {idx + 1} จาก {selectedTemplate.stages.length}
                      </span>
                    ),
                    status:
                      idx === selectedTemplate.stages.length - 1
                        ? "process"
                        : "finish",
                  }))}
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl">
                👆
              </div>
              <p className="mt-3 text-sm font-semibold text-zinc-700">
                เลือกแม่แบบด้านบนเพื่อดูตัวอย่าง
              </p>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" styles={{ body: { padding: 20 } }}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-lg">
              ⚠️
            </span>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                เงื่อนไขพิเศษ
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                เพิ่ม tag ที่ต้องระวังในการดูแล
              </p>
            </div>
          </div>

          <Input
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onPressEnter={(e) => {
              e.preventDefault();
              addCondition(newCondition);
              setNewCondition("");
            }}
            suffix={
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                disabled={!newCondition.trim()}
                onClick={() => {
                  addCondition(newCondition);
                  setNewCondition("");
                }}
              />
            }
          />

          {conditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {conditions.map((c) => (
                <Tag
                  key={c}
                  color="magenta"
                  closeIcon={<CloseOutlined />}
                  onClose={() => removeCondition(c)}
                  className="m-0!"
                >
                  {c}
                </Tag>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-zinc-200 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-700">
              ตัวเลือกด่วน
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CONDITIONS.filter((c) => !conditions.includes(c)).map(
                (c) => (
                  <Button
                    key={c}
                    size="small"
                    type="dashed"
                    onClick={() => addCondition(c)}
                    icon={<PlusOutlined />}
                  >
                    {c}
                  </Button>
                )
              )}
              {conditions.length === 0 && QUICK_CONDITIONS.length > 0 && (
                <span className="self-center text-xs font-semibold text-zinc-600">
                  พิมพ์เองหรือเลือกจากด้านบน
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ─── ACTION BAR ─────────────────────────────────── */}
      <div className="sticky bottom-4 z-10 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <p
            className={`text-sm font-semibold ${
              isDirty
                ? "text-amber-700"
                : "text-emerald-700"
              }`}
          >
            {isDirty
              ? "🟡 มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก"
              : ""}
          </p>

          <div className="flex gap-2">
            <Link href={`/patient/${patient.id}`}>
              <Button>ยกเลิก</Button>
            </Link>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!selectedCode || !isDirty}
            >
              บันทึกและสร้าง visit
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
