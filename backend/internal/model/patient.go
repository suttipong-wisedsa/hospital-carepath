package model

import "time"

// Patient คือ model ของผู้ป่วยในฐานข้อมูล
type Patient struct {
	ID        uint      `gorm:"primaryKey" json:"-"`
	Code      string    `gorm:"type:varchar(20);uniqueIndex;not null" json:"id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Gender    string    `gorm:"type:varchar(10)" json:"gender"`
	Age       int       `json:"age"`
	Phone     string    `gorm:"type:varchar(50)" json:"phone"`
	Symptom   string    `gorm:"type:text" json:"symptom"`
	Status    string    `gorm:"type:varchar(20);not null;default:admitted" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName กำหนดชื่อตารางในฐานข้อมูล
func (Patient) TableName() string {
	return "patients"
}
