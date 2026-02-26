const fs = require("fs");
const path = require("path");
const config = require("./config");

// ✅ ANTI CRASH GLOBAL (sécurité supplémentaire)
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ================= COMMAND LOADER =================
const commands = new Map();
const commandsDir = path.join(__dirname, "commands");

function loadAllCommands() {
  commands.clear();
  if (!fs.existsSync(commandsDir)) return;

  for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith(".js")) continue;

    try {
      const full = path.join(commandsDir, file);
      delete require.cache[require.resolve(full)];
      const cmd = require(full);

      const name = (cmd?.name || "").toLowerCase();
      const exec = cmd?.execute || cmd?.run;

      if (name && typeof exec === "function") {
        commands.set(name, { ...cmd, _exec: exec });
      }
    } catch (err) {
      console.log("CMD LOAD ERROR:", file, err?.message || err);
    }
  }
}
loadAllCommands();

// ================= HELPERS =================
function normJid(jid = "") {
  jid = String(jid || "");
  if (!jid) return jid;
  if (jid.includes(":") && jid.includes("@")) {
    const [l, r] = jid.split("@");
    return l.split(":")[0] + "@" + r;
  }
  return jid;
}

function num(jid = "") {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function getSender(m) {
  return normJid(m.key?.participant || m.participant || m.key?.remoteJid || "");
}

function getBody(m) {
  const msg = m.message || {};
  const type = Object.keys(msg)[0];
  if (!type) return "";

  if (type === "ephemeralMessage") {
    const inner = msg.ephemeralMessage?.message || {};
    return getBody({ message: inner, key: m.key });
  }

  if (type === "conversation") return msg.conversation || "";
  if (type === "extendedTextMessage") return msg.extendedTextMessage?.text || "";
  if (type === "imageMessage") return msg.imageMessage?.caption || "";
  if (type === "videoMessage") return msg.videoMessage?.caption || "";
  if (type === "documentMessage") return msg.documentMessage?.caption || "";

  if (type === "buttonsResponseMessage")
    return (
      msg.buttonsResponseMessage?.selectedButtonId ||
      msg.buttonsResponseMessage?.selectedDisplayText ||
      ""
    );

  if (type === "listResponseMessage")
    return (
      msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg.listResponseMessage?.title ||
      ""
    );

  if (type === "templateButtonReplyMessage")
    return (
      msg.templateButtonReplyMessage?.selectedId ||
      msg.templateButtonReplyMessage?.selectedDisplayText ||
      ""
    );

  if (type === "viewOnceMessageV2" || type === "viewOnceMessage") {
    const inner = msg[type]?.message || {};
    const innerType = Object.keys(inner)[0];
    if (!innerType) return "";
    if (innerType === "imageMessage") return inner.imageMessage?.caption || "";
    if (innerType === "videoMessage") return inner.videoMessage?.caption || "";
  }

  return "";
}

// ================= SAVE PREFIX =================
function savePrefixToConfigFile(newPrefix) {
  try {
    const configPath = path.join(__dirname, "config.js");
    if (!fs.existsSync(configPath)) return;

    let content = fs.readFileSync(configPath, "utf8");

    content = content.replace(
      /PREFIX\s*:\s*["'`].*?["'`]/,
      `PREFIX: "${newPrefix}"`
    );

    fs.writeFileSync(configPath, content, "utf8");
  } catch {}
}

// ================= MAIN HANDLER =================
module.exports = async (sock, m, prefix, setMode, currentMode) => {
  try {
    if (!m || !m.message) return;

    const from = m.key.remoteJid;
    if (!from) return;

    const isGroup = from.endsWith("@g.us");
    const sender = getSender(m);

    const botJid = normJid(sock.user?.id || "");
    const ownerJid =
      String(config.OWNER_NUMBER || "").replace(/\D/g, "") + "@s.whatsapp.net";

    const isOwner =
      m.key.fromMe === true ||
      num(sender) === num(ownerJid) ||
      num(sender) === num(botJid);

    const usedPrefix = prefix || config.PREFIX || ".";
    const body = (getBody(m) || "").trim();
    if (!body) return;

    const reply = (text) =>
      sock.sendMessage(from, { text }, { quoted: m });

    if (!body.startsWith(usedPrefix)) return;

    if (String(currentMode).toLowerCase() === "self" && !isOwner) return;

    const parts = body.slice(usedPrefix.length).trim().split(/\s+/);
    const command = (parts.shift() || "").toLowerCase();
    const args = parts;

    // ================= OWNER COMMANDS =================
    if (command === "reload" && isOwner) {
      loadAllCommands();
      return reply("✅ Commands rechargées.");
    }

    if (command === "mode") {
      if (!isOwner) return reply("🚫 Commande réservée au propriétaire.");

      const mode = (args[0] || "").toLowerCase();

      if (mode === "public") {
        setMode("public");
        return reply("🔓 Mode PUBLIC activé.");
      }

      if (["private", "prive", "self"].includes(mode)) {
        setMode("self");
        return reply("🔒 Mode PRIVÉ activé.");
      }

      return reply(`Utilisation :\n${usedPrefix}mode public\n${usedPrefix}mode private`);
    }

    if (command === "setprefix") {
      if (!isOwner) return reply("🚫 Commande réservée au propriétaire.");

      const newP = args[0];
      if (!newP) return reply(`Utilisation : ${usedPrefix}setprefix .`);

      config.PREFIX = newP;
      savePrefixToConfigFile(newP);

      return reply(`✅ Prefix changé : *${newP}*`);
    }

    // ================= BUILT-IN =================
    if (command === "ping") {
      const start = Date.now();
      const modeText = (currentMode || "public").toUpperCase();

      return reply(
`╭━━〔 🤖 NOVA XMD V1 〕━━╮
┃ 🏓 Ping
┣━━━━━━━━━━━━━━━━━━
┃ ⚡ Speed : ${Date.now() - start} ms
┃ 🌐 Mode  : ${modeText}
┃ 🟢 Status: ONLINE
╰━━━━━━━━━━━━━━━━━━╯`
      );
    }

    // ================= DYNAMIC COMMANDS =================
    const cmd = commands.get(command);
    if (cmd) {
      try {
        return await cmd._exec(sock, m, args, {
          prefix: usedPrefix,
          currentMode,
          setMode,
          isOwner,
          isGroup,
          sender,
          from,
          reply
        });
      } catch (e) {
        console.log("CMD EXEC ERROR:", e?.message || e);
        return reply("❌ Erreur dans la commande.");
      }
    }

  } catch (err) {
    console.log("CASE ERROR:", err?.message || err);
  }
};