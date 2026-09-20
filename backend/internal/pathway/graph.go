package pathway

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/suttipong/hospital-carepath/internal/model"
)

// ErrNoPath ระหว่าง node ที่ระบุไม่มีเส้นทางเชื่อม
var ErrNoPath = errors.New("no path between nodes")

// ErrNodeNotFound หา node ที่ระบุไม่เจอ
var ErrNodeNotFound = errors.New("node not found in hospital map")

// ShortestPathResult ผลลัพธ์จากการคำนวณเส้นทาง
// - Path: node IDs ที่เดินผ่าน (รวม from + to)
// - Distance: ระยะทางรวมหน่วย "เมตร" (sum ของ edge weights)
//   ถ้า edge ไม่มี weight จะนับเป็น 1 ต่อ hop เป็น fallback
// - Hops: จำนวน edges (สำหรับ debug)
type ShortestPathResult struct {
	Path     []string `json:"path"`
	Distance int      `json:"distance"` // เมตร
	Hops     int      `json:"hops"`     // จำนวน edges
}

// NodeView โครงสร้าง node ที่ใช้ในการคำนวณ (subset ของ MapNode)
type NodeView struct {
	ID string `json:"id"`
}

// EdgeView โครงสร้าง edge ที่ใช้ในการคำนวณ
// - Distance: น้ำหนักเป็น "เมตร" (ถ้าไม่ระบุ จะใช้ 1 เป็น fallback)
type EdgeView struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Distance int    `json:"distance"` // เมตร; ถ้า 0 จะ fallback เป็น 1
}

// ShortestPath หาเส้นทางที่สั้นที่สุดระหว่าง from -> to โดยใช้ BFS (weighted)
//
// ถ้า from == to → คืน []string{from}, distance 0
// ถ้าไม่มีเส้นทาง → คืน error ErrNoPath
//
// Distance คือ sum ของ edge weights (เมตร) — ถ้า edge ไม่มี weight จะนับเป็น 1
func ShortestPath(from, to string, nodes []NodeView, edges []EdgeView) (*ShortestPathResult, error) {
	if from == "" || to == "" {
		return nil, fmt.Errorf("from/to required")
	}

	// ตรวจว่ามี node จริง
	hasFrom, hasTo := false, false
	for _, n := range nodes {
		if n.ID == from {
			hasFrom = true
		}
		if n.ID == to {
			hasTo = true
		}
	}
	if !hasFrom {
		return nil, fmt.Errorf("%w: %s", ErrNodeNotFound, from)
	}
	if !hasTo {
		return nil, fmt.Errorf("%w: %s", ErrNodeNotFound, to)
	}

	// from == to → อยู่ที่เดิม
	if from == to {
		return &ShortestPathResult{Path: []string{from}, Distance: 0, Hops: 0}, nil
	}

	// สร้าง adjacency list + edge lookup
	adj := make(map[string][]string)
	edgeWeight := make(map[string]int) // key = "from|to" (ทิศทางใดก็ได้)
	for _, e := range edges {
		w := e.Distance
		if w <= 0 {
			w = 1 // fallback: ถ้าไม่ระบุ weight จะนับเป็น 1m ต่อ hop
		}
		adj[e.From] = append(adj[e.From], e.To)
		adj[e.To] = append(adj[e.To], e.From)
		edgeWeight[e.From+"|"+e.To] = w
		edgeWeight[e.To+"|"+e.From] = w
	}

	// BFS (ยังไม่ใช่ Dijkstra — เพราะ weights ใน mock data มีค่าใกล้เคียงกัน
	// แต่ก็เก็บ cost ใน parent เพื่อให้รู้ว่า segment นี้ยาวเท่าไหร่)
	visited := map[string]bool{from: true}
	parent := map[string]string{}
	queue := []string{from}
	found := false

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		if current == to {
			found = true
			break
		}

		for _, next := range adj[current] {
			if visited[next] {
				continue
			}
			visited[next] = true
			parent[next] = current
			queue = append(queue, next)
		}
	}

	if !found {
		return nil, fmt.Errorf("%w: %s -> %s", ErrNoPath, from, to)
	}

	// สร้าง path ย้อนกลับ
	path := []string{to}
	for cur := to; cur != from; {
		p, ok := parent[cur]
		if !ok {
			return nil, fmt.Errorf("%w: %s -> %s", ErrNoPath, from, to)
		}
		path = append([]string{p}, path...)
		cur = p
	}

	// รวมระยะทางจาก edge weights
	totalDist := 0
	for i := 0; i < len(path)-1; i++ {
		key := path[i] + "|" + path[i+1]
		if w, ok := edgeWeight[key]; ok {
			totalDist += w
		} else {
			totalDist += 1 // fallback
		}
	}

	return &ShortestPathResult{
		Path:     path,
		Distance: totalDist,
		Hops:     len(path) - 1,
	}, nil
}

