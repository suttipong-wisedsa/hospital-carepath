package patient

// Seed ใส่ข้อมูลผู้ป่วยตัวอย่างเข้า Store (จะไม่ทำซ้ำถ้ามีข้อมูลอยู่แล้ว)
func Seed(s *Store) {
	samples := []Patient{
		{Name: "สมชาย ใจดี", Gender: "M", Age: 45, Phone: "081-234-5678", Symptom: "ปวดท้อง"},
		{Name: "สมหญิง รักไทย", Gender: "F", Age: 30, Phone: "089-111-2222", Symptom: "ไข้สูง 39 องศา"},
		{Name: "มานี มาเยือน", Gender: "F", Age: 65, Phone: "086-555-1234", Symptom: "เจ็บแน่นหน้าอก"},
		{Name: "ปีเตอร์ ปาร์คเกอร์", Gender: "M", Age: 8, Phone: "02-123-4567", Symptom: "แขนหักจากอุบัติเหตุ"},
		{Name: "มานพ เก่งกล้า", Gender: "M", Age: 28, Phone: "062-888-9999", Symptom: "ปวดหัวไมเกรน"},
		{Name: "ปราณี สดใส", Gender: "F", Age: 52, Phone: "091-444-5555", Symptom: "เบาหวานสูง"},
		{Name: "วิชัย ใจกล้า", Gender: "M", Age: 70, Phone: "085-777-3333", Symptom: "ความดันโลหิตสูง"},
		{Name: "นภา พลังใหม่", Gender: "F", Age: 22, Phone: "094-222-1111", Symptom: "แพ้อาหาร"},
	}
	for _, p := range samples {
		s.Create(p)
	}
}
