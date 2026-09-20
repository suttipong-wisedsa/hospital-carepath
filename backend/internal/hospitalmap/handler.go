package hospitalmap

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/suttipong/hospital-carepath/internal/model"
)

type Handler struct {
	store *Store
}

func NewHandler(store *Store) *Handler {
	return &Handler{store: store}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /hospital-map", h.get)
	mux.HandleFunc("PUT /hospital-map", h.save)
}

type mapNode struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	FloorID    string  `json:"floor_id"`
	XRatio     float64 `json:"x_ratio"`
	YRatio     float64 `json:"y_ratio"`
	Accessible bool    `json:"accessible"`
}

type mapEdge struct {
	ID         string `json:"id"`
	FromNodeID string `json:"from_node_id"`
	ToNodeID   string `json:"to_node_id"`
	Type       string `json:"type"`
	Accessible bool   `json:"accessible"`
	Distance   int    `json:"distance,omitempty"` // ระยะทางเป็น "เมตร" (optional)
}

type saveMapRequest struct {
	Nodes []mapNode `json:"nodes"`
	Edges []mapEdge `json:"edges"`
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	hospitalMap, err := h.store.Get()
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "hospital map not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response, err := buildResponse(hospitalMap)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "stored hospital map is invalid")
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) save(w http.ResponseWriter, r *http.Request) {
	var req saveMapRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if req.Nodes == nil || req.Edges == nil {
		writeError(w, http.StatusBadRequest, "nodes and edges are required")
		return
	}
	if err := validateMap(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	hospitalMap, err := h.store.Save(req.Nodes, req.Edges)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	response, err := buildResponse(hospitalMap)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "saved hospital map is invalid")
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func validateMap(req saveMapRequest) error {
	validNodeTypes := map[string]bool{"room": true, "junction": true, "elevator": true, "stair": true, "ramp": true}
	validEdgeTypes := map[string]bool{"walkway": true, "elevator": true, "stair": true, "ramp": true}
	nodeIDs := make(map[string]bool, len(req.Nodes))

	for i, node := range req.Nodes {
		if strings.TrimSpace(node.ID) == "" || strings.TrimSpace(node.Name) == "" || strings.TrimSpace(node.FloorID) == "" {
			return fmt.Errorf("node %d must have id, name and floor_id", i)
		}
		if nodeIDs[node.ID] {
			return fmt.Errorf("duplicate node id: %s", node.ID)
		}
		if !validNodeTypes[node.Type] {
			return fmt.Errorf("invalid node type: %s", node.Type)
		}
		if node.XRatio < 0 || node.XRatio > 1 || node.YRatio < 0 || node.YRatio > 1 {
			return fmt.Errorf("node %s coordinates must be between 0 and 1", node.ID)
		}
		nodeIDs[node.ID] = true
	}

	edgeIDs := make(map[string]bool, len(req.Edges))
	for i, edge := range req.Edges {
		if strings.TrimSpace(edge.ID) == "" {
			return fmt.Errorf("edge %d must have id", i)
		}
		if edgeIDs[edge.ID] {
			return fmt.Errorf("duplicate edge id: %s", edge.ID)
		}
		if edge.FromNodeID == edge.ToNodeID || !nodeIDs[edge.FromNodeID] || !nodeIDs[edge.ToNodeID] {
			return fmt.Errorf("edge %s must reference two different existing nodes", edge.ID)
		}
		if !validEdgeTypes[edge.Type] {
			return fmt.Errorf("invalid edge type: %s", edge.Type)
		}
		edgeIDs[edge.ID] = true
	}
	return nil
}

func buildResponse(hospitalMap *model.HospitalMap) (map[string]any, error) {
	var nodes []mapNode
	var edges []mapEdge
	if err := json.Unmarshal([]byte(hospitalMap.Nodes), &nodes); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(hospitalMap.Edges), &edges); err != nil {
		return nil, err
	}
	return map[string]any{
		"nodes":      nodes,
		"edges":      edges,
		"updated_at": hospitalMap.UpdatedAt,
	}, nil
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
