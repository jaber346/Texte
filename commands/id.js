// commands/id.js
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
  name: "id",
  category: "Tools",
  description: "Afficher les IDs (chat/groupe/user)",

  async execute(sock, m, args, { isGroup, metadata, sender }) {
    const from = m.key.remoteJid;

    const chatId = from;
    const userId = sender || (m.key.participant || m.key.remoteJid);
    const groupName = metadata?.subject || "N/A";

    const txt =
`╭━━〔 🆔 ${config.BOT_NAME || "NOVA XMD V1"} 〕━━╮
┃ 👤 User : ${String(userId).split("@")[0]}
┃ 💬 Chat : ${chatId}
┃ 👥 Group: ${isGroup ? groupName : "Privé"}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

    return sock.sendMessage(from, {
      text: txt,
      contextInfo: newsletterCtx()
    }, { quoted: m });
  }
};