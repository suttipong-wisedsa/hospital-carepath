import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App as AntApp } from "antd";
import thTH from "antd/locale/th_TH";
import "./globals.css";
import { Nav } from "./components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hospital Carepath",
  description: "ระบบติดตาม Care Pathway สำหรับผู้ป่วย",
};

// ─── Theme tokens ──────────────────────────────────────────────────────────────
// ปรับให้:
// - colorText* มี contrast สูงขึ้น (เข้มขึ้น 1-2 steps)
// - colorPrimary teal-700 (เข้มขึ้นจาก 600 เพื่อ contrast ดีขึ้น)
// - line-height ของ text สูงขึ้นเล็กน้อยเพื่ออ่านง่าย
const theme = {
  token: {
    colorPrimary: "#0f766e", // teal-700 — 5.8:1 บน white (AA)
    colorInfo: "#0369a1", // sky-700
    colorSuccess: "#15803d", // green-700
    colorWarning: "#b45309", // amber-700
    colorError: "#b91c1c", // red-700 — เข้มขึ้นจาก 600
    colorText: "#18181b", // zinc-900 — body text เข้มชัด
    colorTextSecondary: "#3f3f46", // zinc-700 — secondary text
    colorTextTertiary: "#52525b", // zinc-600 — labels/captions
    colorTextDescription: "#52525b", // คำอธิบาย
    colorTextPlaceholder: "#71717a", // zinc-500
    colorBorder: "#e4e4e7", // zinc-200
    colorBgContainer: "#ffffff",
    colorBgLayout: "#fafafa", // zinc-50 — background หลัก
    borderRadius: 10,
    borderRadiusLG: 16,
    fontSize: 14,
    lineHeight: 1.65, // เพิ่มจาก default 1.5 ให้อ่านง่าย
    fontFamily:
      "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Button: {
      controlHeight: 36,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 16,
      paddingLG: 20,
    },
    Tag: {
      borderRadiusSM: 999,
      fontWeight: 500,
    },
    Typography: {
      titleMarginBottom: 12,
      titleMarginTop: 0,
    },
    Form: {
      labelFontSize: 14,
      verticalLabelPadding: "0 0 6px",
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 leading-relaxed dark:bg-zinc-950 dark:text-zinc-50">
        <AntdRegistry>
          <ConfigProvider locale={thTH} theme={theme}>
            <AntApp component={false}>
              <Nav />
              <div className="flex-1">{children}</div>
            </AntApp>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}