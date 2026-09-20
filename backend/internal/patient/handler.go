package patient

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/suttipong/hospital-carepath/internal/hospitalmap"
	"github.com/suttipong/hospital-carepath/internal/model"
	"github.com/suttipong/hospital-carepath/internal/pathway"
	"github.com/suttipong/hospital-carepath/internal/visit"
	"gorm.io/gorm"
)

// Handler รับผิดชอบ HTTP routes สำหรับผู้ป่วย
type Handler struct {
	store        *Store
	pathwayStore *pathway.Store
	visitStore   *visit.Store
	mapStore     *hospitalmap.Store // สำหรับคำนวณ route summary จากผังปัจจุบัน
	db           *gorm.DB
}

// NewHandler สร้าง handler ใหม่
func NewHandler(store *Store, pathwayStore *pathway.Store, visitStore *visit.Store, mapStore *hospitalmap.Store, db *gorm.DB) *Handler {
	return &Handler{store: store, pathwayStore: pathwayStore, visitStore: visitStore, mapStore: mapStore, db: db}
}

// Register ลงทะเบียน route ทั้งหมดเข้ากับ mux
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /patients", h.create)
	mux.HandleFunc("GET /patients", h.list)
	mux.HandleFunc("GET /patients/{id}", h.get)

	mux.HandleFunc("PATCH /patients/{id}/status", h.updateStatus)
	mux.HandleFunc("PATCH /patients/{id}/pathway", h.assignPathway)
	mux.HandleFunc("GET /patients/{id}/pathway", h.getPathway)
}

