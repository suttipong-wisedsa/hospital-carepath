package pathway

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/suttipong/hospital-carepath/internal/hospitalmap"
	"github.com/suttipong/hospital-carepath/internal/model"
)

// Handler รับผิดชอบ HTTP routes สำหรับ pathway templates
type Handler struct {
	store    *Store
	mapStore *hospitalmap.Store // สำหรับ generate stages จาก hospital map
}

// NewHandler สร้าง handler ใหม่
func NewHandler(store *Store, mapStore *hospitalmap.Store) *Handler {
	return &Handler{store: store, mapStore: mapStore}
}

// Register ลงทะเบียน route เข้ากับ mux
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /pathway-templates", h.list)
	mux.HandleFunc("GET /pathway-templates/{code}", h.get)
	mux.HandleFunc("POST /pathway-templates/from-map", h.generateFromMap)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	templates, err := h.store.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// แปลง Stages เป็น []string เพื่อให้ client ใช้ง่าย
	out := make([]map[string]any, 0, len(templates))
	for _, t := range templates {
		out = append(out, map[string]any{
			"id":          t.ID,
			"code":        t.Code,
			"name":        t.Name,
			"description": t.Description,
			"stages":      ParseStages(t.Stages),
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"count":     len(out),
		"templates": out,
	})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	t, err := h.store.GetByCode(code)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "pathway template not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":          t.ID,
		"code":        t.Code,
		"name":        t.Name,
		"description": t.Description,
		"stages":      ParseStages(t.Stages),
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

// generateFromMap POST /pathway-templates/from-map
//
// request body (optional):
//   {
//     "code": "auto_general",         // optional — ถ้ามีจะ overwrite template เดิม
//     "name": "Generated Template",   // optional
//     "save": true                    // optional — true=upsert ลง DB, false=แค่ preview
//   }
//
// response:
//   {
//     "code": "...",
//     "name": "...",
//     "stages": [{name, node_id}, ...],
//     "saved": true|false,
//     "template": { ...full template... }    // ถ้า save=true
//   }
func (h *Handler) generateFromMap(w http.ResponseWriter, r *http.Request) {
	if h.mapStore == nil {
		writeError(w, http.StatusInternalServerError, "map store not configured")
		return
	}
	hospitalMap, err := h.mapStore.Get()
	if err != nil || hospitalMap == nil {
		writeError(w, http.StatusBadRequest, "hospital map not found — please save a map first")
		return
	}

	var req struct {
		Code string `json:"code"`
		Name string `json:"name"`
		Save bool   `json:"save"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req) // body อาจว่าง

	stages, err := GenerateMockupStagesFromMap(hospitalMap.Nodes, hospitalMap.Edges)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	stagesJSON, _ := StagesToModelRow(stages)

	code := req.Code
	if code == "" {
		code = "auto_" + time.Now().Format("20060102_150405")
	}
	name := req.Name
	if name == "" {
		name = "Mockup จาก " + time.Now().Format("2006-01-02 15:04:05")
	}

	response := map[string]any{
		"code":   code,
		"name":   name,
		"stages": stages,
	}

	if req.Save {
		tmpl := &model.PathwayTemplate{
			Code:        code,
			Name:        name,
			Stages:      stagesJSON,
			Description: "auto-generated from hospital map",
		}
		// upsert
		if existing, gerr := h.store.GetByCode(code); gerr == nil && existing != nil {
			existing.Name = tmpl.Name
			existing.Stages = tmpl.Stages
			existing.Description = tmpl.Description
			if uerr := h.store.Update(existing); uerr != nil {
				writeError(w, http.StatusInternalServerError, "update: "+uerr.Error())
				return
			}
			tmpl = existing
		} else {
			if ierr := h.store.Insert(tmpl); ierr != nil {
				writeError(w, http.StatusInternalServerError, "insert: "+ierr.Error())
				return
			}
		}
		response["saved"] = true
		response["template"] = map[string]any{
			"id":          tmpl.ID,
			"code":        tmpl.Code,
			"name":        tmpl.Name,
			"description": tmpl.Description,
			"stages":      ParseStages(tmpl.Stages),
		}
	} else {
		response["saved"] = false
	}

	writeJSON(w, http.StatusOK, response)
}
