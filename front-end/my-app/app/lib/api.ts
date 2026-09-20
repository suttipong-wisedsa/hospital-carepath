/**
 * API base URL สำหรับเรียก Hospital Carepath backend
 *
 * - Dev: ใช้ path relative "/api" เพื่อให้ Next.js rewrites proxy ไป backend
 *   (ดู next.config.ts) — วิธีนี้หลีกเลี่ยงปัญหา CORS เพราะ browser มองเป็น same-origin
 * - Production: ตั้ง NEXT_PUBLIC_API_BASE_URL เป็น URL จริงของ backend (เช่น https://api.example.com)
 */
import type { MapEdge, MapNode } from "@/app/interface/map";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

interface HospitalMapApiResponse {
  nodes: Array<{
    id: string;
    name: string;
    type: MapNode["type"];
    floor_id: string;
    x_ratio: number;
    y_ratio: number;
    accessible: boolean;
  }>;
  edges: Array<{
    id: string;
    from_node_id: string;
    to_node_id: string;
    type: MapEdge["type"];
    accessible: boolean;
  }>;
  updated_at: string;
}

export interface HospitalMap {
  nodes: MapNode[];
  edges: MapEdge[];
  updatedAt: string;
}

async function getApiError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `HTTP ${res.status}`;
  try {
    const body = JSON.parse(text) as { error?: string };
    return body.error ?? text;
  } catch {
    return text;
  }
}

function mapHospitalMapResponse(data: HospitalMapApiResponse): HospitalMap {
  return {
    nodes: data.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      floorId: node.floor_id,
      xRatio: node.x_ratio,
      yRatio: node.y_ratio,
      accessible: node.accessible,
    })),
    edges: data.edges.map((edge) => ({
      id: edge.id,
      fromNodeId: edge.from_node_id,
      toNodeId: edge.to_node_id,
      type: edge.type,
      accessible: edge.accessible,
    })),
    updatedAt: data.updated_at,
  };
}

/** โหลดผังโรงพยาบาล — คืน null เมื่อยังไม่เคยบันทึก */
export async function getHospitalMap(): Promise<HospitalMap | null> {
  const res = await fetch(`${API_BASE_URL}/hospital-map`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await getApiError(res));
  return mapHospitalMapResponse((await res.json()) as HospitalMapApiResponse);
}

/** บันทึกผังโรงพยาบาลทั้งชุด */
export async function saveHospitalMap(
  nodes: MapNode[],
  edges: MapEdge[]
): Promise<HospitalMap> {
  const res = await fetch(`${API_BASE_URL}/hospital-map`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      nodes: nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        floor_id: node.floorId,
        x_ratio: node.xRatio,
        y_ratio: node.yRatio,
        accessible: node.accessible,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        from_node_id: edge.fromNodeId,
        to_node_id: edge.toNodeId,
        type: edge.type,
        accessible: edge.accessible,
      })),
    }),
  });
  if (!res.ok) throw new Error(await getApiError(res));
  return mapHospitalMapResponse((await res.json()) as HospitalMapApiResponse);
}

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

/** Step ภายใน pathway visit — มี status และ timestamp */
export interface PathwayStepView {
  step_order: number;
  stage: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  map_node_id?: string | null;
  /** ระยะทางจาก step ก่อนหน้า หน่วย "เมตร" (คำนวณจาก hospital-map edge weights) */
  distance_from_prev?: number | null;
  /** JSON string ของ node IDs ที่เดินผ่าน เช่น '["n7","n4","n5"]' */
  route_from_prev?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  performed_by?: string | null;
  notes?: string | null;
}

/** Visit + steps ที่ผูกกับ patient pathway */
export interface PathwayVisitView {
  id: number;
  status: "active" | "completed" | "cancelled";
  started_at: string;
  completed_at?: string | null;
  total_steps: number;
  completed_steps: number;
  current_step?: PathwayStepView;
  steps: PathwayStepView[];
}

/** Route summary ทั้ง visit — คำนวณจาก hospital-map ปัจจุบัน (BFS + edge weights)
 *  มาจาก /hospital-map ตรงๆ — ถ้าแก้ผัง ตัวเลขจะอัปเดตทันที
 */
export interface RouteSummary {
  /** ระยะทางรวม หน่วย "เมตร" */
  total_distance: number;
  /** จำนวน edges ที่เดินผ่าน */
  hops: number;
  /** node IDs ทั้งหมดที่เดินผ่าน (รวม waypoints + intermediate) */
  path: string[];
  /** node IDs ของจุดแวะ (= step.map_node_id) */
  waypoints: string[];
  /** เวลาที่คำนวณ */
  computed_at: string;
  /** updated_at ของ hospital_map ที่ใช้คำนวณ */
  hospital_map_updated_at: string;
  /** แหล่งที่มาของข้อมูล — ปัจจุบันเป็น "hospital_map" เสมอ */
  source: string;
}

/** Response ของ GET /patients/{id}/pathway */
export interface PatientPathwayResponse {
  patient_id: string;
  patient_name: string;
  pathway_template: PathwayTemplate | null;
  special_conditions: string[];
  /** Visit ปัจจุบันของผู้ป่วย (active visit หรือล่าสุด) — มี step status เพื่อรู้ว่าอยู่จุดไหน */
  visit?: PathwayVisitView;
  /** Route summary ทั้ง visit (BFS shortest path จาก hospital-map ปัจจุบัน) */
  route_summary?: RouteSummary | null;
}

/** เรียก GET /patients/{id}/pathway — ดู Care Pathway ปัจจุบัน + ตำแหน่งปัจจุบัน */
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

/** stage เดียวจาก generator — มีทั้ง name + node_id อ้างอิงจริง */
export interface GeneratedStage {
  name: string;
  node_id: string;
}

