package pathway

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/suttipong/hospital-carepath/internal/model"
	"gorm.io/gorm"
)

// Store ห่อหุ้ม GORM สำหรับตาราง pathway_templates
type Store struct {
	db *gorm.DB
}

// NewStore สร้าง store ใหม่
func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

// ErrNotFound ใช้เมื่อไม่พบ template
var ErrNotFound = errors.New("pathway template not found")

// List คืนรายการ template ทั้งหมด
func (s *Store) List() ([]*model.PathwayTemplate, error) {
	var ts []*model.PathwayTemplate
	if err := s.db.Order("id").Find(&ts).Error; err != nil {
		return nil, err
	}
	return ts, nil
}

// GetByCode ดึง template ตาม code (เช่น "general_checkup")
func (s *Store) GetByCode(code string) (*model.PathwayTemplate, error) {
	var t model.PathwayTemplate
	if err := s.db.Where("code = ?", code).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

// GetByID ดึง template ตาม id
func (s *Store) GetByID(id uint) (*model.PathwayTemplate, error) {
	var t model.PathwayTemplate
	if err := s.db.First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

// ParseStages แปลง JSON string ของ Stages ให้เป็น []string
// ใช้ตอนส่งให้ client เพื่อให้ได้ array พร้อมใช้
func ParseStages(stages string) []string {
	out := []string{}
	if stages == "" {
		return out
	}
	if err := json.Unmarshal([]byte(stages), &out); err != nil {
		return out
	}
	return out
}

// Seed ใส่ template เริ่มต้นถ้ายังไม่มี (idempotent — รันซ้ำได้)
func Seed(s *Store) error {
	templates := []model.PathwayTemplate{
		{
			Code:        "general_checkup",
			Name:        "ตรวจสุขภาพทั่วไป",
			Description: "ลำดับขั้นตอนสำหรับผู้ป่วยที่มาตรวจสุขภาพทั่วไป ไม่มีโรคประจำตัว",
			Stages:      `["registration","vitals_check","waiting","in_consultation","pharmacy","discharge"]`,
		},
		{
			Code:        "diabetic_followup",
			Name:        "ติดตามผู้ป่วยเบาหวาน",
			Description: "สำหรับผู้ป่วยเบาหวานที่มาติดตามอาการ ต้องเจาะน้ำตาลและตรวจเท้า",
			Stages:      `["registration","vitals_check","blood_test","foot_exam","in_consultation","pharmacy","discharge"]`,
		},
		{
			Code:        "emergency",
			Name:        "ผู้ป่วยฉุกเฉิน",
			Description: "สำหรับผู้ป่วยฉุกเฉิน ต้องประเมินความรุนแรงก่อน",
			Stages:      `["triage","vitals_check","emergency_room","in_consultation","observation","discharge"]`,
		},
		{
			Code:        "antenatal",
			Name:        "ฝากครรภ์",
			Description: "สำหรับหญิงตั้งครรภ์มาตรวจครรภ์ตามนัด",
			Stages:      `["registration","vitals_check","weight_check","ultrasound","in_consultation","vaccination","discharge"]`,
		},
	}

	for _, t := range templates {
		// ตรวจว่ามี code นี้แล้วหรือยัง
		existing, err := s.GetByCode(t.Code)
		if err != nil && !errors.Is(err, ErrNotFound) {
			return fmt.Errorf("seed check %s: %w", t.Code, err)
		}
		if existing != nil {
			// มีอยู่แล้ว — ข้าม
			continue
		}
		if err := s.db.Create(&t).Error; err != nil {
			return fmt.Errorf("seed insert %s: %w", t.Code, err)
		}
	}
	return nil
}
