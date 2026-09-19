package pathway

import (
	"encoding/json"
	"errors"
	"net/http"
)

// Handler รับผิดชอบ HTTP routes สำหรับ pathway templates
type Handler struct {
	store *Store
}

// NewHandler สร้าง handler ใหม่
func NewHandler(store *Store) *Handler {
	return &Handler{store: store}
}

// Register ลงทะเบียน route เข้ากับ mux
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /pathway-templates", h.list)
	mux.HandleFunc("GET /pathway-templates/{code}", h.get)
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
