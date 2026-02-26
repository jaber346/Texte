// ==================== data/antidelete.js ====================
const fs = require("fs");
const path = require("path");

const dataFolder = path.join(__dirname, "../data");
const dbPath = path.join(dataFolder, "antidelete.json");

function ensureDb() {
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
  }

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ enabled: false, mode: "chat" }, null, 2)
    );
  }
}

function readDb() {
  ensureDb();
  try {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch {
    return { enabled: false, mode: "chat" };
  }
}

// normalise JID (corrige bug :12 multi-device)
function normJid(jid = "") {
  jid = String(jid || "");
  if (jid.includes(":") && jid.includes("@")) {
    const [l, r] = jid.split("@");
    return l.split(":")[0] + "@" + r;
  }
  return jid;
}

module.exports = async (sock, chatUpdate) => {
  try {
    const db = readDb();
    if (!db.enabled) return;

    if (!chatUpdate) return;

    const key = chatUpdate.key;
    const update = chatUpdate.update;

    if (!key || !update) return;

    const protocolMsg = update.protocolMessage;
    if (!protocolMsg || protocolMsg.type !== 0) return;

    const deletedId = protocolMsg.key?.id;
    if (!deletedId) return;

    const deletedRemote =
      protocolMsg.key?.remoteJid || key.remoteJid;

    const store = global.msgStore || {};
    if (!store || typeof store !== "object") return;

    const originMsg =
      store[deletedId] ||
      store[`${deletedRemote}:${deletedId}`] ||
      store[`${key.remoteJid}:${deletedId}`];

    if (!originMsg) return;

    const from = key.remoteJid;

    let sender =
      originMsg.key?.participant ||
      originMsg.participant ||
      originMsg.key?.remoteJid ||
      from;

    sender = normJid(sender);

    const config = require("../config");
    const ownerNumber = String(config.OWNER_NUMBER || "").replace(/\D/g, "");
    const ownerJid = ownerNumber
      ? ownerNumber + "@s.whatsapp.net"
      : from;

    const destination =
      db.mode === "inbox" ? ownerJid : from;

    const mentionList =
      sender.includes("@") ? [sender] : [];

    // message info
    await sock.sendMessage(
      destination,
      {
        text:
`🚫 *ANTIDELETE DÉTECTÉ*

👤 Auteur : ${sender.includes("@") ? "@" + sender.split("@")[0] : "Inconnu"}
📍 Type : ${from.endsWith("@g.us") ? "Groupe" : "Privé"}`,
        mentions: mentionList
      },
      { quoted: originMsg }
    );

    // renvoi message original
    await sock.copyNForward(destination, originMsg, true);

    // cleanup sécurisé
    delete store[deletedId];
    delete store[`${deletedRemote}:${deletedId}`];
    delete store[`${key.remoteJid}:${deletedId}`];

  } catch (err) {
    console.log("ANTIDELETE HANDLER ERROR:", err?.message || err);
  }
};