type createRequest struct {
	Name    string `json:"name"`
	Gender  string `json:"gender"`
	Age     int    `json:"age"`
	Phone   string `json:"phone"`
	Symptom string `json:"symptom"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	p := &model.Patient{
		Name:    name,
		Gender:  req.Gender,
		Age:     req.Age,
		Phone:   req.Phone,
		Symptom: req.Symptom,
	}
	created, err := h.store.Create(p)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	patients, err := h.store.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"count":    len(patients),
		"patients": patients,
	})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := h.store.Get(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "patient not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

// enrichStepsWithLiveRoute เขียนทับ MapNodeID/DistanceFromPrev/RouteFromPrev ของแต่ละ step
// โดยใช้ hospital-map ปัจจุบัน (BFS) — เพื่อให้ response ตรงกับ /hospital-map เสมอ
//
// ถ้าหา hospital-map ไม่ได้ → คงค่าเดิมที่เก็บใน DB
func (h *Handler) enrichStepsWithLiveRoute(steps []pathwayStepView) []pathwayStepView {
	if h.mapStore == nil || len(steps) < 2 {
		return steps
	}
	hospitalMap, err := h.mapStore.Get()
	if err != nil || hospitalMap == nil {
		return steps
	}
	nodes, _ := pathway.MapNodesFromJSON(hospitalMap.Nodes)
	edges, _ := pathway.MapEdgesFromJSON(hospitalMap.Edges)

	enriched := make([]pathwayStepView, len(steps))
	copy(enriched, steps)

	for i := 1; i < len(enriched); i++ {
		prev := enriched[i-1]
		curr := enriched[i]
		if prev.MapNodeID == nil || curr.MapNodeID == nil {
			continue
		}
		prevID := *prev.MapNodeID
		currID := *curr.MapNodeID
		if prevID == "" || currID == "" {
			continue
		}
		res, err := pathway.ShortestPath(prevID, currID, nodes, edges)
		if err != nil {
			continue // คงค่าเดิมจาก DB
		}
		pathJSON, jerr := json.Marshal(res.Path)
		if jerr != nil {
			continue
		}
		dist := res.Distance
		pj := string(pathJSON)
		enriched[i].DistanceFromPrev = &dist
		enriched[i].RouteFromPrev = &pj
	}
	return enriched
}

func (h *Handler) updateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req updateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	p, err := h.store.UpdateStatus(id, req.Status)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "patient not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// assignPathwayRequest สำหรับ PATCH /patients/{id}/pathway
type assignPathwayRequest struct {
	TemplateCode      string   `json:"template_code"`       // เช่น "diabetic_followup"
	SpecialConditions []string `json:"special_conditions"`  // เช่น ["wheelchair", "fast_required"]
}

// pathwayTemplateView มุมมองของ template ที่ฝังใน response ของผู้ป่วย
type pathwayTemplateView struct {
	ID     uint     `json:"id"`
	Code   string   `json:"code"`
	Name   string   `json:"name"`
	Stages []string `json:"stages"`
}

func (h *Handler) assignPathway(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req assignPathwayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	// resolve template code → template ID (ถ้าระบุ)
	var templateID *uint
	var templateCode string
	if req.TemplateCode != "" {
		t, err := h.pathwayStore.GetByCode(req.TemplateCode)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) || err.Error() == "pathway template not found" {
				writeError(w, http.StatusBadRequest, "unknown template_code: "+req.TemplateCode)
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		templateID = &t.ID
		templateCode = t.Code
	}

	conditions := req.SpecialConditions
	if conditions == nil {
		conditions = []string{}
	}
	conditionsJSON, _ := json.Marshal(conditions)

	p, err := h.store.AssignPathway(id, templateID, string(conditionsJSON))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "patient not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// สร้าง Visit + VisitSteps อัตโนมัติเมื่อกำหนด template
	var visitID *uint
	var stepsCreated int
	if templateID != nil {
		_, steps, err := h.visitStore.CreateFromPathway(p.Code, *templateID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "create visit: "+err.Error())
			return
		}
		if len(steps) > 0 {
			vid := steps[0].VisitID
			visitID = &vid
		}
		stepsCreated = len(steps)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":                  p.Code,
		"name":                p.Name,
		"pathway_template_id": p.PathwayTemplateID,
		"template_code":       templateCode,
		"special_conditions":  conditions,
		"visit_id":            visitID,
		"steps_created":       stepsCreated,
	})
}

// pathwayStepView มุมมองย่อยของ step (ใช้ใน response)
type pathwayStepView struct {
	StepOrder        int        `json:"step_order"`
	Stage            string     `json:"stage"`
	Status           string     `json:"status"`
	MapNodeID        *string    `json:"map_node_id,omitempty"`
	DistanceFromPrev *int       `json:"distance_from_prev,omitempty"`
	RouteFromPrev    *string    `json:"route_from_prev,omitempty"` // JSON string เช่น "[\"n7\",\"n4\",\"n5\"]"
	StartedAt        *time.Time `json:"started_at,omitempty"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
	PerformedBy      *string    `json:"performed_by,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

// pathwayVisitView มุมมอง visit + steps สำหรับ patient pathway
type pathwayVisitView struct {
	ID             uint               `json:"id"`
	Status         string             `json:"status"`
	StartedAt      time.Time          `json:"started_at"`
	CompletedAt    *time.Time         `json:"completed_at,omitempty"`
	TotalSteps     int                `json:"total_steps"`
	CompletedSteps int                `json:"completed_steps"`
	CurrentStep    *pathwayStepView   `json:"current_step,omitempty"`
	Steps          []pathwayStepView  `json:"steps"`
}

// pathwayRouteSummary สรุปเส้นทางทั้ง visit (BFS) — คำนวณจาก hospital-map ปัจจุบัน
type pathwayRouteSummary struct {
	TotalDistance int      `json:"total_distance"`
	Hops          int      `json:"hops"`
	Path          []string `json:"path"`
	Waypoints     []string `json:"waypoints"`
	ComputedAt    string   `json:"computed_at"`
	HospitalMapAt string   `json:"hospital_map_updated_at"`
	Source        string   `json:"source"`
}

// buildRouteSummary คำนวณ route summary จาก hospital-map ปัจจุบัน + step.map_node_id
func (h *Handler) buildRouteSummary(visitView *pathwayVisitView) *pathwayRouteSummary {
	if visitView == nil || len(visitView.Steps) < 2 {
		return nil
	}
	if h.mapStore == nil {
		return nil
	}
	hospitalMap, err := h.mapStore.Get()
	if err != nil || hospitalMap == nil {
		return nil
	}

	// เก็บ waypoints ตามลำดับ step (เอาเฉพาะ node ที่มีค่า)
	waypoints := make([]string, 0, len(visitView.Steps))
	for _, s := range visitView.Steps {
		if s.MapNodeID != nil && *s.MapNodeID != "" {
			waypoints = append(waypoints, *s.MapNodeID)
		}
	}
	if len(waypoints) < 2 {
		return nil
	}

	nodes, _ := pathway.MapNodesFromJSON(hospitalMap.Nodes)
	edges, _ := pathway.MapEdgesFromJSON(hospitalMap.Edges)

	// รวมระยะทาง + หาเส้นทางเต็ม
	fullPath := []string{waypoints[0]}
	totalDist := 0
	totalHops := 0
	for i := 0; i < len(waypoints)-1; i++ {
		res, err := pathway.ShortestPath(waypoints[i], waypoints[i+1], nodes, edges)
		if err != nil {
			// fallback ใช้ค่าจาก step.route_from_prev ถ้ามี
			stepIdx := i + 1
			if stepIdx < len(visitView.Steps) &&
				visitView.Steps[stepIdx].RouteFromPrev != nil {
				var segPath []string
				if jerr := json.Unmarshal(
					[]byte(*visitView.Steps[stepIdx].RouteFromPrev),
					&segPath,
				); jerr == nil && len(segPath) >= 2 {
					fullPath = append(fullPath, segPath[1:]...)
					if visitView.Steps[stepIdx].DistanceFromPrev != nil {
						totalDist += *visitView.Steps[stepIdx].DistanceFromPrev
					}
					totalHops += len(segPath) - 1
				}
			}
			continue
		}
		fullPath = append(fullPath, res.Path[1:]...)
		totalDist += res.Distance
		totalHops += res.Hops
	}

	return &pathwayRouteSummary{
		TotalDistance: totalDist,
		Hops:          totalHops,
		Path:          fullPath,
		Waypoints:     waypoints,
		ComputedAt:    time.Now().UTC().Format(time.RFC3339),
		HospitalMapAt: hospitalMap.UpdatedAt.UTC().Format(time.RFC3339),
		Source:        "hospital_map",
	}
}

// getPathway ดู pathway ปัจจุบันของผู้ป่วย พร้อมตำแหน่งปัจจุบันใน visit
func (h *Handler) getPathway(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	p, err := h.store.Get(id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "patient not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	conditions := []string{}
	if p.SpecialConditions != "" {
		_ = json.Unmarshal([]byte(p.SpecialConditions), &conditions)
	}

	var template *pathwayTemplateView
	if p.PathwayTemplateID != nil {
		var tmpl model.PathwayTemplate
		if err := h.db.Where("id = ?", *p.PathwayTemplateID).First(&tmpl).Error; err == nil {
			template = &pathwayTemplateView{
				ID:     tmpl.ID,
				Code:   tmpl.Code,
				Name:   tmpl.Name,
				Stages: pathway.ParseStages(tmpl.Stages),
			}
		}
	}

	// หา active visit ล่าสุดของผู้ป่วย (ถ้ามี)
	var visitView *pathwayVisitView
	var activeVisit model.Visit
	if err := h.db.Where("patient_code = ? AND status = ?", p.Code, "active").
		Order("id desc").First(&activeVisit).Error; err == nil {
		// โหลด steps ของ visit
		var steps []model.VisitStep
		if err := h.db.Where("visit_id = ?", activeVisit.ID).
			Order("step_order").Find(&steps).Error; err == nil {
			stepsView := make([]pathwayStepView, 0, len(steps))
			completed := 0
			var current *pathwayStepView
			for _, s := range steps {
				sv := pathwayStepView{
					StepOrder:        s.StepOrder,
					Stage:            s.Stage,
					Status:           s.Status,
					MapNodeID:        s.MapNodeID,
					DistanceFromPrev: s.DistanceFromPrev,
					RouteFromPrev:    s.RouteFromPrev,
					StartedAt:        s.StartedAt,
					CompletedAt:      s.CompletedAt,
					PerformedBy:      s.PerformedBy,
					Notes:            s.Notes,
				}
				stepsView = append(stepsView, sv)
				if s.Status == "completed" {
					completed++
				}
				if current == nil && (s.Status == "in_progress" || s.Status == "pending") {
					c := sv
					current = &c
				}
			}
			visitView = &pathwayVisitView{
				ID:             activeVisit.ID,
				Status:         activeVisit.Status,
				StartedAt:      activeVisit.StartedAt,
				CompletedAt:    activeVisit.CompletedAt,
				TotalSteps:     len(steps),
				CompletedSteps: completed,
				CurrentStep:    current,
				Steps:          h.enrichStepsWithLiveRoute(stepsView),
			}
		}
	}

	// ถ้าไม่มี active visit ลองหา visit ล่าสุด (completed/cancelled) — เพื่อแสดงประวัติ
	if visitView == nil {
		var lastVisit model.Visit
		if err := h.db.Where("patient_code = ?", p.Code).
			Order("id desc").First(&lastVisit).Error; err == nil {
			var steps []model.VisitStep
			if err := h.db.Where("visit_id = ?", lastVisit.ID).
				Order("step_order").Find(&steps).Error; err == nil {
				stepsView := make([]pathwayStepView, 0, len(steps))
				completed := 0
				for _, s := range steps {
					sv := pathwayStepView{
						StepOrder:        s.StepOrder,
						Stage:            s.Stage,
						Status:           s.Status,
						MapNodeID:        s.MapNodeID,
						DistanceFromPrev: s.DistanceFromPrev,
						RouteFromPrev:    s.RouteFromPrev,
						StartedAt:        s.StartedAt,
						CompletedAt:      s.CompletedAt,
						PerformedBy:      s.PerformedBy,
						Notes:            s.Notes,
					}
					stepsView = append(stepsView, sv)
					if s.Status == "completed" {
						completed++
					}
				}
				visitView = &pathwayVisitView{
					ID:             lastVisit.ID,
					Status:         lastVisit.Status,
					StartedAt:      lastVisit.StartedAt,
					CompletedAt:    lastVisit.CompletedAt,
					TotalSteps:     len(steps),
					CompletedSteps: completed,
					Steps:          h.enrichStepsWithLiveRoute(stepsView),
				}
			}
		}
	}

	// คำนวณ route summary จาก hospital-map ปัจจุบัน (BFS, หน่วยเมตร)
	var routeSummary *pathwayRouteSummary
	if visitView != nil {
		routeSummary = h.buildRouteSummary(visitView)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"patient_id":         p.Code,
		"patient_name":       p.Name,
		"pathway_template":   template,
		"special_conditions": conditions,
		"visit":              visitView, // มี active visit หรือ visit ล่าสุด
		"route_summary":      routeSummary,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
