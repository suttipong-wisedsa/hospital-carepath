package patient

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

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
	db           *gorm.DB
}

// NewHandler สร้าง handler ใหม่
func NewHandler(store *Store, pathwayStore *pathway.Store, visitStore *visit.Store, db *gorm.DB) *Handler {
	return &Handler{store: store, pathwayStore: pathwayStore, visitStore: visitStore, db: db}
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

// getPathway ดู pathway ปัจจุบันของผู้ป่วย
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

	writeJSON(w, http.StatusOK, map[string]any{
		"patient_id":         p.Code,
		"patient_name":       p.Name,
		"pathway_template":   template,
		"special_conditions": conditions,
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
