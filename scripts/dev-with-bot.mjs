#!/usr/bin/env node
/**
 * PAKDEE Unified Launcher: Next.js Server + Cloudflare Tunnel + LINE Auto-Webhook Sync
 *
 * Usage:
 *   node scripts/dev-with-bot.mjs --mode dev --port 3000
 *   node scripts/dev-with-bot.mjs --mode start --port 3000
 *   node scripts/dev-with-bot.mjs --tunnel-only --port 3000
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execSync } from "node:child_process";

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const MODE = getArg("--mode", "dev");
const PORT = Number(getArg("--port", process.env.PORT || "3000"));
const TARGET_HOST = getArg("--target-host", "127.0.0.1");
const TUNNEL_ONLY = args.includes("--tunnel-only");

const ROOT_DIR = process.cwd();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const envConfig = {
  ...loadEnvFile(path.join(ROOT_DIR, ".env")),
  ...loadEnvFile(path.join(ROOT_DIR, ".env.local")),
  ...process.env,
};

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254.")) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

async function resolveLineToken() {
  if (envConfig.LINE_CHANNEL_ACCESS_TOKEN?.trim()) {
    return envConfig.LINE_CHANNEL_ACCESS_TOKEN.trim();
  }

  const sbUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const res = await fetch(`${sbUrl}/rest/v1/branch_settings?select=line_channel_access_token&limit=5`, {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      });
      if (res.ok) {
        const rows = await res.json();
        const found = rows.find((r) => r.line_channel_access_token && r.line_channel_access_token.trim() !== "");
        if (found) return found.line_channel_access_token.trim();
      }
    } catch {
      // Ignore network fallback error
    }
  }
  return "";
}

async function waitForLocalServer(url, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${url}/api/line/webhook`, { method: "GET" });
      if (res.ok) return true;
    } catch {
      // Server still booting
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function syncLineWebhook(webhookUrl) {
  const token = await resolveLineToken();
  if (!token) {
    console.warn("\n[AUTO-BOT] ⚠️ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local กรุณานำ Webhook URL ไปวางใน LINE Developers Console เอง:");
    console.warn(`           ${webhookUrl}\n`);
    return;
  }

  try {
    const putRes = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint: webhookUrl }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error(`[AUTO-BOT] ❌ อัปเดต Webhook ไปยัง LINE API ไม่สำเร็จ (${putRes.status}): ${errText}`);
      return;
    }

    // Retry LINE webhook verification test to allow trycloudflare DNS propagation
    for (let attempt = 1; attempt <= 6; attempt++) {
      await new Promise((r) => setTimeout(r, attempt === 1 ? 2500 : 3000));
      const testRes = await fetch("https://api.line.me/v2/bot/channel/webhook/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: webhookUrl }),
      });

      if (testRes.ok) {
        const result = await testRes.json();
        if (result.success && result.statusCode === 200) {
          const lanIp = getLanIp();
          console.log("\n================================================================================");
          console.log("  ✅ PAKDEE SERVER + LINE BOT WEBHOOK ONLINE!");
          console.log("================================================================================");
          console.log(`  🌐 Local / LAN Web : http://${lanIp}:${PORT}`);
          console.log(`  🤖 LINE Webhook URL: ${webhookUrl}`);
          console.log("  🔗 LINE Developers : Synced & Verified (HTTP 200 OK)");
          console.log("================================================================================\n");
          return;
        }
      }
      console.log(`[AUTO-BOT] ⏳ รอ DNS propagation เพื่อทดสอบ LINE Webhook (ครั้งที่ ${attempt}/6)...`);
    }

    console.warn(`[AUTO-BOT] ⚠️ อัปเดต Webhook URL ไปยัง LINE แล้ว (${webhookUrl}) แต่การทดสอบยังรอ DNS ทำงานสักครู่`);
  } catch (err) {
    console.error("[AUTO-BOT] ❌ เกิดข้อผิดพลาดในการเชื่อมต่อ LINE API:", err.message);
  }
}

const children = [];
let shuttingDown = false;

function killTree(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  } catch {
    // Process may already be exited
  }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[AUTO-BOT] กำลังปิดระบบ Next.js และ Cloudflare Tunnel อย่างปลอดภัย...");
  for (const child of children) {
    killTree(child);
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  const localTarget = `http://${TARGET_HOST}:${PORT}`;

  if (!TUNNEL_ONLY) {
    const nextCmd = MODE === "start" ? "start" : "dev";
    console.log(`[AUTO-BOT] 🚀 กำลังเริ่ม Next.js (${nextCmd}) บนพอร์ต ${PORT}...`);
    const nextProc = spawn("npx", ["next", nextCmd, "-p", String(PORT), "-H", "0.0.0.0"], {
      cwd: ROOT_DIR,
      stdio: "inherit",
      shell: true,
    });
    children.push(nextProc);
    nextProc.on("exit", (code) => {
      if (!shuttingDown) {
        console.log(`[AUTO-BOT] Next.js หยุดทำงาน (code ${code})`);
        shutdown();
      }
    });

    console.log(`[AUTO-BOT] ⏳ รอให้เว็บเซิร์ฟเวอร์ ${localTarget} พร้อมใช้งาน...`);
    const ready = await waitForLocalServer(localTarget);
    if (!ready) {
      console.error(`[AUTO-BOT] ❌ เซิร์ฟเวอร์ ${localTarget} ไม่ตอบสนองภายในเวลาที่กำหนด`);
      shutdown();
      return;
    }
  } else {
    console.log(`[AUTO-BOT] 🔎 ตรวจสอบปลายทาง ${localTarget}/api/line/webhook ...`);
    const ready = await waitForLocalServer(localTarget, 5);
    if (!ready) {
      console.warn(`[AUTO-BOT] ⚠️ ไม่พบเซิร์ฟเวอร์ที่ ${localTarget} กำลังเปิดท่อส่งสัญญาณรอไว้...`);
    }
  }

  const namedToken = envConfig.CLOUDFLARE_TUNNEL_TOKEN?.trim();
  const cfArgs = namedToken
    ? ["--yes", "cloudflared", "tunnel", "--no-autoupdate", "run", "--token", namedToken]
    : ["--yes", "cloudflared", "tunnel", "--url", localTarget];

  console.log(`[AUTO-BOT] 🌐 กำลังเปิด Cloudflare Tunnel ไปยัง ${localTarget} ...`);
  const cfProc = spawn("npx", cfArgs, {
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  children.push(cfProc);

  let syncedUrl = "";
  let registeredConnection = false;

  const handleCfOutput = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    if (!namedToken) {
      const match = text.match(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/i);
      if (match && !syncedUrl) {
        syncedUrl = `${match[0]}/api/line/webhook`;
      }
      if (text.includes("Registered tunnel connection") && syncedUrl && !registeredConnection) {
        registeredConnection = true;
        syncLineWebhook(syncedUrl);
      }
    }
  };

  cfProc.stdout?.on("data", handleCfOutput);
  cfProc.stderr?.on("data", handleCfOutput);

  cfProc.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`[AUTO-BOT] ⚠️ Cloudflare Tunnel ปิดตัวลง (code ${code})`);
      if (TUNNEL_ONLY) shutdown();
    }
  });
}

main().catch((err) => {
  console.error("[AUTO-BOT] Fatal error:", err);
  shutdown();
});
