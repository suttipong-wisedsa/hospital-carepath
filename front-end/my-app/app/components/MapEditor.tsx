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
import { getHospitalMap, saveHospitalMap } from '@/app/lib/api';
import type {
  EditorMode,
  MapEdge,
  MapNode,
  NodeType,
} from '@/app/interface/map';

const { Header, Sider, Content } = Layout;
const initialNodes: MapNode[] = [
  {
    id: 'n1',
    name: 'หน้าห้องตรวจ 1',
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
    name: 'ประชาสัมพันธ์',
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
