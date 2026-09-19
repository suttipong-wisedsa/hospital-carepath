package model

import "time"

// Visit คือการมารับบริการครั้งหนึ่งของผู้ป่วย (สร้างอัตโนมัติเมื่อกำหนด pathway template)
// หนึ่งผู้ป่วยสามารถมีได้หลาย Visit (เช่น re-admission, follow-up ครั้งถัดไป)
type Visit struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	PatientCode       string     `gorm:"type:varchar(20);not null;index" json:"patient_code"`
	PathwayTemplateID uint       `gorm:"not null;index" json:"pathway_template_id"`
	Status            string     `gorm:"type:varchar(20);not null;default:'active'" json:"status"` // active | completed | cancelled
	StartedAt         time.Time  `gorm:"not null;default:now()" json:"started_at"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func (Visit) TableName() string { return "visits" }
