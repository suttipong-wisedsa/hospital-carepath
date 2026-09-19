package visit

import (
	"errors"
	"fmt"
	"time"

	"github.com/suttipong/hospital-carepath/internal/model"
	"gorm.io/gorm"
)

// Store ห่อหุ้ม GORM สำหรับตาราง visits และ visit_steps
type Store struct {
	db *gorm.DB
}

// NewStore สร้าง store ใหม่
func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

// DB คืน *gorm.DB ดิบ (ใช้กรณีที่ handler ต้องการ query นอกเหนือจาก method ของ Store)
func (s *Store) DB() *gorm.DB {
	return s.db
}

// ErrNotFound ใช้เมื่อไม่พบ visit
var ErrNotFound = errors.New("visit not found")

// status ของ visit ที่อนุญาต
var validVisitStatuses = map[string]struct{}{
	"active":    {},
	"completed": {},
	"cancelled": {},
}

// status ของ step ที่อนุญาต
var validStepStatuses = map[string]struct{}{
	"pending":     {},
	"in_progress": {},
	"completed":   {},
	"skipped":     {},
}

// CreateFromPathway สร้าง Visit ใหม่จาก template พร้อม VisitSteps ตามจำนวน stage
// คืนค่า visit ที่สร้างใหม่, slice ของ steps ที่สร้างใหม่, และ error
func (s *Store) CreateFromPathway(patientCode string, templateID uint) (*model.Visit, []*model.VisitStep, error) {
	// ดึง template
	var tmpl model.PathwayTemplate
	if err := s.db.First(&tmpl, templateID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, fmt.Errorf("template id=%d not found", templateID)
		}
		return nil, nil, err
	}

	// แปลง stages จาก JSON
	stages := []string{}
	if tmpl.Stages != "" {
		if err := decodeJSONArray(tmpl.Stages, &stages); err != nil {
			return nil, nil, fmt.Errorf("decode stages: %w", err)
		}
	}
	if len(stages) == 0 {
		return nil, nil, fmt.Errorf("template %s has no stages", tmpl.Code)
	}

	// สร้าง visit
	visit := &model.Visit{
		PatientCode:       patientCode,
		PathwayTemplateID: templateID,
		Status:            "active",
		StartedAt:         time.Now(),
	}
	if err := s.db.Create(visit).Error; err != nil {
		return nil, nil, fmt.Errorf("create visit: %w", err)
	}

	// สร้าง steps ตามลำดับ
	steps := make([]*model.VisitStep, 0, len(stages))
	for i, stage := range stages {
		step := &model.VisitStep{
			VisitID:   visit.ID,
			StepOrder: i + 1,
			Stage:     stage,
			Status:    "pending",
		}
		if err := s.db.Create(step).Error; err != nil {
			return nil, nil, fmt.Errorf("create step %d: %w", i+1, err)
		}
		steps = append(steps, step)
	}

	return visit, steps, nil
}

// List คืนรายการ visit ทั้งหมด (เรียงตาม id desc)
func (s *Store) List() ([]*model.Visit, error) {
	var visits []*model.Visit
	if err := s.db.Order("id desc").Find(&visits).Error; err != nil {
		return nil, err
	}
	return visits, nil
}

// Get ดึง visit ตาม id (พร้อม steps)
func (s *Store) Get(id uint) (*model.Visit, []*model.VisitStep, error) {
	var v model.Visit
	if err := s.db.First(&v, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}

	var steps []*model.VisitStep
	if err := s.db.Where("visit_id = ?", v.ID).Order("step_order").Find(&steps).Error; err != nil {
		return nil, nil, err
	}
	return &v, steps, nil
}

// ListByPatient คืนรายการ visit ของผู้ป่วยตาม patient code
func (s *Store) ListByPatient(patientCode string) ([]*model.Visit, error) {
	var visits []*model.Visit
	if err := s.db.Where("patient_code = ?", patientCode).Order("id desc").Find(&visits).Error; err != nil {
		return nil, err
	}
	return visits, nil
}

// UpdateStepStatus อัปเดตสถานะของ step ตาม visitID และ stepOrder
func (s *Store) UpdateStepStatus(visitID uint, stepOrder int, status string) (*model.VisitStep, error) {
	if _, ok := validStepStatuses[status]; !ok {
		return nil, fmt.Errorf("invalid step status: %s", status)
	}

	var step model.VisitStep
	if err := s.db.Where("visit_id = ? AND step_order = ?", visitID, stepOrder).First(&step).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	now := time.Now()
	updates := map[string]any{
		"status": status,
	}
	if status == "in_progress" && step.StartedAt == nil {
		updates["started_at"] = now
	}
	if status == "completed" {
		if step.StartedAt == nil {
			updates["started_at"] = now
		}
		updates["completed_at"] = now
	}

	if err := s.db.Model(&step).Updates(updates).Error; err != nil {
		return nil, err
	}

	// refresh
	if err := s.db.First(&step, step.ID).Error; err != nil {
		return nil, err
	}
	return &step, nil
}

// decodeJSONArray ช่วยแปลง JSON string เป็น []string (ลด dependency จาก encoding/json ในไฟล์นี้)
func decodeJSONArray(s string, out *[]string) error {
	return jsonUnmarshal([]byte(s), out)
}
