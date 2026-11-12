/**
 * Next.js runs register() once when the server starts (npm run dev / npm start).
 * Starts the LINE automatic reminder scheduler: every 10 minutes it sends the reminders
 * that are due today for every branch whose send time has passed (see src/lib/line/reminders.ts).
 * Already-sent reminders are never repeated (line_reminder_logs).
 * Works only while this server is running. Set LINE_REMINDERS_DISABLED=1 to turn it off.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.LINE_REMINDERS_DISABLED === "1") return;

  const g = globalThis as unknown as { __pakdeeReminderTimer?: ReturnType<typeof setInterval> };
  if (g.__pakdeeReminderTimer) return; // dev hot-reload: start only once

  const INTERVAL_MS = 10 * 60 * 1000;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { runLineReminders } = await import("@/lib/line/reminders");
      const result = await runLineReminders();
      const sent = result.items.filter((i) => i.status === "sent").length;
      const failed = result.items.filter((i) => i.status === "failed").length;
      if (sent || failed) {
        console.log(`[LINE-REMINDERS] ${result.today} ${result.time}: sent ${sent}, failed ${failed}`);
      }
    } catch (e: any) {
      console.error("[LINE-REMINDERS] run failed:", e?.message || e);
    } finally {
      running = false;
    }
  };

  // First run shortly after start (let the server finish booting), then every 10 minutes
  setTimeout(tick, 60 * 1000);
  g.__pakdeeReminderTimer = setInterval(tick, INTERVAL_MS);
  console.log("[LINE-REMINDERS] scheduler started (every 10 minutes)");
}
