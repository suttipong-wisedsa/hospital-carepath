'use client';

import {
  ApartmentOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  PlusOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Input,
  Layout,
  message,
  Radio,
  Select,
  Space,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import FloorPlan from './FloorPlan';
import {
  generatePathwayFromMap,
  getHospitalMap,
  getPathwayTemplates,
  saveHospitalMap,
} from '@/app/lib/api';
import type { GeneratedStage, PathwayTemplate } from '@/app/lib/api';
import type {
  EditorMode,
  MapEdge,
  MapNode,
  NodeType,
} from '@/app/interface/map';
import { MOCK_DISTANCES, edgeDistance, routeDistance } from '@/app/lib/mapDistance';

const { Header, Sider, Content } = Layout;
const initialNodes: MapNode[] = [
  {
    id: 'n1',
    name: 'หน้าห้องตรวจ ',
    type: 'room',
    floorId: 'f1',
    xRatio: 0.17,
    yRatio: 0.29,
    accessible: true,
  },
  {
    id: 'n2',
    name: 'แยกด้านบน',
    type: 'junction',
    floorId: 'f1',
    xRatio: 0.45,
    yRatio: 0.29,
    accessible: true,
  },
  {
    id: 'n3',
    name: 'ลิฟต์ A',
    type: 'elevator',
    floorId: 'f1',
    xRatio: 0.8,
    yRatio: 0.29,
    accessible: true,
  },
  {
    id: 'n4',
    name: 'แยกกลาง',
    type: 'junction',
    floorId: 'f1',
    xRatio: 0.45,
    yRatio: 0.54,
    accessible: true,
  },
  {
    id: 'n5',
    name: 'เวชระเบียน',
    type: 'room',
    floorId: 'f1',
    xRatio: 0.26,
    yRatio: 0.54,
    accessible: true,
  },
  {
    id: 'n6',
    name: 'ห้องรอ',
    type: 'room',
    floorId: 'f1',
    xRatio: 0.7,
    yRatio: 0.54,
    accessible: true,
  },
  {
    id: 'n7',
    name: 'ทางเข้า',
    type: 'junction',
    floorId: 'f1',
    xRatio: 0.45,
    yRatio: 0.9,
    accessible: true,
  },
  {
    id: 'n8',
    name: 'ทางลาด',
    type: 'ramp',
    floorId: 'f1',
    xRatio: 0.8,
    yRatio: 0.82,
    accessible: true,
  },
];

const initialEdges: MapEdge[] = [
  ['n1', 'n2'],
  ['n2', 'n3'],
  ['n2', 'n4'],
  ['n4', 'n5'],
  ['n4', 'n6'],
  ['n4', 'n7'],
  ['n6', 'n8'],
].map(([fromNodeId, toNodeId], index) => ({
  id: `e${index + 1}`,
  fromNodeId,
  toNodeId,
  type: 'walkway',
  accessible: true,
  distance: MOCK_DISTANCES[`e${index + 1}`] ?? 10,
}));

const typeOptions = [
  { value: 'room', label: 'ห้อง/บริการ' },
  { value: 'junction', label: 'ทางแยก' },
  { value: 'elevator', label: 'ลิฟต์' },
  { value: 'stair', label: 'บันได' },
  { value: 'ramp', label: 'ทางลาด' },
];

export default function MapEditor() {
  const [mode, setMode] = useState<EditorMode>('select');
  const [nodes, setNodes] = useState<MapNode[]>(initialNodes);
  const [edges, setEdges] = useState<MapEdge[]>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>('n4');
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // ─── Pathway preview ─────────────────────────────────────
  const [templates, setTemplates] = useState<PathwayTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);

  // stages ที่ generate จาก hospital-map (BFS) — ใช้แทน hardcoded mock
  const [generatedStages, setGeneratedStages] = useState<GeneratedStage[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    getPathwayTemplates()
      .then((res) => {
        if (!active) return;
        const list = res.templates ?? [];
        setTemplates(list);
        if (list.length > 0 && list[0].id != null) {
          setActiveTemplateId(list[0].id);
        }
      })
      .catch(() => {
        // เงียบไว้ — ไม่บล็อก editor ถ้าโหลด template ไม่ได้
      });
    return () => {
      active = false;
    };
  }, []);

  // generate mockup stages จาก hospital-map (ทุกครั้งที่ map โหลดเสร็จ)
  const regenerateFromMap = async () => {
    setGenerating(true);
    try {
      const res = await generatePathwayFromMap({});
      setGeneratedStages(res.stages);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      messageApi.error(`Generate จากแผนที่ไม่สำเร็จ: ${detail}`);
    } finally {
      setGenerating(false);
    }
  };

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) ?? null,
    [templates, activeTemplateId],
  );

  // แปลง stages ของ template → [{name, node_id}] โดยใช้ generatedStages จาก hospital-map
  // ถ้า template มี node_id อยู่แล้ว → ใช้ค่านั้น / ถ้าไม่ → fallback ไป mockStageNode
  const stageMarkers = useMemo(() => {
    if (!activeTemplate) return [] as { name: string; nodeId: string | null }[];
    return activeTemplate.stages.map((stageName, i) => {
      const fromGen = generatedStages[i];
      const nodeId = fromGen?.node_id ?? mockStageNode(i);
      return { name: stageName, nodeId };
    });
  }, [activeTemplate, generatedStages]);

  /** คำนวณ route ระหว่าง markers (BFS) + ระยะทางรวม */
  const routeInfo = useMemo(() => {
    if (stageMarkers.length < 2) return null;
    const nodeIds = stageMarkers
      .map((m) => m.nodeId)
      .filter((n): n is string => n != null);
    if (nodeIds.length < 2) return null;
    const path = shortestPathThrough(nodeIds, edges);
    const dist = routeDistance(path, nodes, edges);
    return { path, distance: dist };
  }, [stageMarkers, edges, nodes]);

  useEffect(() => {
    let active = true;
    getHospitalMap()
      .then((hospitalMap) => {
        if (!active || !hospitalMap) return;
        setNodes(hospitalMap.nodes);
        setEdges(hospitalMap.edges);
        setSelectedId(hospitalMap.nodes[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        const detail = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
        messageApi.error(`โหลดผังไม่สำเร็จ: ${detail}`);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [messageApi]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const updateSelected = (patch: Partial<MapNode>) => {
    if (!selectedId) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedId ? { ...node, ...patch } : node,
      ),
    );
  };

  const changeMode = (nextMode: EditorMode) => {
    setMode(nextMode);
    setConnectFromId(null);
  };

  const addNode = (xRatio: number, yRatio: number) => {
    if (mode !== 'add') return;
    const newNode: MapNode = {
      id: crypto.randomUUID(),
      name: 'จุดใหม่',
      type: 'junction',
      floorId: 'f1',
      xRatio,
      yRatio,
      accessible: true,
    };
    setNodes((current) => [...current, newNode]);
    setSelectedId(newNode.id);
    setMode('select');
  };

  const handleNodeClick = (id: string) => {
    setSelectedId(id);
    if (mode !== 'connect') return;
    if (!connectFromId) {
      setConnectFromId(id);
      return;
    }
    if (connectFromId === id) return;
    const duplicate = edges.some(
      (edge) =>
        (edge.fromNodeId === connectFromId && edge.toNodeId === id) ||
        (edge.fromNodeId === id && edge.toNodeId === connectFromId),
    );
    if (!duplicate) {
      setEdges((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          fromNodeId: connectFromId,
          toNodeId: id,
          type: 'walkway',
          accessible: true,
        },
      ]);
    }
    setConnectFromId(null);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) =>
      current.filter(
        (edge) =>
          edge.fromNodeId !== selectedId && edge.toNodeId !== selectedId,
      ),
    );
    setSelectedId(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveHospitalMap(nodes, edges);
      messageApi.success('บันทึกผังเรียบร้อยแล้ว');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      messageApi.error(`บันทึกผังไม่สำเร็จ: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated) return null;

  return (
    <Layout className='app-shell'>
      {contextHolder}
      <Header className='topbar'>
        <div className='brand'>
          <span className='brand-mark'>✚</span> CarePath
        </div>
        <span className='subtitle'>จัดการผังโรงพยาบาล</span>
        <span className='user'>A&nbsp;&nbsp; ผู้ดูแลระบบ</span>
      </Header>

      <Layout>
        <Sider width={250} theme='light' className='sidebar'>
          <div className='flex justify-between items-center mb-2'>
            <label>อาคาร</label>
            <Button
              size='small'
              type='primary'
              shape='circle'
              icon={<PlusOutlined />}
            />
          </div>
          <Select
            value='a'
            options={[{ value: 'a', label: 'อาคาร A' }]}
            prefix={<ApartmentOutlined />}
          />

          <div className='flex justify-between items-center mb-2'>
            <label>ชั้น</label>
            <Button
              size='small'
              type='primary'
              shape='circle'
              icon={<PlusOutlined />}
            />
          </div>
          <Select
            value='f1'
            options={[
              { value: 'f1', label: 'ชั้น 1' },
              { value: 'f2', label: 'ชั้น 2' },
            ]}
          />

          {/* ─── Pathway preview selector ─────────────────── */}
          {/* <div className='flex justify-between items-center mb-2' style={{ marginTop: 18 }}>
            <label>แสดงเส้นทาง Pathway</label>
          </div> */}
          {/* <Select
            value={activeTemplateId ?? undefined}
            placeholder="— เลือก template —"
            style={{ width: '100%' }}
            onChange={(v) => setActiveTemplateId(v)}
            options={templates.map((t) => ({
              value: t.id,
              label: `${t.code} (${t.stages.length} stages)`,
            }))}
          /> */}
          {/* {activeTemplate && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, color: '#be123c', marginBottom: 4 }}>
                🧭 {activeTemplate.name}
              </div>
              <div style={{ color: '#475569' }}>
                {activeTemplate.stages.length} ขั้นตอน
                {routeInfo && (
                  <>
                    {' • '}
                    <strong style={{ color: '#be123c' }}>
                      รวม {routeInfo.distance}m
                    </strong>
                  </>
                )}
              </div>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {stageMarkers.map((m, i) => (
                  <span
                    key={`${m.name}-${i}`}
                    style={{
                      background: m.nodeId ? '#f43f5e' : '#cbd5e1',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                    title={m.nodeId ? `node: ${m.nodeId}` : 'ไม่ได้ผูกกับ node'}
                  >
                    {i + 1}.{m.name.slice(0, 6)}
                    {m.nodeId ? `@${m.nodeId}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )} */}
          <nav>
            <div>
              <HomeOutlined /> ภาพรวม
            </div>
            <div className='active'>
              <EnvironmentOutlined /> จัดการผัง
            </div>
            <div>
              <ShareAltOutlined /> ทดสอบเส้นทาง
            </div>
          </nav>
          <div className='legend'>
            <h4>สัญลักษณ์บนแผนผัง</h4>
            {typeOptions.map((item) => (
              <div key={item.value}>
                <i className={`dot ${item.value}`} />
                {item.label}
              </div>
            ))}
          </div>
        </Sider>

        <Content className='workspace'>
          <main className='editor-card'>
            <div className='toolbar'>
              <Radio.Group
                value={mode}
                onChange={(event) => changeMode(event.target.value)}
                buttonStyle='solid'
              >
                <Radio.Button value='select'>เลือก</Radio.Button>
                <Radio.Button value='add'>＋ เพิ่มจุด</Radio.Button>
                <Radio.Button value='connect'>⌁ เชื่อมเส้น</Radio.Button>
              </Radio.Group>
              <Space>
                <Button
                  onClick={() => {
                    setNodes(initialNodes);
                    setEdges(initialEdges);
                  }}
                >
                  คืนค่าเริ่มต้น
                </Button>
                <Button
                  type='primary'
                  icon={<SaveOutlined />}
                  onClick={save}
                  loading={saving}
                >
                  บันทึก
                </Button>
              </Space>
            </div>
            <div className='canvas-wrap'>
              <FloorPlan
                nodes={nodes}
                edges={edges}
                selectedId={selectedId}
                mode={mode}
                connectFromId={connectFromId}
                onCanvasClick={addNode}
                onNodeClick={handleNodeClick}
                stageMarkers={stageMarkers}
                routePath={routeInfo?.path ?? []}
                onMoveNode={(id, xRatio, yRatio) =>
                  setNodes((current) =>
                    current.map((node) =>
                      node.id === id ? { ...node, xRatio, yRatio } : node,
                    ),
                  )
                }
              />
              <div className='canvas-hint'>
                {mode === 'add' && 'คลิกบนแผนผังเพื่อเพิ่มจุด'}
                {mode === 'connect' &&
                  (connectFromId ? 'เลือกจุดปลายทาง' : 'เลือกจุดเริ่มต้น')}
                {mode === 'select' && 'เลือกหรือลากจุดเพื่อแก้ไขตำแหน่ง'}
              </div>
              <div className='canvas-status'>
                {nodes.length} จุด&nbsp; • &nbsp;{edges.length} เส้นทาง
              </div>
            </div>
          </main>

          <aside className='properties'>
            <h2>ข้อมูลจุด</h2>
            {selectedNode ? (
              <>
                <label>ชื่อจุด</label>
                <Input
                  value={selectedNode.name}
                  onChange={(event) =>
                    updateSelected({ name: event.target.value })
                  }
                />
                <label>ประเภท</label>
                <Select
                  value={selectedNode.type}
                  options={typeOptions}
                  onChange={(value: NodeType) =>
                    updateSelected({ type: value })
                  }
                />
                <label>ชั้น</label>
                <Select
                  value={selectedNode.floorId}
                  options={[{ value: 'f1', label: 'ชั้น 1' }]}
                />
                <Checkbox
                  checked={selectedNode.accessible}
                  onChange={(event) =>
                    updateSelected({ accessible: event.target.checked })
                  }
                >
                  รองรับรถเข็น
                </Checkbox>
                <label>พิกัดบนแผนผัง (อัตราส่วน)</label>
                <div className='coordinate'>
                  <Input value={selectedNode.xRatio.toFixed(3)} readOnly />
                  <Input value={selectedNode.yRatio.toFixed(3)} readOnly />
                </div>
                <Button
                  danger
                  type='text'
                  icon={<DeleteOutlined />}
                  onClick={deleteSelected}
                >
                  ลบจุด
                </Button>
              </>
            ) : (
              <p className='empty'>เลือกจุดบนแผนผังเพื่อดูรายละเอียด</p>
            )}
          </aside>
        </Content>
      </Layout>
    </Layout>
  );
}