// MapNodesFromJSON แปลง JSON string ของ nodes (จาก HospitalMap.Nodes) เป็น []NodeView
func MapNodesFromJSON(raw string) ([]NodeView, error) {
	if raw == "" {
		return []NodeView{}, nil
	}
	var full []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal([]byte(raw), &full); err != nil {
		return nil, fmt.Errorf("decode nodes: %w", err)
	}
	out := make([]NodeView, 0, len(full))
	for _, n := range full {
		if n.ID != "" {
			out = append(out, NodeView{ID: n.ID})
		}
	}
	return out, nil
}

// MapEdgesFromJSON แปลง JSON string ของ edges (จาก HospitalMap.Edges) เป็น []EdgeView
// รองรับทั้ง snake_case (DB/API JSON) และ camelCase (frontend type)
// ดึง field "distance" มาเป็น weight (เมตร) ถ้ามี
func MapEdgesFromJSON(raw string) ([]EdgeView, error) {
	if raw == "" {
		return []EdgeView{}, nil
	}
	var full []struct {
		From       string `json:"from_node_id"`
		To         string `json:"to_node_id"`
		FromCamel  string `json:"fromNodeId"`
		ToCamel    string `json:"toNodeId"`
		Distance   int    `json:"distance"`
	}
	if err := json.Unmarshal([]byte(raw), &full); err != nil {
		return nil, fmt.Errorf("decode edges: %w", err)
	}
	out := make([]EdgeView, 0, len(full))
	for _, e := range full {
		from := e.From
		if from == "" {
			from = e.FromCamel
		}
		to := e.To
		if to == "" {
			to = e.ToCamel
		}
		if from != "" && to != "" {
			out = append(out, EdgeView{From: from, To: to, Distance: e.Distance})
		}
	}
	return out, nil
}

// StageRef อ้างถึง stage + node_id ปลายทาง
type StageRef struct {
	Name   string
	NodeID string // ว่างได้ถ้า stage นี้ไม่ผูกกับห้อง
}

// PlanRoute คำนวณระยะทางระหว่าง stage ทุกคู่ที่ติดกัน
//
// คืน slice ของ leg (จำนวนเท่ากับ stages) โดย leg[i] คือระยะทางจาก stages[i-1] -> stages[i]
// leg[0] จะเป็น zero value (ระยะจาก "จุดเริ่มต้น" ไม่นับ)
//
// ถ้า stage ไหนไม่มี node_id หรือคำนวณไม่ได้ จะใส่ nil (ทำเครื่องหมายว่า "ไม่ทราบ")
func PlanRoute(stages []StageRef, nodes []NodeView, edges []EdgeView) []*ShortestPathResult {
	results := make([]*ShortestPathResult, len(stages))

	for i := range stages {
		if i == 0 {
			// ไม่มีจุดก่อนหน้า — ไม่นับระยะ
			continue
		}
		prev := stages[i-1]
		curr := stages[i]
		if prev.NodeID == "" || curr.NodeID == "" {
			continue
		}
		res, err := ShortestPath(prev.NodeID, curr.NodeID, nodes, edges)
		if err != nil {
			continue
		}
		results[i] = res
	}
	return results
}

