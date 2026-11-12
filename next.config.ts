import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  allowedDevOrigins: [
    "192.168.7.126",
    "192.168.7.126:3000",
    "192.168.7.126:3001",
    "192.168.7.127",
    "192.168.7.127:3000",
    "192.168.7.127:3001",
    "localhost",
    "localhost:3000",
    "localhost:3001",
    "127.0.0.1",
    "127.0.0.1:3000",
    "127.0.0.1:3001",
    "0.0.0.0",
    "0.0.0.0:3000",
    "0.0.0.0:3001",
    // Cloudflare quick tunnel (ที่อยู่เปลี่ยนทุกครั้ง) — ให้หน้าเซ็นสัญญาที่ผู้เช่าเปิดจาก LINE โหลด JavaScript ได้ตอน npm run dev
    "*.trycloudflare.com",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/branches", destination: "/" },
      { source: "/dashboard", destination: "/" },
      { source: "/rooms", destination: "/" },
      { source: "/room-grid", destination: "/" },
      { source: "/daily", destination: "/" },
      { source: "/meter", destination: "/" },
      { source: "/invoices", destination: "/" },
      { source: "/slips", destination: "/" },
      { source: "/receipts", destination: "/" },
      { source: "/tenants", destination: "/" },
      { source: "/contracts", destination: "/" },
      { source: "/leases", destination: "/" },
      { source: "/checkout", destination: "/" },
      { source: "/cleaning", destination: "/" },
      { source: "/repairs", destination: "/" },
      { source: "/accounting", destination: "/" },
      { source: "/reports", destination: "/" },
      { source: "/broadcast", destination: "/" },
      { source: "/settings", destination: "/" },
    ];
  },
};

export default nextConfig;
