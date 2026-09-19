/**
 * API base URL สำหรับเรียก Hospital Carepath backend
 *
 * - Dev: ใช้ path relative "/api" เพื่อให้ Next.js rewrites proxy ไป backend
 *   (ดู next.config.ts) — วิธีนี้หลีกเลี่ยงปัญหา CORS เพราะ browser มองเป็น same-origin
 * - Production: ตั้ง NEXT_PUBLIC_API_BASE_URL เป็น URL จริงของ backend (เช่น https://api.example.com)
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

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

/** เรียก PATCH /patients/{id}/status — อัปเดตสถานะผู้ป่วย */
export async function updatePatientStatus(
  code: string,
  status: Patient["status"]
): Promise<Patient> {
  const res = await fetch(`${API_BASE_URL}/patients/${code}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
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

/** Type ของ Care Pathway Template */
export interface PathwayTemplate {
  id: number;
  code: string;
  name: string;
  description?: string;
  stages: string[];
}

/** Response ของ GET /patients/{id}/pathway */
export interface PatientPathwayResponse {
  patient_id: string;
  patient_name: string;
  pathway_template: PathwayTemplate | null;
  special_conditions: string[];
}

/** เรียก GET /patients/{id}/pathway — ดู Care Pathway ปัจจุบัน */
export async function getPatientPathway(
  code: string
): Promise<PatientPathwayResponse> {
  const res = await fetch(`${API_BASE_URL}/patients/${code}/pathway`, {
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

  return (await res.json()) as PatientPathwayResponse;
}

/** Response ของ GET /pathway-templates */
export interface PathwayTemplateListResponse {
  templates: PathwayTemplate[];
}

/** เรียก GET /pathway-templates — รายการแม่แบบทั้งหมด */
export async function getPathwayTemplates(): Promise<PathwayTemplateListResponse> {
  const res = await fetch(`${API_BASE_URL}/pathway-templates`, {
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

  return (await res.json()) as PathwayTemplateListResponse;
}

/** Request body สำหรับ PATCH /patients/{id}/pathway */
export interface AssignPathwayRequest {
  template_code: string;
  special_conditions: string[];
}

/** Response ของ PATCH /patients/{id}/pathway */
export interface AssignPathwayResponse {
  id: string;
  name: string;
  pathway_template_id: number | null;
  template_code: string;
  special_conditions: string[];
  visit_id?: number | null;
  steps_created?: number;
}

/** เรียก PATCH /patients/{id}/pathway — กำหนดหรือเปลี่ยน Care Pathway */
export async function assignPatientPathway(
  code: string,
  body: AssignPathwayRequest
): Promise<AssignPathwayResponse> {
  const res = await fetch(`${API_BASE_URL}/patients/${code}/pathway`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

  return (await res.json()) as AssignPathwayResponse;
}
