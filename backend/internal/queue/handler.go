package queue

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
)

// Handler รับผิดชอบ HTTP routes สำหรับ queue operations
type Handler struct {
	store *Store
}

// NewHandler สร้าง handler ใหม่
func NewHandler(store *Store) *Handler {
	return &Handler{store: store}
}

// Register ลงทะเบียน route เข้ากับ mux
func (h *Handler) Register(mux *http.ServeMux) {
	// ดูคิว
	mux.HandleFunc("GET /queue", h.list)
	mux.HandleFunc("GET /queue/all", h.listAll)
	mux.HandleFunc("GET /queue/{visitId}", h.get)

	// เรียกคิว — patient เข้าห้องตรวจ
	mux.HandleFunc("POST /queue/{visitId}/call", h.call)

	// บันทึกตรวจเสร็จ + skip + ปิด visit
	mux.HandleFunc("POST /queue/{visitId}/steps/{stepOrder}/complete", h.completeStep)
	mux.HandleFunc("POST /queue/{visitId}/steps/{stepOrder}/skip", h.skipStep)
	mux.HandleFunc("POST /queue/{visitId}/complete", h.completeVisit)
	mux.HandleFunc("POST /queue/{visitId}/cancel", h.cancelVisit)
}

// ─── list ────────────────────────────────────────────────────────────────────

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	entries, err := h.store.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"count": len(entries),
		"queue": entries,
	})
}

func (h *Handler) listAll(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}
	entries, err := h.store.ListAll(limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"count": len(entries),
		"queue": entries,
	})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("visitId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}
	entry, err := h.store.GetEntry(uint(id))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "visit not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

// ─── call ────────────────────────────────────────────────────────────────────
// POST /queue/{visitId}/call
// body: {} (ไม่ต้องมี)
// response: { entry, called_step }

func (h *Handler) call(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("visitId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}
	entry, calledStep, err := h.store.Call(uint(id))
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			writeError(w, http.StatusNotFound, "visit not found")
		case errors.Is(err, ErrVisitNotActive):
			writeError(w, http.StatusConflict, err.Error())
		case errors.Is(err, ErrNoPendingStep):
			writeError(w, http.StatusConflict, "no pending step to call — visit may already be completed")
		default:
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"entry":       entry,
		"called_step": calledStep,
	})
}

// ─── complete step ───────────────────────────────────────────────────────────
// POST /queue/{visitId}/steps/{stepOrder}/complete
// body: { "performed_by": "...", "notes": "..." } (optional)
// response: { entry, completed_step, next_step }

type completeStepRequest struct {
	PerformedBy string `json:"performed_by"`
	Notes       string `json:"notes"`
}

func (h *Handler) completeStep(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("visitId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}
	stepOrder, err := strconv.Atoi(r.PathValue("stepOrder"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid step order")
		return
	}

	var req completeStepRequest
	// body optional — decode ถ้ามี
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
	}

	entry, completedStep, nextStep, err := h.store.CompleteStep(
		uint(id), stepOrder, req.PerformedBy, req.Notes,
	)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			writeError(w, http.StatusNotFound, "visit or step not found")
		case errors.Is(err, ErrInvalidTransition):
			writeError(w, http.StatusConflict, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"entry":          entry,
		"completed_step": completedStep,
		"next_step":      nextStep, // null ถ้า visit เสร็จแล้ว
	})
}

// ─── skip step ───────────────────────────────────────────────────────────────
// POST /queue/{visitId}/steps/{stepOrder}/skip
// body: { "performed_by": "...", "notes": "เหตุผลที่ข้าม" } (optional)

func (h *Handler) skipStep(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("visitId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}
	stepOrder, err := strconv.Atoi(r.PathValue("stepOrder"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid step order")
		return
	}

	var req completeStepRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
	}

	entry, skippedStep, err := h.store.SkipStep(
		uint(id), stepOrder, req.PerformedBy, req.Notes,
	)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			writeError(w, http.StatusNotFound, "visit or step not found")
		case errors.Is(err, ErrInvalidTransition):
			writeError(w, http.StatusConflict, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"entry":        entry,
		"skipped_step": skippedStep,
	})
}

// ─── complete / cancel visit ─────────────────────────────────────────────────
// POST /queue/{visitId}/complete    - ปิด visit (mark all remaining = completed)
// POST /queue/{visitId}/cancel      - ยกเลิก visit (mark all remaining = skipped)

func (h *Handler) completeVisit(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("visitId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}
	entry, err := h.store.CompleteVisit(uint(id))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "visit not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

func (h *Handler) cancelVisit(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseUint(r.PathValue("visitId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid visit id")
		return
	}
	entry, err := h.store.CancelVisit(uint(id))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeError(w, http.StatusNotFound, "visit not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, entry)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
