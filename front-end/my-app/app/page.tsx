import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <main className="w-full max-w-md text-center">
        <p className="text-xs font-medium tracking-widest uppercase text-teal-600 dark:text-teal-400">
          Hospital Carepath
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Frontend Demo
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          ตัวอย่างการเรียก API ของระบบ Hospital Carepath
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/patient"
            className="rounded-lg border border-teal-600 bg-white px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-zinc-800"
          >
            📋 ดูรายการผู้ป่วย (GET /patients)
          </Link>
          <Link
            href="/patients/new"
            className="rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            📝 ฟอร์มลงทะเบียนผู้ป่วย (POST /patients)
          </Link>
        </div>

        <p className="mt-8 text-xs text-zinc-500">
          Backend ต้องรันอยู่ที่ <code className="font-mono">localhost:8080</code>
        </p>
      </main>
    </div>
  );
}
