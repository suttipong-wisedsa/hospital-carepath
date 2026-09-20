import type { MapEdge, MapNode } from '@/app/interface/map';

export interface HospitalMap {
  nodes: MapNode[];
  edges: MapEdge[];
}

/**
 * Map viewBox = 1000 × 700 SVG units
 * 1 SVG unit = 0.1 เมตร (mockup — โรงพยาบาลจริงใช้ 100px = 10m)
 * → 1000 units = 100m กว้าง, 700 units = 70m ยาว
 */
export const PIXELS_PER_METER = 10;

/** คำนวณระยะ Euclidean (หน่วยเมตร) ระหว่าง 2 node จาก xRatio/yRatio */
export function euclideanDistance(a: MapNode, b: MapNode): number {
  const dx = (a.xRatio - b.xRatio) * 1000; // SVG units
  const dy = (a.yRatio - b.yRatio) * 700;
  return Math.sqrt(dx * dx + dy * dy) / PIXELS_PER_METER;
}

/** คำนวณ edge distance — ใช้ค่าที่กำหนดใน edge หรือ fallback เป็น Euclidean */
export function edgeDistance(edge: MapEdge, nodes: MapNode[]): number {
  if (edge.distance != null) return edge.distance;
  const from = nodes.find((n) => n.id === edge.fromNodeId);
  const to = nodes.find((n) => n.id === edge.toNodeId);
  if (!from || !to) return 0;
  return Math.round(euclideanDistance(from, to) * 10) / 10;
}

/** ระยะทางรวมของเส้นทางหลาย edges */
export function routeDistance(
  nodeIds: string[],
  nodes: MapNode[],
  edges: MapEdge[],
): number {
  if (nodeIds.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const a = nodeIds[i];
    const b = nodeIds[i + 1];
    const edge = edges.find(
      (e) =>
        (e.fromNodeId === a && e.toNodeId === b) ||
        (e.fromNodeId === b && e.toNodeId === a),
    );
    if (edge) {
      total += edgeDistance(edge, nodes);
    } else {
      const na = nodes.find((n) => n.id === a);
      const nb = nodes.find((n) => n.id === b);
      if (na && nb) total += euclideanDistance(na, nb);
    }
  }
  return Math.round(total * 10) / 10;
}

/**
 * Mockup ระยะทางจริง (เมตร) สำหรับ default hospital floor
 * ปรับให้สมจริง: ทางเดินกลางยาวกว่า ลิฟต์/ทางลาดระยะสั้น
 *
 * edges เริ่มต้น:
 *   e1: n1 → n2  (ห้องตรวจ → แยกบน)        10m
 *   e2: n2 → n3  (แยกบน → ลิฟต์)            15m
 *   e3: n2 → n4  (แยกบน → แยกกลาง)         12m
 *   e4: n4 → n5  (แยกกลาง → ประชาสัมพันธ์)   8m
 *   e5: n4 → n6  (แยกกลาง → ห้องรอ)        10m
 *   e6: n4 → n7  (แยกกลาง → ทางเข้า)        15m
 *   e7: n6 → n8  (ห้องรอ → ทางลาด)          12m
 */
export const MOCK_DISTANCES: Record<string, number> = {
  e1: 10,
  e2: 15,
  e3: 12,
  e4: 8,
  e5: 10,
  e6: 15,
  e7: 12,
};

/**
 * BFS shortest path ระหว่าง waypoints หลายจุด (เรียงตามลำดับ)
 * ใช้สำหรับคำนวณเส้นทางผ่านทุก stage ใน patient view
 * @returns path เต็ม (node IDs ทั้งหมดที่เดินผ่าน รวม waypoints)
 */
export function shortestPathThrough(
  waypoints: string[],
  edges: MapEdge[],
): string[] {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) return [waypoints[0]];

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.fromNodeId)) adj.set(e.fromNodeId, []);
    if (!adj.has(e.toNodeId)) adj.set(e.toNodeId, []);
    adj.get(e.fromNodeId)!.push(e.toNodeId);
    adj.get(e.toNodeId)!.push(e.fromNodeId);
  }

  const fullPath: string[] = [waypoints[0]];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const visited = new Set<string>([from]);
    const parent = new Map<string, string>();
    const queue: string[] = [from];
    let found = false;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur === to) {
        found = true;
        break;
      }
      for (const next of adj.get(cur) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, cur);
        queue.push(next);
      }
    }

    if (!found) {
      fullPath.push(to);
      continue;
    }

    const segment: string[] = [to];
    for (let cur = to; cur !== from; ) {
      const p = parent.get(cur);
      if (!p) break;
      segment.unshift(p);
      cur = p;
    }
    fullPath.push(...segment.slice(1));
  }

  return fullPath;
}
