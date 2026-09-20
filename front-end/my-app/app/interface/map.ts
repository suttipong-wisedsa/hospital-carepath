export type EditorMode = 'select' | 'add' | 'connect';

export type NodeType = 'room' | 'junction' | 'elevator' | 'stair' | 'ramp';

export interface MapNode {
  id: string;
  name: string;
  type: NodeType;
  floorId: string;
  xRatio: number;
  yRatio: number;
  accessible: boolean;
}

export interface MapEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'walkway' | 'elevator' | 'stair' | 'ramp';
  accessible: boolean;
  /** ระยะทางหน่วย "เมตร" ระหว่าง 2 node (optional — ถ้าไม่มี จะ fallback เป็น Euclidean distance จาก x/y) */
  distance?: number;
}
