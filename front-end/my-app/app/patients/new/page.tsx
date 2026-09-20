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

type Gender ="M" |"F" |"other" |"";

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
        <p className="text-xs font-semibold tracking-widest uppercase text-teal-700">
          Hospital Carepath · Frontend
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          ลงทะเบียนผู้ป่วยใหม่
        </h1>
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
            rules={[{ required: true, message:"กรุณากรอกชื่อ" }]}
          >
            <Input
              size="large"
              autoFocus
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item label="เพศ" name="gender">
              <Select
                size="large"
                allowClear
                options={[
                  { value:"M", label: "ชาย" },
                  { value:"F", label: "หญิง" },
                  { value:"other", label: "อื่นๆ" },
                ]}
              />
            </Form.Item>

            <Form.Item label="อายุ" name="age">
              <InputNumber
                size="large"
                min={0}
                max={150}
                className="w-full!"
              />
            </Form.Item>
          </div>

          <Form.Item label="เบอร์โทร" name="phone">
            <Input
              size="large"
              type="tel"
            />
          </Form.Item>

          <Form.Item label="อาการเบื้องต้น" name="symptom">
            <Input.TextArea
              rows={3}
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
          className="mt-6 border-emerald-300! bg-emerald-50!"
          styles={{ body: { padding: 20 } }}
        >
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircleOutlined style={{ fontSize: 20 }} />
            <p className="text-lg font-semibold">ลงทะเบียนสำเร็จ</p>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-semibold text-emerald-700">
              รหัสผู้ป่วย
            </dt>
            <dd className="font-mono font-bold text-emerald-900">
              {created.id}
            </dd>
            <dt className="font-semibold text-emerald-700">ชื่อ</dt>
            <dd className="font-bold text-emerald-900">
              {created.name}
            </dd>
            <dt className="font-semibold text-emerald-700">สถานะ</dt>
            <dd className="font-bold text-emerald-900">
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
          className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900"
        >
          <ArrowLeftOutlined /> ดูรายการผู้ป่วยทั้งหมด
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-900"
        >
          <HomeOutlined /> หน้าแรก
        </Link>
      </div>
    </main>
  );
}
