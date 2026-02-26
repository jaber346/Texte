// ==================== commands/antidelete.js ====================
const fs = require("fs");
const path = require("path");

const dataFolder = path.join(__dirname, "../data");
const dbPath = path.join(dataFolder, "antidelete.json");

function ensureDb() {
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
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

function saveDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "antidelete",
  category: "Security",
  description: "Activer/Désactiver antidelete + destination",

  // compatible avec ton loader
  execute: run,
  run
};

async function run(sock, m, args, { prefix, isOwner, reply } = {}) {
  try {
    const from = m.key.remoteJid;

    if (!isOwner) {
      return reply
        ? reply("🚫 Commande réservée au propriétaire.")
        : sock.sendMessage(from, { text: "🚫 Commande réservée au propriétaire." }, { quoted: m });
    }

    const db = readDb();
    const sub = (args[0] || "").toLowerCase();

    if (sub === "on") {
      db.enabled = true;
      saveDb(db);
      return reply ? reply("✅ Antidelete activé.") :
        sock.sendMessage(from, { text: "✅ Antidelete activé." }, { quoted: m });
    }

    if (sub === "off") {
      db.enabled = false;
      saveDb(db);
      return reply ? reply("❌ Antidelete désactivé.") :
        sock.sendMessage(from, { text: "❌ Antidelete désactivé." }, { quoted: m });
    }

    if (sub === "mode") {
      const mode = (args[1] || "").toLowerCase();

      if (mode !== "chat" && mode !== "inbox") {
        return reply
          ? reply(`Utilisation : ${prefix}antidelete mode chat|inbox`)
          : sock.sendMessage(from, {
              text: `Utilisation : ${prefix}antidelete mode chat|inbox`
            }, { quoted: m });
      }

      db.mode = mode;
      saveDb(db);

      return reply
        ? reply(`✅ Destination antidelete : *${mode}*`)
        : sock.sendMessage(from, {
            text: `✅ Destination antidelete : *${mode}*`
          }, { quoted: m });
    }

    return reply
      ? reply(
`Utilisation :
${prefix}antidelete on
${prefix}antidelete off
${prefix}antidelete mode chat|inbox`
      )
      : sock.sendMessage(from, {
          text:
`Utilisation :
${prefix}antidelete on
${prefix}antidelete off
${prefix}antidelete mode chat|inbox`
        }, { quoted: m });

  } catch (err) {
    console.log("ANTIDELETE ERROR:", err);
    if (reply) reply("❌ Erreur antidelete.");
  }
}