// ─── Mockup helpers (ใช้กรณี stages จาก API ยังเป็น string[]) ───────────

/**
 * mock: แมป stage ตัวที่ i ไปยัง node id (สำหรับ demo)
 * ใช้สำหรับ general_checkup ที่ backend ส่ง stages = ["registration", "vitals_check", ...]
 * (production: ดึง node_id จาก decoded stages จริงๆ)
 */
function mockStageNode(i: number): string | null {
  const MOCK_NODES = ['n7', 'n5', 'n6', 'n1', 'n3', 'n7', 'n7', 'n1', 'n5', 'n1', 'n1', 'n5', 'n1', 'n7'];
  return MOCK_NODES[i] ?? null;
}

/** BFS shortest path ระหว่าง waypoints ตามลำดับ (จุดแวะ) — undirected graph */
function shortestPathThrough(
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
    // BFS
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
      // ไม่มีเส้นทาง — skip
      fullPath.push(to);
      continue;
    }

    // ย้อนกลับ
    const segment: string[] = [to];
    for (let cur = to; cur !== from;) {
      const p = parent.get(cur);
      if (!p) break;
      segment.unshift(p);
      cur = p;
    }
    // ต่อท้าย (ไม่รวม from เพราะมีใน fullPath แล้ว)
    fullPath.push(...segment.slice(1));
  }

  return fullPath;
}
