/**
 * API base URL สำหรับเรียก Hospital Carepath backend
 *
 * - Dev: backend รันที่ http://localhost:8080 (Go)
 * - Production: เปลี่ยนเป็น URL จริงของเซิร์ฟเวอร์
 *
 * หากเปิด Next.js ที่ port อื่น (เช่น 3000) แล้วยิงไป 8080
 * ต้องเปิด CORS ที่ backend ด้วย (Go ปัจจุบันยังไม่มี CORS middleware)
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/** Type ของ request ตามที่ backend คาดหวัง */
export interface CreatePatientRequest {
  name: string;
  gender?: string;
  age?: number;
  phone?: string;
  symptom?: string;
}

/** Type ของ patient ที่ backend ส่งกลับมา */
export interface Patient {
  id: string; // เช่น "P0001"
  name: string;
  gender?: string;
  age?: number;
  phone?: string;
  symptom?: string;
  status: "admitted" | "treating" | "discharged";
  special_conditions?: string[];
  pathway_template_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

/** เรียก POST /patients — ลงทะเบียนผู้ป่วยใหม่ */
export async function createPatient(
  data: CreatePatientRequest
): Promise<Patient> {
  const res = await fetch(`${API_BASE_URL}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    // พยายาม parse error message จาก backend ({"error":"..."})
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ไม่ใช่ JSON ก็ไม่เป็นไร */
    }
    throw new Error(message);
  }

  return (await res.json()) as Patient;
}

/** Response ของ GET /patients */
export interface PatientListResponse {
  count: number;
  patients: Patient[];
}

/** เรียก GET /patients — ดูรายการผู้ป่วยทั้งหมด */
export async function getPatients(): Promise<PatientListResponse> {
  const res = await fetch(`${API_BASE_URL}/patients`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store", // ดึงใหม่ทุกครั้ง ไม่ cache
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ไม่ใช่ JSON */
    }
    throw new Error(message);
  }

  return (await res.json()) as PatientListResponse;
}

/** เรียก GET /patients/{code} — ดูผู้ป่วยตามรหัส */
export async function getPatient(code: string): Promise<Patient> {
  const res = await fetch(`${API_BASE_URL}/patients/${code}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ไม่ใช่ JSON */
    }
    throw new Error(message);
  }

  return (await res.json()) as Patient;
}
