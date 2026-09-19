import Link from "next/link";
import { Tag } from "antd";

const METHOD_COLORS: Record<string, string> = {
  GET: "blue",
  POST: "green",
  PATCH: "gold",
};

/** หน้าแรก — landing page */
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
      {/* hero */}
      <section className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-teal-500 to-emerald-600 text-3xl shadow-lg shadow-teal-500/20">
          🏥
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
          Hospital Carepath
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
          ระบบติดตาม{" "}
          <span className="text-teal-700 dark:text-teal-400">Care Pathway</span>
          <br />
          สำหรับผู้ป่วย
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-zinc-700 dark:text-zinc-300">
          ลงทะเบียน ติดตามสถานะ และกำหนดลำดับขั้นตอนการดูแลผู้ป่วย
          ตั้งแต่ลงทะเบียนจนกลับบ้าน ในที่เดียว
        </p>
      </section>

      {/* quick actions */}
      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        <Link
          href="/patient"
          className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-xl dark:bg-sky-950">
              📋
            </span>
            <span className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
              →
            </span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            ดูรายการผู้ป่วย
          </h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            ดูภาพรวม กรองตามสถานะ ค้นหาชื่อหรืออาการ
          </p>
          <Tag color="blue" className="mt-3!">
            GET /patients
          </Tag>
        </Link>

        <Link
          href="/patients/new"
          className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl dark:bg-emerald-950">
              ✚
            </span>
            <span className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
              →
            </span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            ลงทะเบียนผู้ป่วยใหม่
          </h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            กรอกข้อมูลเบื้องต้น ระบบจะออกรหัส P0001, P0002 ให้อัตโนมัติ
          </p>
          <Tag color="green" className="mt-3!">
            POST /patients
          </Tag>
        </Link>
      </section>

      {/* endpoints reference */}
      <section className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          API endpoints
        </h3>
        <ul className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {[
            ["GET", "/patients", "ดูรายการผู้ป่วยทั้งหมด"],
            ["POST", "/patients", "ลงทะเบียนผู้ป่วยใหม่"],
            ["GET", "/patients/{id}", "ดูข้อมูลผู้ป่วยตามรหัส"],
            ["PATCH", "/patients/{id}/status", "อัปเดตสถานะ"],
            ["PATCH", "/patients/{id}/pathway", "กำหนด Care Pathway"],
            ["GET", "/pathway-templates", "ดูแม่แบบ Care Pathway"],
          ].map(([method, path, desc]) => (
            <li
              key={`${method}-${path}`}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                <Tag
                  color={METHOD_COLORS[method] ?? "default"}
                  className="w-14! text-center font-mono"
                >
                  {method}
                </Tag>
                <code className="font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {path}
                </code>
              </div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {desc}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
