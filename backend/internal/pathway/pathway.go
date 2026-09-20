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

// Insert สร้าง template ใหม่
func (s *Store) Insert(t *model.PathwayTemplate) error {
	return s.db.Create(t).Error
}

// Update อัปเดต template ที่มีอยู่ (ใช้ row เดิม — ต้องมี ID)
func (s *Store) Update(t *model.PathwayTemplate) error {
	return s.db.Save(t).Error
}

// ParseStages แปลง JSON string ของ Stages ให้เป็น []string (ชื่อ stage อย่างเดียว)
// รองรับทั้ง format เก่า ["a","b"] และใหม่ [{"name":"a","node_id":"n1"}, ...]
// ใช้ตอนส่งให้ client เพื่อให้ได้ array ของชื่อ stage พร้อมใช้
func ParseStages(stages string) []string {
	out := []string{}
	if stages == "" {
		return out
	}
	// ลอง []string ก่อน
	var asStrings []string
	if err := json.Unmarshal([]byte(stages), &asStrings); err == nil {
		return asStrings
	}
	// ลอง []struct{name, node_id}
	var asStructs []struct {
		Name   string `json:"name"`
		NodeID string `json:"node_id"`
	}
	if err := json.Unmarshal([]byte(stages), &asStructs); err == nil {
		for _, s := range asStructs {
			out = append(out, s.Name)
		}
		return out
	}
	return out
}

// Seed ใส่ template เริ่มต้นถ้ายังไม่มี (idempotent — รันซ้ำได้)
//
// stage format ใหม่: [{"name":"...","node_id":"..."}, ...]
// node_id อ้างอิง MapNode.id ใน HospitalMap (n1, n2, ..., n8 ตามที่ MapEditor seed)
// ถ้า stage ไม่ตรงกับห้องจริง ก็ปล่อย node_id ว่างไว้ก็ได้ — ระบบจะคำนวณระยะเฉพาะ stage ที่ผูก node
func Seed(s *Store) error {
	templates := []model.PathwayTemplate{
		{
			Code:        "general_checkup",
			Name:        "ตรวจสุขภาพทั่วไป",
			Description: "ลำดับขั้นตอนสำหรับผู้ป่วยที่มาตรวจสุขภาพทั่วไป ไม่มีโรคประจำตัว",
			Stages: `[
				{"name":"registration","node_id":"n7"},
				{"name":"vitals_check","node_id":"n5"},
				{"name":"waiting","node_id":"n6"},
				{"name":"in_consultation","node_id":"n1"},
				{"name":"pharmacy","node_id":"n3"},
				{"name":"discharge","node_id":"n7"}
			]`,
		},
		{
			Code:        "diabetic_followup",
			Name:        "ติดตามผู้ป่วยเบาหวาน",
			Description: "สำหรับผู้ป่วยเบาหวานที่มาติดตามอาการ ต้องเจาะน้ำตาลและตรวจเท้า",
			Stages: `[
				{"name":"registration","node_id":"n7"},
				{"name":"vitals_check","node_id":"n5"},
				{"name":"blood_test","node_id":"n1"},
				{"name":"foot_exam","node_id":"n1"},
				{"name":"in_consultation","node_id":"n1"},
				{"name":"pharmacy","node_id":"n3"},
				{"name":"discharge","node_id":"n7"}
			]`,
		},
		{
			Code:        "emergency",
			Name:        "ผู้ป่วยฉุกเฉิน",
			Description: "สำหรับผู้ป่วยฉุกเฉิน ต้องประเมินความรุนแรงก่อน",
			Stages: `[
				{"name":"triage","node_id":"n5"},
				{"name":"vitals_check","node_id":"n5"},
				{"name":"emergency_room","node_id":"n1"},
				{"name":"in_consultation","node_id":"n1"},
				{"name":"observation","node_id":"n6"},
				{"name":"discharge","node_id":"n7"}
			]`,
		},
		{
			Code:        "antenatal",
			Name:        "ฝากครรภ์",
			Description: "สำหรับหญิงตั้งครรภ์มาตรวจครรภ์ตามนัด",
			Stages: `[
				{"name":"registration","node_id":"n7"},
				{"name":"vitals_check","node_id":"n5"},
				{"name":"weight_check","node_id":"n5"},
				{"name":"ultrasound","node_id":"n1"},
				{"name":"in_consultation","node_id":"n1"},
				{"name":"vaccination","node_id":"n3"},
				{"name":"discharge","node_id":"n7"}
			]`,
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
