package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB เป็นตัวแปร Global ที่ใช้เรียก Database จากส่วนอื่นๆ ของโปรเจกต์
var DB *gorm.DB

// ConnectDB เชื่อมต่อฐานข้อมูล PostgreSQL ผ่าน GORM
// อ่านค่า host/user/password/dbname/port จากไฟล์ .env
func ConnectDB() {
	// โหลด .env (ลองหลาย path เผื่อรันจาก backend/ หรือ root)
	for _, path := range []string{".env", "../.env", "../../.env"} {
		if _, err := os.Stat(path); err == nil {
			if err := godotenv.Load(path); err == nil {
				log.Printf("info: โหลด %s สำเร็จ", path)
			}
		}
	}

	host := getenv("DB_HOST", "localhost")
	user := getenv("DB_USER", "postgres")
	password := getenv("DB_PASSWORD", "secret")
	dbname := getenv("DB_NAME", "carepath_db")
	port := getenv("DB_PORT", "5432")

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Bangkok",
		host, user, password, dbname, port,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	DB = db
	log.Println("Database connected successfully!")
}

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
