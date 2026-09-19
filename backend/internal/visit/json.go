package visit

import "encoding/json"

// jsonUnmarshal แยกออกมาเพื่อให้ไฟล์ visit.go อ่านง่าย ไม่ต้อง import encoding/json ตรงๆ
func jsonUnmarshal(data []byte, v any) error {
	return json.Unmarshal(data, v)
}
