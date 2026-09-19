package model

import "time"

// PathwayTemplate คือแม่แบบของ Care Pathway ที่กำหนดลำดับขั้นตอนที่ผู้ป่วยต้องผ่าน
// Stages เก็บเป็น JSON string (เช่น `["registration","vitals","consultation"]`)
// เพื่อให้ Query/Update ง่ายและไม่ต้องสร้างตารางย่อย
type PathwayTemplate struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Code        string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Stages      string    `gorm:"type:jsonb;not null;default:'[]'" json:"stages"` // JSON array of strings
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName กำหนดชื่อตาราง
func (PathwayTemplate) TableName() string {
	return "pathway_templates"
}
