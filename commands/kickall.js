const config = require("../config");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
global.kickallJobs = global.kickallJobs || new Map();

function newsletterCtx() {
  return {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363423249667073@newsletter",
      newsletterName: config.BOT_NAME || "NOVA XMD V1",
      serverMessageId: 1,
    },
  };
}

// Normalise numéro
function num(jid = "") {
  return String(jid || "")
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
  name: "kickall",
  category: "Group",
  description: "Supprime tous les non-admins du groupe",

  run: async (sock, m, args, { isGroup, isOwner, prefix, reply }) => {
    try {
      const from = m.key.remoteJid;
      const sender = m.key.participant || m.key.remoteJid;

      if (!isGroup) return reply("❌ Groupe uniquement.");
      if (!isOwner) return reply("🚫 Owner seulement.");

      if (global.kickallJobs.has(from)) {
        return reply(`⚠️ Purification déjà en cours.\nEnvoie *${prefix}stop* pour arrêter.`);
      }

      const meta = await sock.groupMetadata(from);
      const participants = meta.participants || [];

      const botId = sock.user?.id || "";
      const botIsAdmin = isAdminByNumber(participants, botId);

      if (!botIsAdmin)
        return reply("❌ Je dois être admin pour purifier.");

      const senderIsAdmin = isAdminByNumber(participants, sender);
      if (!senderIsAdmin)
        return reply("🚫 Seuls les admins peuvent lancer.");

      const job = { stop: false };
      global.kickallJobs.set(from, job);

      await sock.sendMessage(
        from,
        {
          text:
`╭━━〔 🧹 PURIFICATION 〕━━╮
┃ Groupe : ${meta.subject}
┃ Début dans 3 secondes...
┃ Stop : ${prefix}stop
╰━━━━━━━━━━━━━━━━━━━━━━╯`,
          contextInfo: newsletterCtx(),
        },
        { quoted: m }
      );

      for (let i = 3; i >= 1; i--) {
        if (job.stop) {
          global.kickallJobs.delete(from);
          return reply("🛑 Purification annulée.");
        }
        await delay(1000);
      }

      const targets = participants
        .map((p) => p.id)
        .filter(
          (jid) =>
            !isAdminByNumber(participants, jid) &&
            num(jid) !== num(botId)
        );

      let removed = 0;

      for (const user of targets) {
        if (job.stop) {
          global.kickallJobs.delete(from);
          return reply(`🛑 Purification stoppée.\nSupprimés : ${removed}`);
        }

        try {
          await sock.groupParticipantsUpdate(from, [user], "remove");
          removed++;
        } catch {}

        await delay(1200);
      }

      global.kickallJobs.delete(from);

      return sock.sendMessage(
        from,
        {
          text:
`✅ GROUPE PURIFIÉ
👥 Groupe : ${meta.subject}
🧹 Membres supprimés : ${removed}`,
          contextInfo: newsletterCtx(),
        },
        { quoted: m }
      );

    } catch (err) {
      console.log("KICKALL ERROR:", err);
      reply("❌ Erreur pendant la purification.");
    }
  },
};