// StagesToModelRow แปลง StageRef → JSON string สำหรับเก็บใน DB (รองรับทั้งเก่า/ใหม่)
// ใช้ตอน seed
func StagesToModelRow(stages []StageRef) (string, error) {
	type stageJSON struct {
		Name   string `json:"name"`
		NodeID string `json:"node_id,omitempty"`
	}
	out := make([]stageJSON, 0, len(stages))
	for _, s := range stages {
		out = append(out, stageJSON{Name: s.Name, NodeID: s.NodeID})
	}
	b, err := json.Marshal(out)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// DecodeStages รองรับทั้ง JSON array ของ string (เก่า) และ array ของ {name,node_id} (ใหม่)
// คืนเป็น []StageRef เสมอ — ถ้าเป็น string ก็ map เป็น NodeID = ""
func DecodeStages(raw string) ([]StageRef, error) {
	if raw == "" {
		return []StageRef{}, nil
	}
	// ลอง parse เป็น []string ก่อน (backward compat)
	var asStrings []string
	if err := json.Unmarshal([]byte(raw), &asStrings); err == nil {
		out := make([]StageRef, len(asStrings))
		for i, s := range asStrings {
			out[i] = StageRef{Name: s}
		}
		return out, nil
	}
	// ลอง parse เป็น []struct (ใหม่)
	var asStructs []struct {
		Name   string `json:"name"`
		NodeID string `json:"node_id"`
	}
	if err := json.Unmarshal([]byte(raw), &asStructs); err != nil {
		return nil, fmt.Errorf("decode stages (unknown format): %w", err)
	}
	out := make([]StageRef, len(asStructs))
	for i, s := range asStructs {
		out[i] = StageRef{Name: s.Name, NodeID: s.NodeID}
	}
	return out, nil
}

// HospitalMapRef reference ไปยัง HospitalMap (ใช้เป็น minimal interface)
type HospitalMapRef interface {
	Get() (*model.HospitalMap, error)
}

// MapNodeFull โครงสร้าง node ที่มีข้อมูลครบ (ใช้สำหรับ generate mockup stages)
type MapNodeFull struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

// MapNodesFullFromJSON แปลง JSON string ของ nodes → []MapNodeFull (มี type/name)
func MapNodesFullFromJSON(raw string) ([]MapNodeFull, error) {
	if raw == "" {
		return []MapNodeFull{}, nil
	}
	var full []MapNodeFull
	if err := json.Unmarshal([]byte(raw), &full); err != nil {
		return nil, fmt.Errorf("decode nodes (full): %w", err)
	}
	out := make([]MapNodeFull, 0, len(full))
	for _, n := range full {
		if n.ID != "" {
			out = append(out, n)
		}
	}
	return out, nil
}

// containsAny ตรวจว่า s มี substring ใด ๆ ใน subs หรือไม่
func containsAny(s string, subs []string) bool {
	for _, sub := range subs {
		if sub != "" && len(s) >= len(sub) {
			for i := 0; i+len(sub) <= len(s); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}

// DefaultStageNames ลำดับชื่อ stage ที่ใช้ตอน generate (ไทย, friendly)
var DefaultStageNames = []string{
	"registration",
	"triage",
	"vitals_check",
	"waiting",
	"in_consultation",
	"lab",
	"pharmacy",
	"payment",
	"discharge",
}

// GenerateMockupStagesFromMap สร้าง []StageRef อัตโนมัติจาก hospital map
//
// Strategy:
//  1. หา "starting node" — node แรกที่เป็น junction / room (ตามลำดับที่ DB ส่งมา)
//     ถ้าไม่เจอ → ใช้ node แรก
//  2. BFS จาก starting node เก็บ node IDs ตามลำดับที่เดินผ่าน (unique)
//  3. กรองเอาเฉพาะ node ที่ "ไม่ใช่ junction ล้วน" (room/elevator/stair/ramp)
//     แล้วเอา node แรก (จุดเริ่ม) กลับมาเป็น stage แรกเสมอ
//  4. Assign stage names ตาม DefaultStageNames (วนซ้ำถ้า stage เยอะกว่า)
//
// ผลลัพธ์:
//   - มีอย่างน้อย 2 stages
//   - stage แรกจะอ้างถึง starting node (เช่น ทางเข้า)
//   - ถ้า map มี node < 2 → return error
func GenerateMockupStagesFromMap(nodesJSON, edgesJSON string) ([]StageRef, error) {
	nodes, err := MapNodesFullFromJSON(nodesJSON)
	if err != nil {
		return nil, fmt.Errorf("generate stages: %w", err)
	}
	edges, err := MapEdgesFromJSON(edgesJSON)
	if err != nil {
		return nil, fmt.Errorf("generate stages: %w", err)
	}
	if len(nodes) < 2 {
		return nil, fmt.Errorf("need at least 2 nodes to generate mockup stages")
	}

	// หา starting node — priority: junction + name ใบ่งบอกทางเข้า > junction > room > node แรก
	startIdx := -1
	for i, n := range nodes {
		if n.Type == "junction" && (containsAny(n.Name, []string{"เข้า", "entrance", "ประตู", "door"})) {
			startIdx = i
			break
		}
	}
	if startIdx < 0 {
		for i, n := range nodes {
			if n.Type == "junction" {
				startIdx = i
				break
			}
		}
	}
	if startIdx < 0 {
		for i, n := range nodes {
			if n.Type == "room" {
				startIdx = i
				break
			}
		}
	}
	if startIdx < 0 {
		startIdx = 0
	}
	startID := nodes[startIdx].ID

	// สร้าง adjacency
	adj := make(map[string][]string)
	for _, e := range edges {
		adj[e.From] = append(adj[e.From], e.To)
		adj[e.To] = append(adj[e.To], e.From)
	}

	// BFS จาก start
	visited := map[string]bool{startID: true}
	order := []string{startID}
	queue := []string{startID}
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		for _, next := range adj[cur] {
			if visited[next] {
				continue
			}
			visited[next] = true
			order = append(order, next)
			queue = append(queue, next)
		}
	}

	// กรอง: เอาเฉพาะ node ที่ไม่ใช่ junction ล้วน — เก็บทั้ง startID + service nodes
	serviceNodes := make([]string, 0, len(order))
	serviceNodes = append(serviceNodes, order[0])
	for i := 1; i < len(order); i++ {
		id := order[i]
		// หา type
		var nType string
		for _, n := range nodes {
			if n.ID == id {
				nType = n.Type
				break
			}
		}
		if nType != "junction" {
			serviceNodes = append(serviceNodes, id)
		}
	}

	// ถ้าเหลือน้อยกว่า 2 → fallback: เอาทุก node ตามลำดับ
	if len(serviceNodes) < 2 {
		serviceNodes = order
	}

	// Assign stage names
	out := make([]StageRef, 0, len(serviceNodes))
	for i, id := range serviceNodes {
		name := DefaultStageNames[i]
		if i >= len(DefaultStageNames) {
			// ถ้า stage เยอะกว่า names → ตั้งชื่อจาก node id (เช่น "stage_n5")
			name = fmt.Sprintf("stage_%s", id)
		}
		out = append(out, StageRef{Name: name, NodeID: id})
	}
	return out, nil
}
