#!/usr/bin/env node
/**
 * PAKDEE Unified Launcher: Next.js Server + Cloudflare Tunnel + LINE Auto-Webhook Sync
 *
 * Automatically launched by `npm run dev` and `npm run start`.
 * Optional flags:
 *   --mode dev|start   (default: dev)
 *   --port 3000        (default: 3000 or PORT env)
 *   --target-host IP   (default: 127.0.0.1)
 *   --tunnel-only      (attach tunnel & LINE webhook to an already-running server)
 *   --no-line-sync     (skip updating LINE Developers webhook endpoint)
 *   --restart          (terminate an existing local listener on --port before starting)
 */

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
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
const NO_LINE_SYNC = args.includes("--no-line-sync");
const FORCE_RESTART = args.includes("--restart");

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
    for (const netInfo of nets[name] || []) {
      if (netInfo.family === "IPv4" && !netInfo.internal && !netInfo.address.startsWith("169.254.")) {
        return netInfo.address;
      }
    }
  }
  return "127.0.0.1";
}

function isPortOpen(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function resolveLineTokens() {
  const tokens = new Set();
  if (envConfig.LINE_CHANNEL_ACCESS_TOKEN?.trim()) {
    tokens.add(envConfig.LINE_CHANNEL_ACCESS_TOKEN.trim());
  }

  const sbUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (sbUrl && sbKey) {
    try {
      const res = await fetch(`${sbUrl}/rest/v1/branch_settings?select=line_channel_access_token&limit=20`, {
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      });
      if (res.ok) {
        const rows = await res.json();
        for (const r of Array.isArray(rows) ? rows : []) {
          if (r.line_channel_access_token && r.line_channel_access_token.trim() !== "") {
            tokens.add(r.line_channel_access_token.trim());
          }
        }
      }
    } catch {
      // Ignore Supabase network error and fall back to manual URL warning
    }
  }
  return Array.from(tokens);
}

async function waitForLocalServer(url, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${url}/api/line/webhook`, { method: "GET" });
      if (res.ok) return true;
    } catch {
      // Server still starting
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function syncSingleTokenWebhook(token, webhookUrl) {
  console.log(`[AUTO-BOT] ⏳ กำลังเตรียมเชื่อมต่อ LINE Webhook: ${webhookUrl}`);
  console.log("[AUTO-BOT] ⏳ รอ Cloudflare DNS กระจายตัวสักครู่ (ประมาณ 4-8 วินาที)...");

  // Initial grace period to give Cloudflare's global DNS time to publish the subdomain
  await new Promise((r) => setTimeout(r, 4000));

  let putSuccess = false;
  let lastPutError = "";
  const maxPutAttempts = 8;

  for (let attempt = 1; attempt <= maxPutAttempts; attempt++) {
    try {
      const putRes = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ endpoint: webhookUrl }),
      });

      if (putRes.ok) {
        putSuccess = true;
        console.log(`[AUTO-BOT] 🎯 บันทึก Webhook URL เข้าสู่ระบบ LINE สำเร็จแล้ว`);
        break;
      }

      lastPutError = await putRes.text();
      // LINE returns 400 "Invalid webhook endpoint URL" when the new trycloudflare DNS hasn't propagated to LINE's servers
      if (attempt < maxPutAttempts) {
        console.log(`[AUTO-BOT] ⏳ รอ DNS propagation เพื่อลงทะเบียน Webhook กับ LINE (ครั้งที่ ${attempt}/${maxPutAttempts})...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      lastPutError = err.message;
      if (attempt < maxPutAttempts) {
        console.log(`[AUTO-BOT] ⏳ เครือข่ายกำลังเชื่อมต่อ LINE API (ครั้งที่ ${attempt}/${maxPutAttempts})...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  if (!putSuccess) {
    console.error(`[AUTO-BOT] ❌ อัปเดต Webhook ไปยัง LINE API ไม่สำเร็จ: ${lastPutError}`);
    console.warn(`[AUTO-BOT] 💡 คุณสามารถนำ Webhook URL ไปใส่ใน LINE Developers Console เองได้: ${webhookUrl}`);
    return false;
  }

  // Retry LINE webhook verification test while tunnel endpoint is fully active
  const maxTestAttempts = 8;
  for (let attempt = 1; attempt <= maxTestAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 3000));
    try {
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
          return true;
        }
      }
    } catch {
      // Retry
    }
    console.log(`[AUTO-BOT] ⏳ รอทดสอบการตอบสนองของ LINE Webhook (ครั้งที่ ${attempt}/${maxTestAttempts})...`);
  }
  return false;
}

async function syncLineWebhook(webhookUrl) {
  if (NO_LINE_SYNC) {
    console.log(`[AUTO-BOT] (--no-line-sync) ข้ามการอัปเดต LINE Webhook: ${webhookUrl}`);
    return;
  }

  const tokens = await resolveLineTokens();
  if (tokens.length === 0) {
    console.warn("\n[AUTO-BOT] ⚠️ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local กรุณานำ Webhook URL ไปวางใน LINE Developers Console เอง:");
    console.warn(`           ${webhookUrl}\n`);
    return;
  }

  try {
    let allVerified = true;
    for (const token of tokens) {
      const verified = await syncSingleTokenWebhook(token, webhookUrl);
      if (!verified) allVerified = false;
    }

    const lanIp = getLanIp();
    if (allVerified) {
      console.log("\n================================================================================");
      console.log("  ✅ PAKDEE SERVER + CLOUDFLARE TUNNEL + LINE BOT READY!");
      console.log("================================================================================");
      console.log(`  🌐 Local / LAN Web : http://${lanIp}:${PORT}`);
      console.log(`  🤖 LINE Webhook URL: ${webhookUrl}`);
      console.log(`  🔗 LINE Developers : Synced & Verified (${tokens.length} OA, HTTP 200 OK)`);
      console.log("================================================================================\n");
    } else {
      console.warn(`[AUTO-BOT] ⚠️ อัปเดต Webhook URL ไปยัง LINE แล้ว (${webhookUrl}) แต่การทดสอบยังรอ DNS ทำงานสักครู่`);
    }
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

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("\n[AUTO-BOT] กำลังปิดระบบ Next.js และ Cloudflare Tunnel อย่างปลอดภัย...");
  for (const child of children) {
    killTree(child);
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function spawnNextServer(nextCmd) {
  const localNextBin = path.join(ROOT_DIR, "node_modules", "next", "dist", "bin", "next");
  if (fs.existsSync(localNextBin)) {
    return spawn(process.execPath, [localNextBin, nextCmd, "-p", String(PORT), "-H", "0.0.0.0"], {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
  }
  // Fallback using a single command string to avoid DEP0190 warning
  return spawn(`npx next ${nextCmd} -p ${PORT} -H 0.0.0.0`, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true,
  });
}

function spawnCloudflared(localTarget) {
  const namedToken = envConfig.CLOUDFLARE_TUNNEL_TOKEN?.trim();
  const cmdStr = namedToken
    ? `npx --yes cloudflared tunnel --no-autoupdate run --token ${namedToken}`
    : `npx --yes cloudflared tunnel --url ${localTarget}`;

  return {
    namedToken,
    proc: spawn(cmdStr, {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    }),
  };
}

async function main() {
  const localTarget = `http://${TARGET_HOST}:${PORT}`;

  if (!TUNNEL_ONLY) {
    let portBusy = await isPortOpen(TARGET_HOST, PORT);
    if (portBusy && FORCE_RESTART && (TARGET_HOST === "127.0.0.1" || TARGET_HOST === "localhost")) {
      console.log(`[AUTO-BOT] 🔄 (--restart) กำลังปิดเซิร์ฟเวอร์เดิมบนพอร์ต ${PORT}...`);
      try {
        if (process.platform === "win32") {
          const out = execSync(`netstat -ano -p tcp | findstr :${PORT}`, { encoding: "utf8" });
          const pids = new Set(
            out
              .split(/\r?\n/)
              .map((l) => l.trim().split(/\s+/))
              .filter((parts) => parts.length >= 5 && parts[1].endsWith(`:${PORT}`) && parts[3] === "LISTENING")
              .map((parts) => Number(parts[4]))
              .filter((pid) => Number.isFinite(pid) && pid > 0 && pid !== process.pid)
          );
          for (const pid of pids) {
            execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
          }
        } else {
          execSync(`fuser -k ${PORT}/tcp`, { stdio: "ignore" });
        }
        await new Promise((r) => setTimeout(r, 1200));
        portBusy = await isPortOpen(TARGET_HOST, PORT);
      } catch {
        // Fall through to normal port-busy check
      }
    }

    if (portBusy) {
      const alreadyPakdee = await waitForLocalServer(localTarget, 2);
      if (alreadyPakdee) {
        console.log(`[AUTO-BOT] ℹ️ พอร์ต ${PORT} มีเซิร์ฟเวอร์ PAKDEE เปิดใช้งานอยู่แล้ว — กำลังเชื่อม Cloudflare Tunnel ต่อให้ทันที...`);
        console.warn(`[AUTO-BOT] ⚠️ คำเตือน: เซิร์ฟเวอร์ Next.js เดิมยังคงทำงานอยู่ (ไม่ได้โหลดโค้ดใหม่จาก git pull) หากต้องการรีสตาร์ทโค้ดใหม่ให้ปิดหน้าต่างเซิร์ฟเวอร์เดิมก่อน หรือรันพร้อม --restart`);
      } else {
        console.error(`[AUTO-BOT] ❌ พอร์ต ${PORT} ถูกโปรแกรมอื่นใช้งานอยู่ กรุณาปิดโปรแกรมนั้นก่อนหรือใช้ --port อื่น`);
        process.exit(1);
      }
    } else {
      const nextCmd = MODE === "start" ? "start" : "dev";
      console.log(`[AUTO-BOT] 🚀 กำลังเริ่ม Next.js (${nextCmd}) บนพอร์ต ${PORT}...`);
      const nextProc = spawnNextServer(nextCmd);
      children.push(nextProc);

      nextProc.on("exit", (code) => {
        if (!shuttingDown) {
          console.log(`[AUTO-BOT] Next.js หยุดทำงาน (code ${code})`);
          shutdown(code ?? 0);
        }
      });

      console.log(`[AUTO-BOT] ⏳ รอให้เว็บเซิร์ฟเวอร์ ${localTarget} พร้อมใช้งาน...`);
      const ready = await waitForLocalServer(localTarget);
      if (!ready) {
        console.error(`[AUTO-BOT] ❌ เซิร์ฟเวอร์ ${localTarget} ไม่ตอบสนองภายในเวลาที่กำหนด`);
        shutdown(1);
        return;
      }
    }
  } else {
    console.log(`[AUTO-BOT] 🔎 ตรวจสอบปลายทาง ${localTarget}/api/line/webhook ...`);
    const ready = await waitForLocalServer(localTarget, 5);
    if (!ready) {
      console.warn(`[AUTO-BOT] ⚠️ ไม่พบเซิร์ฟเวอร์ที่ ${localTarget} กำลังเปิดท่อส่งสัญญาณรอไว้...`);
    }
  }

  console.log(`[AUTO-BOT] 🌐 กำลังเปิด Cloudflare Tunnel ไปยัง ${localTarget} ...`);
  const { namedToken, proc: cfProc } = spawnCloudflared(localTarget);
  children.push(cfProc);

  let syncedUrl = "";
  let registered = false;
  let webhookSynced = false;

  const maybeSyncWebhook = () => {
    if (!namedToken && syncedUrl && registered && !webhookSynced) {
      webhookSynced = true;
      syncLineWebhook(syncedUrl);
    }
  };

  const handleCfOutput = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    const match = text.match(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/i);
    if (match && !syncedUrl) {
      syncedUrl = `${match[0]}/api/line/webhook`;
    }
    if (text.includes("Registered tunnel connection")) {
      registered = true;
    }
    maybeSyncWebhook();
  };

  cfProc.stdout?.on("data", handleCfOutput);
  cfProc.stderr?.on("data", handleCfOutput);

  cfProc.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`[AUTO-BOT] ⚠️ Cloudflare Tunnel ปิดตัวลง (code ${code})`);
      if (TUNNEL_ONLY) shutdown(code ?? 0);
    }
  });
}

main().catch((err) => {
  console.error("[AUTO-BOT] Fatal error:", err);
  shutdown(1);
});
