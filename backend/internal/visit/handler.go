package visit

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
)

// Handler รับผิดชอบ HTTP routes สำหรับ visit + visit steps
type Handler struct {
	store *Store
}

// NewHandler สร้าง handler ใหม่
func NewHandler(store *Store) *Handler {
	return &Handler{store: store}
}

// Register ลงทะเบียน route เข้ากับ mux
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /visits", h.list)
	mux.HandleFunc("GET /visits/{id}", h.get)
	mux.HandleFunc("PATCH /visits/{id}/steps/{stepOrder}", h.updateStep)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	visits, err := h.store.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"count":  len(visits),
		"visits": visits,
	})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}

	visit, steps, err := h.store.Get(uint(id))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "visit not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"visit": visit,
		"steps": steps,
	})
}

type updateStepRequest struct {
	Status      string  `json:"status"`
	PerformedBy *string `json:"performed_by,omitempty"`
	Notes       *string `json:"notes,omitempty"`
}

func (h *Handler) updateStep(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	stepOrderStr := r.PathValue("stepOrder")

	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}
	stepOrder, err := strconv.Atoi(stepOrderStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid step_order")
		return
	}

	var req updateStepRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	step, err := h.store.UpdateStepStatus(uint(id), stepOrder, req.Status)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "visit or step not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// อัปเดต performed_by / notes ถ้ามี
	updates := map[string]any{}
	if req.PerformedBy != nil {
		updates["performed_by"] = *req.PerformedBy
	}
	if req.Notes != nil {
		updates["notes"] = *req.Notes
	}
	if len(updates) > 0 {
		if err := h.store.DB().Model(step).Updates(updates).Error; err == nil {
			_ = h.store.DB().First(step, step.ID).Error
		}
	}

	writeJSON(w, http.StatusOK, step)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
