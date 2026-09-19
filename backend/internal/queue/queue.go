package queue

import (
	"errors"
	"fmt"
	"time"

	"github.com/suttipong/hospital-carepath/internal/model"
	"gorm.io/gorm"
)

// Errors ที่ใช้ใน queue package
var (
	ErrNotFound          = errors.New("visit not found")
	ErrVisitNotActive    = errors.New("visit is not active")
	ErrNoPendingStep     = errors.New("no pending step to call")
	ErrInvalidTransition = errors.New("invalid step transition")
	ErrStepNotInProgress = errors.New("step is not in progress")
)

// QueueStepView มุมมองของ step ที่ใช้ใน response
type QueueStepView struct {
	StepOrder   int        `json:"step_order"`
	Stage       string     `json:"stage"`
	Status      string     `json:"status"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// QueueEntry คือข้อมูล visit ในคิว พร้อม patient + current step
type QueueEntry struct {
	VisitID         uint                `json:"visit_id"`
	PatientCode     string              `json:"patient_code"`
	PatientName     string              `json:"patient_name"`
	PathwayCode     string              `json:"pathway_template_code,omitempty"`
	PathwayName     string              `json:"pathway_template_name,omitempty"`
	SpecialConds    []string            `json:"special_conditions,omitempty"`
	VisitStatus     string              `json:"visit_status"`
	StartedAt       time.Time           `json:"started_at"`
	CompletedAt     *time.Time          `json:"completed_at,omitempty"`
	TotalSteps      int                 `json:"total_steps"`
	CompletedSteps  int                 `json:"completed_steps"`
	CurrentStep     *QueueStepView      `json:"current_step,omitempty"`
	AllSteps        []*model.VisitStep  `json:"steps,omitempty"`
}

// Store ห่อหุ้ม GORM สำหรับ queue operations
type Store struct {
	db *gorm.DB
}

// NewStore สร้าง store ใหม่
func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

// DB คืน *gorm.DB ดิบ (ใช้กรณีที่ handler ต้อง query นอกเหนือจาก method ของ Store)
func (s *Store) DB() *gorm.DB { return s.db }

// List คืนคิวปัจจุบัน — visits ที่ยัง active เรียงตาม started_at asc (คนมาก่อนอยู่บน)
func (s *Store) List() ([]*QueueEntry, error) {
	var visits []*model.Visit
	if err := s.db.Where("status = ?", "active").
		Order("started_at asc, id asc").
		Find(&visits).Error; err != nil {
		return nil, err
	}

	entries := make([]*QueueEntry, 0, len(visits))
	for _, v := range visits {
		entry, err := s.buildEntry(v)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

// ListAll คืนคิวทั้งหมด รวม completed (สำหรับหน้า history)
func (s *Store) ListAll(limit int) ([]*QueueEntry, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	var visits []*model.Visit
	if err := s.db.Order("started_at desc, id desc").
		Limit(limit).
		Find(&visits).Error; err != nil {
		return nil, err
	}

	entries := make([]*QueueEntry, 0, len(visits))
	for _, v := range visits {
		entry, err := s.buildEntry(v)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, nil
}

// GetEntry ดึง queue entry ตาม visit id
func (s *Store) GetEntry(visitID uint) (*QueueEntry, error) {
	var v model.Visit
	if err := s.db.First(&v, visitID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s.buildEntry(&v)
}

// buildEntry สร้าง QueueEntry จาก Visit พร้อม join patient + template + steps
func (s *Store) buildEntry(v *model.Visit) (*QueueEntry, error) {
	entry := &QueueEntry{
		VisitID:     v.ID,
		PatientCode: v.PatientCode,
		VisitStatus: v.Status,
		StartedAt:   v.StartedAt,
		CompletedAt: v.CompletedAt,
	}

	// ดึงชื่อ + special_conditions ของผู้ป่วย
	var patient model.Patient
	if err := s.db.Where("code = ?", v.PatientCode).First(&patient).Error; err == nil {
		entry.PatientName = patient.Name
		if patient.SpecialConditions != "" {
			_ = unmarshalStringArray(patient.SpecialConditions, &entry.SpecialConds)
		}
	}

	// ดึงชื่อ template
	if v.PathwayTemplateID != 0 {
		var tmpl model.PathwayTemplate
		if err := s.db.First(&tmpl, v.PathwayTemplateID).Error; err == nil {
			entry.PathwayCode = tmpl.Code
			entry.PathwayName = tmpl.Name
		}
	}

	// ดึง steps
	var steps []*model.VisitStep
	if err := s.db.Where("visit_id = ?", v.ID).
		Order("step_order").Find(&steps).Error; err != nil {
		return nil, fmt.Errorf("load steps: %w", err)
	}
	entry.AllSteps = steps
	entry.TotalSteps = len(steps)

	// หา current step = step ที่ยังไม่ completed/skipped (เอาอันแรกสุด)
	for _, step := range steps {
		if step.Status == "completed" {
			entry.CompletedSteps++
		}
		if entry.CurrentStep == nil && (step.Status == "pending" || step.Status == "in_progress") {
			entry.CurrentStep = &QueueStepView{
				StepOrder:   step.StepOrder,
				Stage:       step.Stage,
				Status:      step.Status,
				StartedAt:   step.StartedAt,
				CompletedAt: step.CompletedAt,
			}
		}
	}

	return entry, nil
}

// Call เรียกผู้ป่วยเข้าตรวจ — หา first pending step แล้ว mark เป็น in_progress
// คืน entry ที่อัปเดตแล้ว + step ที่ถูกเรียก
func (s *Store) Call(visitID uint) (*QueueEntry, *QueueStepView, error) {
	var v model.Visit
	if err := s.db.First(&v, visitID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}
	if v.Status != "active" {
		return nil, nil, fmt.Errorf("%w (status=%s)", ErrVisitNotActive, v.Status)
	}

	// ถ้ามี in_progress อยู่แล้ว = กำลังเรียกอยู่ → idempotent return ตัวเดิม
	var step model.VisitStep
	err := s.db.Where("visit_id = ? AND status = ?", visitID, "in_progress").
		Order("step_order").First(&step).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, err
	}

	now := time.Now()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		// หา pending step แรก
		if err := s.db.Where("visit_id = ? AND status = ?", visitID, "pending").
			Order("step_order").First(&step).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil, ErrNoPendingStep
			}
			return nil, nil, err
		}
		updates := map[string]any{
			"status":     "in_progress",
			"started_at": now,
		}
		if err := s.db.Model(&step).Updates(updates).Error; err != nil {
			return nil, nil, err
		}
	}
	// refresh step
	if err := s.db.First(&step, step.ID).Error; err != nil {
		return nil, nil, err
	}

	entry, err := s.GetEntry(visitID)
	if err != nil {
		return nil, nil, err
	}

	return entry, &QueueStepView{
		StepOrder:   step.StepOrder,
		Stage:       step.Stage,
		Status:      step.Status,
		StartedAt:   step.StartedAt,
		CompletedAt: step.CompletedAt,
	}, nil
}

// CompleteStep บันทึกว่าตรวจขั้นนี้เสร็จแล้ว + auto-advance ไปขั้นถัดไปอัตโนมัติ
// ถ้าเป็นขั้นสุดท้าย → mark visit เป็น completed
// คืน entry + completedStep + nextStep (nil ถ้า visit เสร็จแล้ว)
func (s *Store) CompleteStep(visitID uint, stepOrder int, performedBy, notes string) (*QueueEntry, *QueueStepView, *QueueStepView, error) {
	var step model.VisitStep
	if err := s.db.Where("visit_id = ? AND step_order = ?", visitID, stepOrder).
		First(&step).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, nil, ErrNotFound
		}
		return nil, nil, nil, err
	}
	if step.Status == "completed" || step.Status == "skipped" {
		return nil, nil, nil, fmt.Errorf("%w: step already %s", ErrInvalidTransition, step.Status)
	}

	now := time.Now()
	updates := map[string]any{
		"status":       "completed",
		"completed_at": now,
	}
	if step.StartedAt == nil {
		updates["started_at"] = now
	}
	if performedBy != "" {
		updates["performed_by"] = performedBy
	}
	if notes != "" {
		updates["notes"] = notes
	}
	if err := s.db.Model(&step).Updates(updates).Error; err != nil {
		return nil, nil, nil, err
	}
	if err := s.db.First(&step, step.ID).Error; err != nil {
		return nil, nil, nil, err
	}

	completedView := &QueueStepView{
		StepOrder:   step.StepOrder,
		Stage:       step.Stage,
		Status:      step.Status,
		StartedAt:   step.StartedAt,
		CompletedAt: step.CompletedAt,
	}

	// Auto-advance: หา pending step ถัดไป → mark เป็น in_progress
	var nextStep model.VisitStep
	err := s.db.Where("visit_id = ? AND step_order > ? AND status = ?", visitID, stepOrder, "pending").
		Order("step_order").First(&nextStep).Error

	var nextView *QueueStepView
	if err == nil {
		if err := s.db.Model(&nextStep).
			Updates(map[string]any{
				"status":     "in_progress",
				"started_at": now,
			}).Error; err != nil {
			return nil, nil, nil, err
		}
		if err := s.db.First(&nextStep, nextStep.ID).Error; err != nil {
			return nil, nil, nil, err
		}
		nextView = &QueueStepView{
			StepOrder:   nextStep.StepOrder,
			Stage:       nextStep.Stage,
			Status:      nextStep.Status,
			StartedAt:   nextStep.StartedAt,
			CompletedAt: nextStep.CompletedAt,
		}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil, nil, err
	}

	// ถ้าไม่มี next step → mark visit completed
	if nextView == nil {
		if err := s.db.Model(&model.Visit{}).
			Where("id = ?", visitID).
			Updates(map[string]any{
				"status":       "completed",
				"completed_at": now,
			}).Error; err != nil {
			return nil, nil, nil, err
		}
	}

	entry, err := s.GetEntry(visitID)
	if err != nil {
		return nil, nil, nil, err
	}

	return entry, completedView, nextView, nil
}

// SkipStep ข้ามขั้นตอนปัจจุบัน (เช่น ไม่ต้องเจาะเลือด เพราะไม่ใช่เบาหวาน)
// จะไม่ advance อัตโนมัติ — staff ต้องสั่ง call/complete เอง
func (s *Store) SkipStep(visitID uint, stepOrder int, performedBy, notes string) (*QueueEntry, *QueueStepView, error) {
	var step model.VisitStep
	if err := s.db.Where("visit_id = ? AND step_order = ?", visitID, stepOrder).
		First(&step).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, ErrNotFound
		}
		return nil, nil, err
	}
	if step.Status == "completed" || step.Status == "skipped" {
		return nil, nil, fmt.Errorf("%w: step already %s", ErrInvalidTransition, step.Status)
	}

	now := time.Now()
	updates := map[string]any{
		"status": "skipped",
	}
	if step.StartedAt == nil {
		updates["started_at"] = now
	}
	if performedBy != "" {
		updates["performed_by"] = performedBy
	}
	if notes != "" {
		updates["notes"] = notes
	}
	if err := s.db.Model(&step).Updates(updates).Error; err != nil {
		return nil, nil, err
	}
	if err := s.db.First(&step, step.ID).Error; err != nil {
		return nil, nil, err
	}

	skippedView := &QueueStepView{
		StepOrder:   step.StepOrder,
		Stage:       step.Stage,
		Status:      step.Status,
		StartedAt:   step.StartedAt,
		CompletedAt: step.CompletedAt,
	}

	entry, err := s.GetEntry(visitID)
	if err != nil {
		return nil, nil, err
	}
	return entry, skippedView, nil
}

// CompleteVisit ปิด visit (เช่น ผู้ป่วยกลับบ้าน / ยกเลิก)
// - mark visit = completed
// - mark pending/in_progress steps ที่เหลือ = completed (พร้อม timestamp เดียวกัน)
func (s *Store) CompleteVisit(visitID uint) (*QueueEntry, error) {
	var v model.Visit
	if err := s.db.First(&v, visitID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if v.Status == "completed" {
		// idempotent — คืน entry เดิม
		return s.GetEntry(visitID)
	}

	now := time.Now()
	if err := s.db.Model(&model.Visit{}).
		Where("id = ?", visitID).
		Updates(map[string]any{
			"status":       "completed",
			"completed_at": now,
		}).Error; err != nil {
		return nil, err
	}
	// mark remaining steps ที่ยังไม่เสร็จ → completed (พร้อม timestamp)
	if err := s.db.Model(&model.VisitStep{}).
		Where("visit_id = ? AND status IN ?", visitID, []string{"pending", "in_progress"}).
		Updates(map[string]any{
			"status":       "completed",
			"completed_at": now,
		}).Error; err != nil {
		return nil, err
	}

	return s.GetEntry(visitID)
}

// CancelVisit ยกเลิก visit (เช่น ผู้ป่วยขอยกเลิก)
func (s *Store) CancelVisit(visitID uint) (*QueueEntry, error) {
	var v model.Visit
	if err := s.db.First(&v, visitID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if v.Status == "cancelled" {
		return s.GetEntry(visitID)
	}

	now := time.Now()
	if err := s.db.Model(&model.Visit{}).
		Where("id = ?", visitID).
		Updates(map[string]any{
			"status":       "cancelled",
			"completed_at": now,
		}).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&model.VisitStep{}).
		Where("visit_id = ? AND status IN ?", visitID, []string{"pending", "in_progress"}).
		Updates(map[string]any{
			"status":       "skipped",
			"completed_at": now,
		}).Error; err != nil {
		return nil, err
	}

	return s.GetEntry(visitID)
}
