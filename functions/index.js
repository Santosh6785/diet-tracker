// Updated: June 2026
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

async function getAllTokens() {
  const db = getFirestore();
  const snapshot = await db.collection("fcmTokens").get();
  const tokens = [];
  snapshot.forEach(doc => {
    const t = doc.data().fcmToken;
    if (t && typeof t === "string" && t.length > 10) tokens.push(t);
  });
  return [...new Set(tokens)];
}

async function sendReminder(title, body) {
  const db = getFirestore();
  const tokens = await getAllTokens();
  if (!tokens.length) {
    console.log(`[${title}] No tokens`);
    return;
  }
  const message = {
    notification: { title, body },
    webpush: {
      notification: {
        title, body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200],
        requireInteraction: false,
        tag: "diet-tracker-reminder"
      },
      fcmOptions: {
        link: "https://diet-tracker-app-c22f4.web.app"
      }
    },
    tokens,
  };
  const response = await getMessaging().sendEachForMulticast(message);
  console.log(`[${title}] ✓ ${response.successCount} sent, ✗ ${response.failureCount} failed`);
  if (response.failureCount > 0) {
    const snap2 = await db.collection("fcmTokens").get();
    const tokenToUid = {};
    snap2.forEach(doc => {
      tokenToUid[doc.data().fcmToken] = doc.id;
    });
    const del = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error && resp.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          const uid = tokenToUid[tokens[idx]];
          if (uid) del.push(db.collection("fcmTokens").doc(uid).delete());
        }
      }
    });
    await Promise.all(del);
  }
}

exports.reminder_morning_sunlight = onSchedule(
  { schedule: "0 7 * * *", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    await sendReminder(
      "🌅 Good Morning!",
      "Step outside for 10 min sunlight & drink your lemon water 🍋"
    );
  }
);

exports.reminder_morning_checklist = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    await sendReminder(
      "📋 Morning Checklist",
      "Start your morning habits — breakfast, water & movement 💪"
    );
  }
);

exports.reminder_lunch = onSchedule(
  { schedule: "0 13 * * *", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    await sendReminder(
      "🍱 Lunch Time!",
      "Don't forget to log your lunch in Diet Tracker 🥗"
    );
  }
);

exports.reminder_evening_snack = onSchedule(
  { schedule: "0 17 * * *", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    await sendReminder(
      "🫐 Evening Snack",
      "Healthy option: fruits, roasted chana or green tea ☕"
    );
  }
);

exports.reminder_postdinner_walk = onSchedule(
  { schedule: "30 20 * * *", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    await sendReminder(
      "🚶 Post-Dinner Walk",
      "A 15-min walk aids digestion & burns extra calories 🔥"
    );
  }
);

exports.reminder_eod_checklist = onSchedule(
  { schedule: "0 21 * * *", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    await sendReminder(
      "✅ End of Day",
      "Log dinner & complete tonight's checklist. Great work today! 🌙"
    );
  }
);