/** Response ของ POST /pathway-templates/from-map */
export interface FromMapResponse {
  code: string;
  name: string;
  stages: GeneratedStage[];
  saved: boolean;
  template?: PathwayTemplate;
}

/** Request body สำหรับ POST /pathway-templates/from-map */
export interface FromMapRequest {
  code?: string;
  name?: string;
  save?: boolean;
}

/** เรียก POST /pathway-templates/from-map — generate mockup stages จาก hospital-map
 *  ถ้า save=true จะ upsert เป็น template ใหม่ใน DB
 */
export async function generatePathwayFromMap(
  body: FromMapRequest = {}
): Promise<FromMapResponse> {
  const res = await fetch(`${API_BASE_URL}/pathway-templates/from-map`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as FromMapResponse;
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

// ─────────────────────────────────────────────────────────────────────────────
// Queue API — เรียกคิว + บันทึกตรวจเสร็จ
// ─────────────────────────────────────────────────────────────────────────────

/** Status ของ VisitStep ตามที่ backend ส่งกลับ */
export type StepStatus = "pending" | "in_progress" | "completed" | "skipped";

/** Step ของ visit (มีข้อมูลครบทุก field) */
export interface VisitStep {
  id: number;
  visit_id: number;
  step_order: number;
  stage: string;
  status: StepStatus;
  /** ห้องปลายทางจาก FloorPlan (ไม่มี = stage นั้นไม่ผูกกับแผนที่) */
  map_node_id?: string | null;
  /** ระยะทางจาก step ก่อนหน้า (จำนวน edges ใน FloorPlan) */
  distance_from_prev?: number | null;
  /** เส้นทางที่เดินผ่านจาก step ก่อนหน้า (array of node ids) */
  route_from_prev?: string[] | null;
  started_at?: string | null;
  completed_at?: string | null;
  performed_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** มุมมองย่อยของ step ใน QueueEntry.current_step */
export interface QueueStepView {
  step_order: number;
  stage: string;
  status: StepStatus;
  map_node_id?: string | null;
  distance_from_prev?: number | null;
  route_from_prev?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

/** Visit ในคิว — join patient + pathway + steps */
export interface QueueEntry {
  visit_id: number;
  patient_code: string;
  patient_name: string;
  pathway_template_code?: string;
  pathway_template_name?: string;
  special_conditions?: string[];
  visit_status: "active" | "completed" | "cancelled";
  started_at: string;
  completed_at?: string | null;
  total_steps: number;
  completed_steps: number;
  current_step?: QueueStepView;
  steps?: VisitStep[];
}

/** เรียก GET /queue — ดูคิวปัจจุบัน (เฉพาะ active) */
export async function getQueue(): Promise<{ count: number; queue: QueueEntry[] }> {
  const res = await fetch(`${API_BASE_URL}/queue`, {
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
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as { count: number; queue: QueueEntry[] };
}

/** เรียก GET /queue/{visitId} — ดู queue entry ตาม visit id */
export async function getQueueEntry(visitId: number): Promise<QueueEntry> {
  const res = await fetch(`${API_BASE_URL}/queue/${visitId}`, {
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
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as QueueEntry;
}

/** Response ของ POST /queue/{visitId}/call */
export interface CallQueueResponse {
  entry: QueueEntry;
  called_step: QueueStepView;
}

/** เรียก POST /queue/{visitId}/call — เรียกคิวผู้ป่วย (first pending step → in_progress) */
export async function callQueue(visitId: number): Promise<CallQueueResponse> {
  const res = await fetch(`${API_BASE_URL}/queue/${visitId}/call`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as CallQueueResponse;
}

/** Body สำหรับ complete / skip step (optional ทั้งคู่) */
export interface StepActionRequest {
  performed_by?: string;
  notes?: string;
}

/** Response ของ POST /queue/{visitId}/steps/{stepOrder}/complete */
export interface CompleteStepResponse {
  entry: QueueEntry;
  completed_step: QueueStepView;
  next_step: QueueStepView | null; // null ถ้า visit เสร็จแล้ว
}

/** เรียก POST /queue/{visitId}/steps/{stepOrder}/complete — บันทึกตรวจเสร็จ + auto-advance */
export async function completeQueueStep(
  visitId: number,
  stepOrder: number,
  body?: StepActionRequest
): Promise<CompleteStepResponse> {
  const res = await fetch(
    `${API_BASE_URL}/queue/${visitId}/steps/${stepOrder}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as CompleteStepResponse;
}

/** Response ของ POST /queue/{visitId}/steps/{stepOrder}/skip */
export interface SkipStepResponse {
  entry: QueueEntry;
  skipped_step: QueueStepView;
}

/** เรียก POST /queue/{visitId}/steps/{stepOrder}/skip — ข้ามขั้นตอน */
export async function skipQueueStep(
  visitId: number,
  stepOrder: number,
  body?: StepActionRequest
): Promise<SkipStepResponse> {
  const res = await fetch(
    `${API_BASE_URL}/queue/${visitId}/steps/${stepOrder}/skip`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as SkipStepResponse;
}

/** เรียก POST /queue/{visitId}/complete — ปิด visit (mark all remaining = completed) */
export async function completeVisit(visitId: number): Promise<QueueEntry> {
  const res = await fetch(`${API_BASE_URL}/queue/${visitId}/complete`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as QueueEntry;
}

/** เรียก POST /queue/{visitId}/cancel — ยกเลิก visit */
export async function cancelVisit(visitId: number): Promise<QueueEntry> {
  const res = await fetch(`${API_BASE_URL}/queue/${visitId}/cancel`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) message = errBody.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as QueueEntry;
}
