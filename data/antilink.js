// ==================== data/antilink.js ====================
const fs = require("fs");
const path = require("path");

const dataFolder = path.join(__dirname);
const dbPath = path.join(dataFolder, "antilink.json");

// Create DB if missing
function ensureDb() {
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([]));
  }
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return [];
  }
}

// normalize JID (fix :12 bug)
function norm(jid = "") {
  jid = String(jid);
  if (jid.includes(":") && jid.includes("@")) {
    const [l, r] = jid.split("@");
    return l.split(":")[0] + "@" + r;
  }
  return jid;
}

function num(jid = "") {
  return norm(jid).split("@")[0];
}

module.exports = async (sock, m, from, body, ownerNumber = "") => {
  try {
    if (!from || !from.endsWith("@g.us")) return;

    const db = readDb();
    if (!Array.isArray(db) || !db.includes(from)) return;

    const text = String(body || "");
    if (!text) return;
    if (m.key?.fromMe) return;

    // Regex large (tous liens)
    const linkRegex = /(https?:\/\/\S+|wa\.me\/\S+|chat\.whatsapp\.com\/\S+)/i;
    if (!linkRegex.test(text)) return;

    const senderId = norm(m.key?.participant || m.key?.remoteJid);
    if (!senderId) return;

    const senderNum = num(senderId);

    // Owner bypass
    if (ownerNumber && senderNum === String(ownerNumber).replace(/\D/g, "")) {
      return;
    }

    const botId = norm(sock.user?.id);

    const metadata = await sock.groupMetadata(from);
    const participants = metadata?.participants || [];

    const admins = participants
      .filter(p => p.admin)
      .map(p => norm(p.id));

    const isBotAdmin = admins.includes(botId);
    const isSenderAdmin = admins.includes(senderId);

    if (!isBotAdmin) return;
    if (isSenderAdmin) return;

    // Delete message
    await sock.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: m.key.id,
        participant: senderId
      }
    });

    // Warning
    await sock.sendMessage(from, {
      text:
`🚫 *ANTI-LIEN ACTIVÉ*

👤 @${senderNum}

Les liens sont interdits dans ce groupe.
Message supprimé automatiquement.`,
      mentions: [senderId]
    });

  } catch (err) {
    console.log("ANTILINK ERROR:", err?.message || err);
  }
};