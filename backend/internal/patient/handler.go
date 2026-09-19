package patient

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

// Handler รับผิดชอบ HTTP routes สำหรับผู้ป่วย
type Handler struct {
	store *Store
}

// NewHandler สร้าง handler ใหม่
func NewHandler(store *Store) *Handler {
	return &Handler{store: store}
}

// Register ลงทะเชื่อม route ทั้งหมดเข้ากับ mux
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /patients", h.create)
	mux.HandleFunc("GET /patients", h.list)
	mux.HandleFunc("GET /patients/{id}", h.get)
	mux.HandleFunc("PATCH /patients/{id}/status", h.updateStatus)
}

// createRegisterRequest คือ body สำหรับลงทะเบียนผู้ป่วยใหม่
type createRegisterRequest struct {
	Name    string `json:"name"`
	Gender  string `json:"gender"`
	Age     int    `json:"age"`
	Phone   string `json:"phone"`
	Symptom string `json:"symptom"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	p := h.store.Create(Patient{
		Name:    name,
		Gender:  req.Gender,
		Age:     req.Age,
		Phone:   req.Phone,
		Symptom: req.Symptom,
	})
	writeJSON(w, http.StatusCreated, p)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	patients := h.store.List()
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

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
