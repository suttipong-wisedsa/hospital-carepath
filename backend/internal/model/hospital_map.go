package model

import "time"

// HospitalMap เก็บผังโรงพยาบาลทั้งชุดเป็น JSON เพื่อให้แก้ไขและบันทึกแบบ atomic ได้
type HospitalMap struct {
	ID        uint      `gorm:"primaryKey" json:"-"`
	Scope     string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"-"`
	Nodes     string    `gorm:"type:jsonb;not null;default:'[]'" json:"-"`
	Edges     string    `gorm:"type:jsonb;not null;default:'[]'" json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (HospitalMap) TableName() string {
	return "hospital_maps"
}
