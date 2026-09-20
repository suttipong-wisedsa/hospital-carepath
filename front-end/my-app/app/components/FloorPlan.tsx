'use client';

import type { MapEdge, MapNode, NodeType } from '@/app/interface/map';
import { useRef } from 'react';
import { edgeDistance } from '@/app/lib/mapDistance';

const NODE_COLORS: Record<NodeType, string> = {
  room: '#22c55e',
  junction: '#1677ff',
  elevator: '#8b5cf6',
  stair: '#f59e0b',
  ramp: '#14b8a6',
};

export interface StageMarker {
  /** ชื่อ stage (เช่น "registration", "vitals_check") */
  name: string;
  /** ห้อง/จุดปลายทางบนแผนที่ (null = ไม่ผูกกับ node) */
  nodeId: string | null;
}

interface Props {
  nodes: MapNode[];
  edges: MapEdge[];
  selectedId: string | null;
  mode: 'select' | 'add' | 'connect';
  connectFromId: string | null;
  onCanvasClick: (xRatio: number, yRatio: number) => void;
  onNodeClick: (id: string) => void;
  onMoveNode: (id: string, xRatio: number, yRatio: number) => void;
  /** Stages ของ pathway template ที่เลือก (optional — ถ้ามีจะวาด marker + route) */
  stageMarkers?: StageMarker[];
  /** เส้นทางที่คำนวณได้ (array of node ids รวมทุก waypoint) */
  routePath?: string[];
}

export default function FloorPlan({
  nodes,
  edges,
  selectedId,
  mode,
  connectFromId,
  onCanvasClick,
  onNodeClick,
  onMoveNode,
  stageMarkers = [],
  routePath = [],
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const toRatio = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

  // สร้าง stage index map เพื่อรู้ว่าแต่ละ node มี stage อะไรบ้าง
  const stagesByNode = new Map<string, { name: string; order: number }[]>();
  stageMarkers.forEach((m, i) => {
    if (!m.nodeId) return;
    if (!stagesByNode.has(m.nodeId)) stagesByNode.set(m.nodeId, []);
    stagesByNode.get(m.nodeId)!.push({ name: m.name, order: i + 1 });
  });

  const routeNodeSet = new Set(routePath);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 700"
      className={`floor-plan mode-${mode}`}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const point = toRatio(event.clientX, event.clientY);
        onCanvasClick(point.x, point.y);
      }}
    >
      <rect width="1000" height="700" fill="#f8fafc" />

      <g className="plan-lines">
        <rect x="40" y="35" width="920" height="610" rx="4" />
        <path d="M40 240H960 M40 430H960 M245 35V240 M470 35V240 M735 35V240 M285 430V645 M700 430V645" />
        <path d="M110 240V430 M320 240V430 M680 240V430 M880 240V430" />
      </g>

      <g className="room-labels">
        <text x="135" y="130">ห้องตรวจ 1</text>
        <text x="355" y="130">ห้องตรวจ 2</text>
        <text x="585" y="130">ห้องยา</text>
        <text x="790" y="130">ลิฟต์ A</text>
        <text x="885" y="130">บันได A</text>
        <text x="175" y="335">ประชาสัมพันธ์</text>
        <text x="480" y="335">ทางเดินกลาง</text>
        <text x="775" y="335">ห้องรอ</text>
        <text x="145" y="545">ห้องน้ำ</text>
        <text x="465" y="545">ห้องฉุกเฉิน</text>
        <text x="780" y="545">ทางลาด</text>
        <text x="450" y="678">ทางเข้า–ออก</text>
      </g>

      <g className="edges">
        {edges.map((edge) => {
          const from = nodes.find((node) => node.id === edge.fromNodeId);
          const to = nodes.find((node) => node.id === edge.toNodeId);
          if (!from || !to) return null;
          const x1 = from.xRatio * 1000;
          const y1 = from.yRatio * 700;
          const x2 = to.xRatio * 1000;
          const y2 = to.yRatio * 700;
          const dist = edgeDistance(edge, nodes);
          // midpoint + label offset perpendicular to line
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const offset = 12;
          const labelX = midX - (dy / len) * offset;
          const labelY = midY + (dx / len) * offset;
          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#94a3b8"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              {/* distance label */}
              <g transform={`translate(${labelX} ${labelY})`}>
                <rect
                  x={-18}
                  y={-9}
                  width={36}
                  height={16}
                  rx={8}
                  fill="white"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#475569"
                >
                  {dist}m
                </text>
              </g>
            </g>
          );
        })}
      </g>

      {/* ─── Route path ของ pathway template ที่เลือก ──────────────── */}
      {routePath.length >= 2 && (
        <g className="route-path">
          {(() => {
            const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
            for (let i = 0; i < routePath.length - 1; i++) {
              const a = nodes.find((n) => n.id === routePath[i]);
              const b = nodes.find((n) => n.id === routePath[i + 1]);
              if (!a || !b) continue;
              segments.push({
                x1: a.xRatio * 1000,
                y1: a.yRatio * 700,
                x2: b.xRatio * 1000,
                y2: b.yRatio * 700,
              });
            }
            return segments.map((s, i) => (
              <line
                key={`route-${i}`}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="#f43f5e"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="8 4"
                opacity={0.85}
              />
            ));
          })()}
        </g>
      )}

      <g className="nodes">
        {nodes.map((node) => {
          const selected = selectedId === node.id;
          const connecting = connectFromId === node.id;
          const onRoute = routeNodeSet.has(node.id);
          const stagesHere = stagesByNode.get(node.id) ?? [];
          return (
            <g
              key={node.id}
              transform={`translate(${node.xRatio * 1000} ${node.yRatio * 700})`}
              className="map-node"
              onClick={(event) => {
                event.stopPropagation();
                onNodeClick(node.id);
              }}
              onPointerDown={(event) => {
                if (mode !== 'select') return;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (mode !== 'select' || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
                const point = toRatio(event.clientX, event.clientY);
                onMoveNode(node.id, point.x, point.y);
              }}
            >
              {(selected || connecting) && (
                <circle r="20" fill="none" stroke="#1677ff" strokeWidth="5" opacity="0.35" />
              )}
              {onRoute && (
                <circle r="22" fill="none" stroke="#f43f5e" strokeWidth="3" opacity="0.6" />
              )}
              <circle r="11" fill={NODE_COLORS[node.type]} stroke="white" strokeWidth="3" />
              {/* stage badges (ลำดับ + ชื่อย่อ) */}
              {stagesHere.length > 0 && (
                <g transform="translate(15 -22)">
                  {stagesHere.map((s, idx) => (
                    <g key={`${s.name}-${idx}`} transform={`translate(0 ${idx * 18})`}>
                      <circle r={9} fill="#f43f5e" stroke="white" strokeWidth={2} />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={800}
                        fill="white"
                      >
                        {s.order}
                      </text>
                      <title>{`${s.order}. ${s.name}`}</title>
                    </g>
                  ))}
                </g>
              )}
              <title>
                {node.name}
                {node.id}
                {stagesHere.length > 0
                  ? ` — Stages: ${stagesHere.map((s) => `${s.order}.${s.name}`).join(', ')}`
                  : ''}
              </title>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
