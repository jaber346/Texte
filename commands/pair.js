// ==================== commands/pair.js ====================
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay
} = require("@whiskeysockets/baileys");

const config = require("../config");

function onlyDigits(s) {
  return String(s || "").replace(/[^0-9]/g, "");
}

module.exports = {
  name: "pair",
  category: "Owner",
  description: "Générer un code de pairing WhatsApp",

  execute: run,
  run
};

async function run(sock, m, args, { isOwner, prefix, reply } = {}) {
  const from = m.key.remoteJid;

  try {
    if (!isOwner) {
      return reply
        ? reply("🚫 Commande réservée au propriétaire.")
        : sock.sendMessage(from, { text: "🚫 Owner seulement." }, { quoted: m });
    }

    const num = onlyDigits(args[0]);

    if (!num || num.length < 8) {
      return reply
        ? reply(`Utilisation : ${prefix}pair 226XXXXXXXX`)
        : sock.sendMessage(
            from,
            { text: `Utilisation : ${prefix}pair 226XXXXXXXX` },
            { quoted: m }
          );
    }

    await (reply
      ? reply("⏳ Génération du code en cours...")
      : sock.sendMessage(from, { text: "⏳ Génération du code en cours..." }, { quoted: m })
    );

    const accountsDir = path.join(__dirname, "..", "accounts");
    if (!fs.existsSync(accountsDir)) {
      fs.mkdirSync(accountsDir, { recursive: true });
    }

    const sessionDir = path.join(accountsDir, `pair_${num}`);

    // Reset session propre
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const tmpSock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: [config.BOT_NAME || "NOVA XMD V1", "Chrome", "1.0.0"],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: "silent" })
        ),
      },
    });

    tmpSock.ev.on("creds.update", saveCreds);

    await delay(3000);

    let code;
    try {
      code = await tmpSock.requestPairingCode(num);
    } catch {
      code = null;
    }

    try { tmpSock.end(); } catch {}

    if (!code) throw new Error("No pairing code returned");

    const newsletterContext = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363423249667073@newsletter",
        newsletterName: config.BOT_NAME || "NOVA XMD V1",
        serverMessageId: 1,
      },
    };

    return sock.sendMessage(
      from,
      {
        text:
`╭━━〔 🤖 ${config.BOT_NAME || "NOVA XMD V1"} 〕━━╮
┃ ✅ PAIRING CODE GÉNÉRÉ
┃ 📱 Numéro : ${num}
┃ 🔑 Code : *${code}*
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
        contextInfo: newsletterContext,
      },
      { quoted: m }
    );

  } catch (err) {
    console.log("PAIR ERROR:", err);

    try {
      const accountsDir = path.join(__dirname, "..", "accounts");
      const num = onlyDigits(args?.[0]);
      const sessionDir = path.join(accountsDir, `pair_${num}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch {}

    if (reply) {
      reply("❌ Impossible de générer le code. Vérifie le numéro et réessaie.");
    } else {
      sock.sendMessage(
        from,
        { text: "❌ Impossible de générer le code. Vérifie le numéro et réessaie." },
        { quoted: m }
      );
    }
  }
}