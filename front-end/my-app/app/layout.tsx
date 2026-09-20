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
// - colorPrimary cyan/teal healthcare tone พร้อม contrast บนพื้นขาว
// - line-height ของ text สูงขึ้นเล็กน้อยเพื่ออ่านง่าย
const theme = {
  token: {
    colorPrimary: "#0e7490", // cyan-700 — calm healthcare blue
    colorInfo: "#0284c7", // sky-600
    colorSuccess: "#059669", // emerald-600
    colorWarning: "#d97706", // amber-600
    colorError: "#dc2626", // red-600
    colorText: "#17313b",
    colorTextSecondary: "#41626d",
    colorTextTertiary: "#647b83",
    colorTextDescription: "#647b83",
    colorTextPlaceholder: "#8aa1a8",
    colorBorder: "#d8eef0",
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f7fbfc",
    borderRadius: 10,
    borderRadiusLG: 16,
    fontSize: 14,
    lineHeight: 1.65, // เพิ่มจาก default 1.5 ให้อ่านง่าย
    fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
      <body className="min-h-full flex flex-col bg-background text-foreground leading-relaxed">
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
