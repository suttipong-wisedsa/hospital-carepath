import Link from "next/link";

/** หน้าแรก — landing page */
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
      {/* ─── hero ──────────────────────────────────── */}
      <section className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-teal-500 to-emerald-600 text-3xl shadow-lg shadow-teal-500/20">
          🏥
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-700">
          Hospital Carepath
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
          ระบบติดตาม&nbsp;
          <span className="text-teal-700">Care Pathway</span>
          <br />
        </h1>
      </section>

      {/* ─── quick actions (3 cards) ───────────────────── */}
      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* card 1: ผู้ป่วยทั้งหมด */}
        <Link
          href="/patient"
          className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-2xl">
              📋
            </span>
            <span className="text-2xl text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-sky-600">
              →
            </span>
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-950">
            รายชื่อผู้ป่วย
          </h2>
          <p className="mt-2 text-sm font-semibold text-zinc-700">
            ดูภาพรวม กรองตามสถานะ ค้นหาชื่อหรืออาการ
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">
              admitted
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              treating
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              discharged
            </span>
          </div>
        </Link>

        {/* card 2: คิวตรวจ (highlighted — primary) */}
        <Link
          href="/queue"
          className="group relative overflow-hidden rounded-2xl border-2 border-teal-300 bg-linear-to-br from-teal-50 via-emerald-50 to-cyan-50 p-6 shadow-md transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lg"
        >
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>
          <div className="flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500 text-2xl text-white shadow-md">
              📊
            </span>
            <span className="text-2xl text-teal-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700">
              →
            </span>
          </div>
          <h2 className="mt-4 text-lg font-black text-teal-950">คิวตรวจ</h2>
          <p className="mt-2 text-sm font-semibold text-teal-900">
            เรียกคิว บันทึกการตรวจ ดูตำแหน่งปัจจุบันของผู้ป่วย
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-teal-800">
            <span>📍 กรองตามจุดรักษา</span>
            <span className="text-teal-400">·</span>
            <span>🛣️ กรองตาม Pathway</span>
          </div>
        </Link>

        {/* card 3: ลงทะเบียนผู้ป่วยใหม่ */}
        <Link
          href="/patients/new"
          className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl">
              ✚
            </span>
            <span className="text-2xl text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600">
              →
            </span>
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-950">
            ลงทะเบียนผู้ป่วยใหม่
          </h2>
          <p className="mt-2 text-sm font-semibold text-zinc-700">
            กรอกข้อมูลเบื้องต้น ระบบจะออกรหัส P0001, P0002 ให้อัตโนมัติ
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700">
              ชื่อ-อาการ
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700">
              เพศ/อายุ
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700">
              เบอร์โทร
            </span>
          </div>
        </Link>
      </section>

      {/* ─── feature highlights ───────────────────────── */}
      <section className="mt-12 grid gap-3 sm:grid-cols-3">
        <FeatureChip
          icon="🛣️"
          label="Care Pathway"
          sub="กำหนดลำดับขั้นตอนตามแม่แบบ"
        />
        <FeatureChip
          icon="📍"
          label="ตำแหน่งปัจจุบัน"
          sub="รู้ทันทีว่าผู้ป่วยอยู่จุดไหน"
        />
        <FeatureChip
          icon="✅"
          label="บันทึกตรวจเสร็จ"
          sub="auto-advance ไปขั้นถัดไปอัตโนมัติ"
        />
      </section>

      {/* ─── patient self-service banner ───────────── */}
      <section className="mt-12">
        <Link
          href="/patient-view"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-2xl border-2 border-dashed border-teal-300 bg-linear-to-r from-teal-50/50 via-emerald-50/50 to-cyan-50/50 p-5 transition hover:border-teal-400 hover:from-teal-50 hover:via-emerald-50 hover:to-cyan-50 hover:shadow-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-2xl text-white shadow-md shadow-teal-500/30">
            🧑‍⚕️
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-teal-950">
              หน้าสำหรับผู้ป่วย
              <span className="ml-2 inline-flex items-center rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Kiosk
              </span>
            </p>
            <p className="mt-0.5 text-sm font-semibold text-teal-800">
              ผู้ป่วยสามารถดูสถานะคิวและลำดับขั้นตอนของตัวเองได้ — กรอกรหัส
              P0001 เพื่อทดลอง
            </p>
          </div>
          <span className="text-2xl text-teal-500 transition group-hover:translate-x-1">
            →
          </span>
        </Link>
      </section>
    </main>
  );
}

// ─── Feature Chip ──────────────────────────────────────────────────────────────

function FeatureChip({
  icon,
  label,
  sub,
}: {
  icon: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white/60 px-4 py-3 backdrop-blur-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-lg">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-zinc-950">{label}</p>
        <p className="mt-0.5 text-xs font-semibold text-zinc-600">{sub}</p>
      </div>
    </div>
  );
}
