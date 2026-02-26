const config = require("../config");

function newsletterCtx() {
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

module.exports = {
  name: "stop",
  category: "Owner",
  description: "Arrêter une action en cours (kickall)",

  async execute(sock, m, args, { isOwner } = {}) {
    const from = m.key.remoteJid;

    if (!isOwner) {
      return sock.sendMessage(from, { text: "🚫 Commande réservée au propriétaire." }, { quoted: m });
    }

    if (!global.kickallJobs || !global.kickallJobs.has(from)) {
      return sock.sendMessage(from, { text: "ℹ️ Aucune action en cours.", contextInfo: newsletterCtx() }, { quoted: m });
    }

    const job = global.kickallJobs.get(from);
    job.stop = true;

    return sock.sendMessage(from, { text: "🛑 Stop reçu. Arrêt en cours…", contextInfo: newsletterCtx() }, { quoted: m });
  }
};