"use client";

import { useState } from "react";
import { createPatient, type Patient } from "../../lib/api";

type FormState = "idle" | "submitting" | "success" | "error";

export default function NewPatientPage() {
  // ─── form fields ──────────────────────────────────────────
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "other" | "">("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [symptom, setSymptom] = useState("");

  // ─── ui state ─────────────────────────────────────────────
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [created, setCreated] = useState<Patient | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // validate
    if (!name.trim()) {
      setErrorMsg("กรุณากรอกชื่อ");
      setState("error");
      return;
    }

    setState("submitting");
    setErrorMsg("");
    setCreated(null);

    try {
      const patient = await createPatient({
        name: name.trim(),
        gender: gender || undefined,
        age: age ? Number(age) : undefined,
        phone: phone.trim() || undefined,
        symptom: symptom.trim() || undefined,
      });
      setCreated(patient);
      setState("success");
      // reset form
      setName("");
      setGender("");
      setAge("");
      setPhone("");
      setSymptom("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setState("error");
    }
  }

  const isSubmitting = state === "submitting";

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-8">
          <p className="text-xs font-medium tracking-widest uppercase text-teal-600 dark:text-teal-400">
            Hospital Carepath · Frontend
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            ลงทะเบียนผู้ป่วยใหม่
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            กรอกข้อมูลด้านล่างแล้วกดบันทึก — ระบบจะ POST ไปยัง
            <code className="mx-1 rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              POST /patients
            </code>
            ของ backend
          </p>
        </header>

        {/* ─── form ───────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* name */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย ใจดี"
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          {/* gender + age */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="gender"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                เพศ
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as "M" | "F" | "other" | "")
                }
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                <option value="">— ไม่ระบุ —</option>
                <option value="M">ชาย</option>
                <option value="F">หญิง</option>
                <option value="other">อื่นๆ</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="age"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                อายุ
              </label>
              <input
                id="age"
                type="number"
                min={0}
                max={150}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="เช่น 35"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
          </div>

          {/* phone */}
          <div className="mb-4">
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              เบอร์โทร
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เช่น 081-234-5678"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          {/* symptom */}
          <div className="mb-6">
            <label
              htmlFor="symptom"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              อาการเบื้องต้น
            </label>
            <textarea
              id="symptom"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              rows={3}
              placeholder="เช่น ปวดหัว มีไข้ 2 วัน"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          {/* submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? "กำลังบันทึก..." : "ลงทะเบียนผู้ป่วย"}
          </button>

          {/* error */}
          {state === "error" && errorMsg && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              <strong className="font-semibold">ผิดพลาด:</strong> {errorMsg}
            </div>
          )}

          {/* success */}
          {state === "success" && created && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <p className="font-semibold">✅ ลงทะเบียนสำเร็จ</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-emerald-700 dark:text-emerald-400">
                  รหัสผู้ป่วย
                </dt>
                <dd className="font-mono font-semibold">{created.id}</dd>
                <dt className="text-emerald-700 dark:text-emerald-400">ชื่อ</dt>
                <dd>{created.name}</dd>
                <dt className="text-emerald-700 dark:text-emerald-400">
                  สถานะ
                </dt>
                <dd>{created.status}</dd>
              </dl>
              <a
                href={`/patients/${created.id}/pathway`}
                className="mt-3 inline-block text-xs font-medium text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-300"
              >
                ไปเลือก Care Pathway Template →
              </a>
            </div>
          )}
        </form>

        {/* footer links */}
        <div className="mt-6 flex justify-between text-xs">
          <a
            href="/patient"
            className="text-teal-700 underline hover:text-teal-900 dark:text-teal-400"
          >
            ← ดูรายการผู้ป่วยทั้งหมด
          </a>
          <a href="/" className="text-zinc-500 underline hover:text-zinc-700">
            หน้าแรก
          </a>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          หากเจอ CORS error ตอนรัน ให้เปิด CORS middleware ที่ backend หรือ
          ใช้ Next.js proxy
        </p>
      </div>
    </main>
  );
}
