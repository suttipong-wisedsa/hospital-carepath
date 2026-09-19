package queue

import "encoding/json"

// unmarshalStringArray แยกออกมาเพื่อให้ queue.go อ่านง่าย ไม่ต้อง import encoding/json ตรงๆ
func unmarshalStringArray(data string, out *[]string) error {
	return json.Unmarshal([]byte(data), out)
}
