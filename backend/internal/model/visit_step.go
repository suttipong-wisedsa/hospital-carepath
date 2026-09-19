package model

import "time"

// VisitStep คือขั้นตอนย่อยหนึ่งของ Visit (เช่น vitals_check, waiting, in_consultation)
// สร้างอัตโนมัติครั้งละ 1 record ต่อ stage ใน template
type VisitStep struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	VisitID     uint       `gorm:"not null;uniqueIndex:idx_visit_order" json:"visit_id"`
	StepOrder   int        `gorm:"not null;uniqueIndex:idx_visit_order" json:"step_order"`
	Stage       string     `gorm:"type:varchar(50);not null" json:"stage"`
	Status      string     `gorm:"type:varchar(20);not null;default:'pending'" json:"status"` // pending | in_progress | completed | skipped
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	PerformedBy *string    `gorm:"type:varchar(100)" json:"performed_by,omitempty"`
	Notes       *string    `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (VisitStep) TableName() string { return "visit_steps" }
