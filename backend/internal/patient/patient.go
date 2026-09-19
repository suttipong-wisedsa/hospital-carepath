package patient

import (
	"errors"
	"fmt"

	"github.com/suttipong/hospital-carepath/internal/model"
	"gorm.io/gorm"
)

// Status ของผู้ป่วยในระบบ
const (
	StatusAdmitted   = "admitted"
	StatusTreating   = "treating"
	StatusDischarged = "discharged"
)

var validStatuses = map[string]struct{}{
	StatusAdmitted:   {},
	StatusTreating:   {},
	StatusDischarged: {},
}

// ErrNotFound ใช้เมื่อไม่พบผู้ป่วย
var ErrNotFound = errors.New("patient not found")

// Store ห่อหุ้ม GORM สำหรับตาราง patients
type Store struct {
	db *gorm.DB
}

// NewStore สร้าง store ใหม่จาก *gorm.DB
func NewStore(db *gorm.DB) *Store {
	return &Store{db: db}
}

// Count นับจำนวนผู้ป่วย (ใช้ตอน seed)
func (s *Store) Count() (int64, error) {
	var n int64
	err := s.db.Model(&model.Patient{}).Count(&n).Error
	return n, err
}

// Create ลงทะเบียนผู้ป่วยใหม่ (auto-generate code P0001, P0002, ...)
func (s *Store) Create(p *model.Patient) (*model.Patient, error) {
	if p.Status == "" {
		p.Status = StatusAdmitted
	}

	// หา code ถัดไปจาก MAX(code)
	var maxCode string
	err := s.db.Model(&model.Patient{}).
		Select("COALESCE(MAX(code), '')").
		Scan(&maxCode).Error
	if err != nil {
		return nil, fmt.Errorf("query max code: %w", err)
	}
	next := 1
	if maxCode != "" {
		var n int
		if _, err := fmt.Sscanf(maxCode[1:], "%d", &n); err == nil {
			next = n + 1
		}
	}
	p.Code = fmt.Sprintf("P%04d", next)

	if err := s.db.Create(p).Error; err != nil {
		return nil, fmt.Errorf("insert patient: %w", err)
	}
	return p, nil
}

// Get ดึงข้อมูลผู้ป่วยตาม code (เช่น P0001)
func (s *Store) Get(code string) (*model.Patient, error) {
	var p model.Patient
	err := s.db.Where("code = ?", code).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// List คืนรายการผู้ป่วยทั้งหมด เรียงตาม code
func (s *Store) List() ([]*model.Patient, error) {
	var patients []*model.Patient
	err := s.db.Order("code").Find(&patients).Error
	if err != nil {
		return nil, err
	}
	return patients, nil
}

// UpdateStatus อัปเดตสถานะผู้ป่วย
func (s *Store) UpdateStatus(code, status string) (*model.Patient, error) {
	if _, ok := validStatuses[status]; !ok {
		return nil, errors.New("invalid status")
	}
	res := s.db.Model(&model.Patient{}).
		Where("code = ?", code).
		Update("status", status)
	if res.Error != nil {
		return nil, res.Error
	}
	if res.RowsAffected == 0 {
		return nil, ErrNotFound
	}
	return s.Get(code)
}
