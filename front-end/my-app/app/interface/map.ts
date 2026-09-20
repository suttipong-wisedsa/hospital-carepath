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
}
