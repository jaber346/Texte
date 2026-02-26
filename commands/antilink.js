// ==================== commands/antilink.js ====================
const fs = require("fs");
const path = require("path");

const dataFolder = path.join(__dirname, "../data");
const dbPath = path.join(dataFolder, "antilink.json");

function ensureDb() {
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
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

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// normalise numéro (corrige bug device)
function num(jid = "") {
  return String(jid)
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function isAdminByNumber(participants = [], jid = "") {
  const n = num(jid);
  const found = participants.find((p) => num(p.id) === n);
  return !!found?.admin;
}

module.exports = {
  name: "antilink",
  category: "Security",
  description: "Activer ou désactiver l'antilink",

  execute: run,
  run
};

async function run(sock, m, args, { prefix, isGroup, reply } = {}) {
  try {
    const from = m.key.remoteJid;

    if (!isGroup) {
      return reply
        ? reply("❌ Cette commande fonctionne uniquement en groupe.")
        : sock.sendMessage(from, { text: "❌ Groupe uniquement." }, { quoted: m });
    }

    const metadata = await sock.groupMetadata(from);
    const sender = m.key.participant || m.key.remoteJid;

    if (!isAdminByNumber(metadata.participants, sender)) {
      return reply
        ? reply("🚫 Seuls les admins peuvent utiliser cette commande.")
        : sock.sendMessage(from, { text: "🚫 Admin seulement." }, { quoted: m });
    }

    let db = readDb();
    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      if (db.includes(from)) {
        return reply
          ? reply("✅ L'antilink est déjà activé.")
          : sock.sendMessage(from, { text: "✅ Déjà activé." }, { quoted: m });
      }

      db.push(from);
      saveDb(db);

      return reply
        ? reply("🛡️ Antilink activé pour ce groupe.")
        : sock.sendMessage(from, { text: "🛡️ Antilink activé." }, { quoted: m });
    }

    if (sub === "off") {
      db = db.filter((g) => g !== from);
      saveDb(db);

      return reply
        ? reply("❌ Antilink désactivé.")
        : sock.sendMessage(from, { text: "❌ Antilink désactivé." }, { quoted: m });
    }

    return reply
      ? reply(`Utilisation : ${prefix}antilink on/off`)
      : sock.sendMessage(from, {
          text: `Utilisation : ${prefix}antilink on/off`
        }, { quoted: m });

  } catch (err) {
    console.log("ANTILINK ERROR:", err);
    if (reply) reply("❌ Erreur antilink.");
  }
}