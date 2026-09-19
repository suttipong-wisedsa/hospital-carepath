package patient

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

// Status ของผู้ป่วยในระบบ
const (
	StatusAdmitted   = "admitted"   // ลงทะเบียนเข้ารับบริการ
	StatusTreating   = "treating"   // กำลังรักษา
	StatusDischarged = "discharged" // จำหน่าย/ออกจากการรักษา
)

var validStatuses = map[string]struct{}{
	StatusAdmitted:   {},
	StatusTreating:   {},
	StatusDischarged: {},
}

// Patient คือข้อมูลผู้ป่วยที่ลงทะเบียนเข้ารับบริการ
type Patient struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Gender    string    `json:"gender"`
	Age       int       `json:"age"`
	Phone     string    `json:"phone"`
	Symptom   string    `json:"symptom"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ErrNotFound ใช้เมื่อไม่พบผู้ป่วย
var ErrNotFound = errors.New("patient not found")

// Store เก็บข้อมูลผู้ป่วยในหน่วยความจำ (thread-safe)
type Store struct {
	mu       sync.RWMutex
	patients map[string]*Patient
	nextID   int
}

// NewStore สร้าง store ใหม่
func NewStore() *Store {
	return &Store{
		patients: make(map[string]*Patient),
		nextID:   1,
	}
}

// Create ลงทะเบียนผู้ป่วยใหม่
func (s *Store) Create(p Patient) *Patient {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	id := formatID(s.nextID)
	s.nextID++

	p.ID = id
	if p.Status == "" {
		p.Status = StatusAdmitted
	}
	p.CreatedAt = now
	p.UpdatedAt = now

	stored := p
	s.patients[id] = &stored
	return &stored
}

// Get ดึงข้อมูลผู้ป่วยตาม ID
func (s *Store) Get(id string) (*Patient, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	p, ok := s.patients[id]
	if !ok {
		return nil, ErrNotFound
	}
	copy := *p
	return &copy, nil
}

// List คืนรายการผู้ป่วยทั้งหมด
func (s *Store) List() []*Patient {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*Patient, 0, len(s.patients))
	for _, p := range s.patients {
		copy := *p
		out = append(out, &copy)
	}
	return out
}

// UpdateStatus อัปเดตสถานะผู้ป่วย
func (s *Store) UpdateStatus(id, status string) (*Patient, error) {
	if _, ok := validStatuses[status]; !ok {
		return nil, errors.New("invalid status")
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.patients[id]
	if !ok {
		return nil, ErrNotFound
	}
	p.Status = status
	p.UpdatedAt = time.Now()
	copy := *p
	return &copy, nil
}

func formatID(n int) string {
	// P0001, P0002, ...
	return fmt.Sprintf("P%04d", n)
}
