package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/suttipong/hospital-carepath/config"
	"github.com/suttipong/hospital-carepath/internal/model"
	"github.com/suttipong/hospital-carepath/internal/pathway"
	"github.com/suttipong/hospital-carepath/internal/patient"
	"github.com/suttipong/hospital-carepath/internal/queue"
	"github.com/suttipong/hospital-carepath/internal/visit"
)

// appConfig โหลดค่าจาก environment variable (รองรับ .env แบบง่าย)
type appConfig struct {
	port string
	db   dbConfig
}

type dbConfig struct {
	host     string
	user     string
	password string
	name     string
	port     string
}

// loadEnv อ่านไฟล์ .env ถ้ามี แล้ว merge เข้า process env
func loadEnv(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		kv := strings.SplitN(line, "=", 2)
		if len(kv) != 2 {
			continue
		}
		key := strings.TrimSpace(kv[0])
		val := strings.TrimSpace(kv[1])
		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, val)
		}
	}
	return nil
}

func loadConfig() appConfig {
	return appConfig{
		port: getenv("PORT", "8080"),
		db: dbConfig{
			host:     getenv("DB_HOST", "localhost"),
			user:     getenv("DB_USER", "postgres"),
			password: getenv("DB_PASSWORD", ""),
			name:     getenv("DB_NAME", "carepath_db"),
			port:     getenv("DB_PORT", "5432"),
		},
	}
}

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

// writeJSON ตอบกลับด้วย JSON
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// healthHandler ตรวจสอบสถานะ service
func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// rootHandler หน้าแรก
func rootHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"service": "hospital-carepath",
		"message": "ยินดีต้อนรับสู่ Hospital Carepath API",
		"version": "0.1.0",
		"endpoints": []string{
			"GET    /",
			"GET    /health",
			"POST   /patients                      - ลงทะเบียนผู้ป่วยเข้ารับบริการ",
			"GET    /patients                      - ดูรายการผู้ป่วยทั้งหมด",
			"GET    /patients/{id}                 - ดูข้อมูลผู้ป่วยตาม ID",
			"PATCH  /patients/{id}/status          - อัปเดตสถานะ (admitted/treating/discharged)",
			"PATCH  /patients/{id}/pathway         - กำหนด Care Pathway Template + special conditions (auto-create Visit+Steps)",
			"GET    /patients/{id}/pathway         - ดู pathway ปัจจุบันของผู้ป่วย",
			"GET    /patients/{code}/visits        - ดู Visit ทั้งหมดของผู้ป่วย",
			"GET    /pathway-templates             - รายการแม่แบบ Care Pathway ทั้งหมด",
			"GET    /pathway-templates/{code}      - ดูแม่แบบตาม code",
			"GET    /visits                        - รายการ Visit ทั้งหมด",
			"GET    /visits/{id}                   - ดู Visit + steps ตาม id",
			"PATCH  /visits/{id}/steps/{stepOrder} - อัปเดตสถานะ VisitStep (stepOrder=1,2,3,...)",
			"GET    /queue                         - ดูคิวปัจจุบัน (ทุก visit ที่ active)",
			"GET    /queue/{visitId}               - ดู queue entry ตาม visit id",
			"POST   /queue/{visitId}/call          - เรียกคิว (first pending step → in_progress)",
			"POST   /queue/{visitId}/steps/{stepOrder}/complete - บันทึกตรวจเสร็จ (auto-advance)",
			"POST   /queue/{visitId}/steps/{stepOrder}/skip     - ข้ามขั้นตอน",
			"POST   /queue/{visitId}/complete     - ปิด visit (mark all remaining = completed)",
			"POST   /queue/{visitId}/cancel       - ยกเลิก visit (mark all remaining = skipped)",
		},
	})
}

func main() {
	// โหลด .env จาก parent directory ถ้ามี (ไม่ fail ถ้าไม่เจอ)
	if err := loadEnv("../.env"); err != nil {
		log.Printf("info: ไม่พบไฟล์ .env (%v) — ใช้ค่า default", err)
	}

	cfg := loadConfig()

	// เชื่อมต่อฐานข้อมูล (GORM)
	config.ConnectDB()

	// สร้าง/อัปเดตตารางจาก model
	if err := config.DB.AutoMigrate(
		&model.Patient{},
		&model.PathwayTemplate{},
		&model.Visit{},
		&model.VisitStep{},
	); err != nil {
		log.Fatalf("db migrate error: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", rootHandler)
	mux.HandleFunc("/health", healthHandler)

	// ลงทะเบียน patient routes (ใช้ GORM ต่อ DB จริง)
	patientStore := patient.NewStore(config.DB)

	// Pathway templates
	pathwayStore := pathway.NewStore(config.DB)
	if err := pathway.Seed(pathwayStore); err != nil {
		log.Fatalf("pathway seed error: %v", err)
	}
	pathwayHandler := pathway.NewHandler(pathwayStore)
	pathwayHandler.Register(mux)

	// Visits (auto-create + tracking steps)
	visitStore := visit.NewStore(config.DB)
	visitHandler := visit.NewHandler(visitStore)
	visitHandler.Register(mux)

	// Queue (call / complete-step / skip / close visit)
	queueStore := queue.NewStore(config.DB)
	queueHandler := queue.NewHandler(queueStore)
	queueHandler.Register(mux)

	patientHandler := patient.NewHandler(patientStore, pathwayStore, visitStore, config.DB)
	patientHandler.Register(mux)

	addr := fmt.Sprintf(":%s", cfg.port)
	log.Printf("Hospital Carepath API listening on http://localhost%s", addr)
	log.Printf("DB -> %s@%s:%s/%s", cfg.db.user, cfg.db.host, cfg.db.port, cfg.db.name)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
