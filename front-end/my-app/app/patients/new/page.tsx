"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Card,
  App,
} from "antd";
import {
  UserAddOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { createPatient, type Patient } from "../../lib/api";

type Gender = "M" | "F" | "other" | "";

interface FormValues {
  name: string;
  gender?: Gender;
  age?: number;
  phone?: string;
  symptom?: string;
}

export default function NewPatientPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Patient | null>(null);

  async function handleSubmit(values: FormValues) {
    setSubmitting(true);
    setCreated(null);
    try {
      const patient = await createPatient({
        name: values.name.trim(),
        gender: values.gender || undefined,
        age: values.age,
        phone: values.phone?.trim() || undefined,
        symptom: values.symptom?.trim() || undefined,
      });
      setCreated(patient);
      message.success("ลงทะเบียนผู้ป่วยสำเร็จ");
      form.resetFields();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาด"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-teal-400">
          Hospital Carepath · Frontend
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ลงทะเบียนผู้ป่วยใหม่
        </h1>
        <p className="mt-3 text-base text-zinc-700 dark:text-zinc-300">
          กรอกข้อมูลด้านล่างแล้วกดบันทึก — ระบบจะ POST ไปยัง{" "}
          <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-sm font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            POST /patients
          </code>
        </p>
      </header>

      <Card styles={{ body: { padding: 24 } }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={submitting}
          requiredMark="optional"
        >
          <Form.Item
            label="ชื่อ-นามสกุล"
            name="name"
            rules={[{ required: true, message: "กรุณากรอกชื่อ" }]}
          >
            <Input
              size="large"
              placeholder="เช่น สมชาย ใจดี"
              autoFocus
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item label="เพศ" name="gender">
              <Select
                size="large"
                placeholder="— ไม่ระบุ —"
                allowClear
                options={[
                  { value: "M", label: "ชาย" },
                  { value: "F", label: "หญิง" },
                  { value: "other", label: "อื่นๆ" },
                ]}
              />
            </Form.Item>

            <Form.Item label="อายุ" name="age">
              <InputNumber
                size="large"
                min={0}
                max={150}
                placeholder="35"
                className="w-full!"
              />
            </Form.Item>
          </div>

          <Form.Item label="เบอร์โทร" name="phone">
            <Input
              size="large"
              type="tel"
              placeholder="เช่น 081-234-5678"
            />
          </Form.Item>

          <Form.Item label="อาการเบื้องต้น" name="symptom">
            <Input.TextArea
              rows={3}
              placeholder="เช่น ปวดหัว มีไข้ 2 วัน"
            />
          </Form.Item>

          <Form.Item className="mb-0!">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              icon={<UserAddOutlined />}
              loading={submitting}
            >
              ลงทะเบียนผู้ป่วย
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* success card */}
      {created && (
        <Card
          className="mt-6 border-emerald-300! bg-emerald-50! dark:border-emerald-900 dark:bg-emerald-950!"
          styles={{ body: { padding: 20 } }}
        >
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-100">
            <CheckCircleOutlined style={{ fontSize: 20 }} />
            <p className="text-lg font-semibold">ลงทะเบียนสำเร็จ</p>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-emerald-700 dark:text-emerald-400">
              รหัสผู้ป่วย
            </dt>
            <dd className="font-mono font-semibold text-emerald-900 dark:text-emerald-50">
              {created.id}
            </dd>
            <dt className="text-emerald-700 dark:text-emerald-400">ชื่อ</dt>
            <dd className="font-semibold text-emerald-900 dark:text-emerald-50">
              {created.name}
            </dd>
            <dt className="text-emerald-700 dark:text-emerald-400">สถานะ</dt>
            <dd className="font-medium text-emerald-900 dark:text-emerald-50">
              {created.status}
            </dd>
          </dl>
          <div className="mt-4 flex gap-2">
            <Link href={`/patient/${created.id}/pathway`}>
              <Button type="primary" icon={<ArrowRightOutlined />}>
                ไปเลือก Care Pathway Template
              </Button>
            </Link>
            <Link href={`/patient/${created.id}`}>
              <Button>ดูรายละเอียด</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* footer */}
      <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm font-medium">
        <Link
          href="/patient"
          className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 dark:text-teal-400"
        >
          <ArrowLeftOutlined /> ดูรายการผู้ป่วยทั้งหมด
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          <HomeOutlined /> หน้าแรก
        </Link>
      </div>

      <p className="mt-6 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
        หากเจอ CORS error ตอนรัน ให้เปิด CORS middleware ที่ backend หรือใช้
        Next.js proxy
      </p>
    </main>
  );
}
