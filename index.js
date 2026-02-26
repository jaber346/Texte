const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const express = require("express");
const fs = require("fs");
const path = require("path");
const config = require("./config");
const cmdHandler = require("./case.js");

// ==================== ANTI CRASH GLOBAL ====================
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// ==================== SAFE LOAD HANDLERS ====================
let newsletterHandler = async () => {};
let antideleteHandler = async () => {};
let antilinkHandler = async () => {};

try { newsletterHandler = require("./data/newsletter.js"); } catch {}
try { antideleteHandler = require("./data/antidelete.js"); } catch {}
try { antilinkHandler = require("./data/antilink.js"); } catch {}

const app = express();
const port = process.env.PORT || 3000;

const sessionsDir = path.join(__dirname, "accounts");
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

let tempSocks = {};
global.msgStore = {};
global.owner = String(config.OWNER_NUMBER || "").replace(/\D/g, "");
global.botStartTime = Date.now();
global.autoStatus = false; // ✅ AUTO STATUS STATE

// ==================== HELPERS ====================
function normJid(jid = "") {
  jid = String(jid);
  if (jid.includes(":") && jid.includes("@")) {
    const [l, r] = jid.split("@");
    return l.split(":")[0] + "@" + r;
  }
  return jid;
}

function newsletterContext() {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363423249667073@newsletter",
      newsletterName: config.BOT_NAME || "NOVA XMD V1",
      serverMessageId: 1
    }
  };
}

// ===============================
// START BOT
// ===============================
async function startUserBot(phoneNumber, isPairing = false) {
  const cleanNumber = String(phoneNumber).replace(/\D/g, "");
  const sessionName = `session_${cleanNumber}`;
  const sessionPath = path.join(sessionsDir, sessionName);

  if (isPairing) {
    if (tempSocks[sessionName]) {
      try { tempSocks[sessionName].end(); } catch {}
      delete tempSocks[sessionName];
    }
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  let currentMode = (config.MODE || "public").toLowerCase();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    }
  });

  tempSocks[sessionName] = sock;

  // ================= CONNECTION =================
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log(`[${cleanNumber}] Reconnexion...`);
        setTimeout(() => startUserBot(cleanNumber), 4000);
      } else {
        console.log(`[${cleanNumber}] Session déconnectée (logout).`);
      }
    }

    if (connection === "open") {
      console.log(`✅ [${cleanNumber}] Connecté`);
      try {
        await sock.sendMessage(
          normJid(sock.user?.id),
          {
            text:
`╭━━〔 🤖 ${config.BOT_NAME || "NOVA XMD V1"} 〕━━╮
┃ ✅ CONNECTÉ
┃ 👨‍💻 Owner : ${config.OWNER_NAME || "DEV"}
┃ 🌐 Mode : ${currentMode.toUpperCase()}
╰━━━━━━━━━━━━━━━━━━╯`,
            contextInfo: newsletterContext()
          }
        );
      } catch {}
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // ================= MESSAGES =================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const m = messages?.[0];
      if (!m?.message) return;

      // ================= AUTO STATUS =================
      if (m.key.remoteJid === "status@broadcast") {
        if (global.autoStatus) {
          try {
            await sock.readMessages([m.key]);

            await sock.sendMessage(
              "status@broadcast",
              {
                react: {
                  key: m.key,
                  text: "❤️"
                }
              },
              {
                statusJidList: [m.key.participant]
              }
            );
          } catch (e) {
            console.log("AUTOSTATUS ERROR:", e?.message || e);
          }
        }
        return;
      }

      // Store messages for antidelete
      if (m.key?.id) {
        global.msgStore[m.key.id] = m;
        global.msgStore[`${m.key.remoteJid}:${m.key.id}`] = m;

        setTimeout(() => {
          delete global.msgStore[m.key.id];
          delete global.msgStore[`${m.key.remoteJid}:${m.key.id}`];
        }, 7200000);
      }

      try { await newsletterHandler(sock, m); } catch {}

      // ================= ANTILINK =================
      try {
        const body =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          m.message?.videoMessage?.caption ||
          "";

        await antilinkHandler(
          sock,
          m,
          m.key.remoteJid,
          body,
          global.owner
        );
      } catch {}

      // ================= COMMANDS =================
      await cmdHandler(
        sock,
        m,
        config.PREFIX || ".",
        (newMode) => currentMode = String(newMode || "public").toLowerCase(),
        currentMode
      );

    } catch (err) {
      console.log("UPSERT ERROR:", err?.message || err);
    }
  });

  // ================= ANTIDELETE =================
  sock.ev.on("messages.update", async (updates) => {
    for (const upd of updates) {
      try { await antideleteHandler(sock, upd); } catch {}
    }
  });

  return sock;
}

// ===============================
// RESTORE SESSIONS
// ===============================
async function restoreSessions() {
  if (!fs.existsSync(sessionsDir)) return;
  const folders = fs.readdirSync(sessionsDir);

  for (const folder of folders) {
    if (folder.startsWith("session_")) {
      const num = folder.replace("session_", "");
      console.log("🔄 Restore:", num);
      await startUserBot(num);
      await delay(4000);
    }
  }
}

// ===============================
// ROUTES
// ===============================
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/pair", async (req, res) => {
  try {
    const num = String(req.query.number || "").replace(/\D/g, "");
    if (!num || num.length < 8) {
      return res.status(400).json({ error: "Numéro invalide" });
    }

    const sock = await startUserBot(num, true);
    await delay(3000);

    let code;
    try {
      code = await sock.requestPairingCode(num);
    } catch {
      code = null;
    }

    if (!code) {
      return res.status(500).json({ error: "Impossible de générer le code" });
    }

    return res.json({ code });

  } catch (e) {
    console.log("PAIR ERROR:", e?.message || e);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ===============================
// SERVER
// ===============================
app.listen(port, async () => {
  console.log(`🌐 ${config.BOT_NAME || "NOVA XMD V1"} prêt sur : http://localhost:${port}`);
  await restoreSessions();
});