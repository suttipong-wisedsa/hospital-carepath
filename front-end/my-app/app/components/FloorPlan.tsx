'use client';

import type { MapEdge, MapNode, NodeType } from '@/app/interface/map';
import { useRef } from 'react';

const NODE_COLORS: Record<NodeType, string> = {
  room: '#22c55e',
  junction: '#1677ff',
  elevator: '#8b5cf6',
  stair: '#f59e0b',
  ramp: '#14b8a6',
};

interface Props {
  nodes: MapNode[];
  edges: MapEdge[];
  selectedId: string | null;
  mode: 'select' | 'add' | 'connect';
  connectFromId: string | null;
  onCanvasClick: (xRatio: number, yRatio: number) => void;
  onNodeClick: (id: string) => void;
  onMoveNode: (id: string, xRatio: number, yRatio: number) => void;
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
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const toRatio = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  };

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
          return (
            <line
              key={edge.id}
              x1={from.xRatio * 1000}
              y1={from.yRatio * 700}
              x2={to.xRatio * 1000}
              y2={to.yRatio * 700}
            />
          );
        })}
      </g>

      <g className="nodes">
        {nodes.map((node) => {
          const selected = selectedId === node.id;
          const connecting = connectFromId === node.id;
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
              {(selected || connecting) && <circle r="20" fill="none" stroke="#1677ff" strokeWidth="5" opacity="0.35" />}
              <circle r="11" fill={NODE_COLORS[node.type]} stroke="white" strokeWidth="3" />
              <title>{node.name}</title>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
