const config = require("../config");

// Images random
const TAG_IMAGES = [
  "https://files.catbox.moe/k35kko.jpg",
  "https://files.catbox.moe/0p867k.jpg",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${d}d ${h}h ${m}m ${s}s`;
}

// Preview chaîne (sans lien visible)
function channelContext() {
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

module.exports = {
  name: "tagall",
  category: "Group",
  description: "Mentionner tous les membres (style liste)",

  async execute(sock, m, args, { prefix, isGroup } = {}) {
    const from = m.key.remoteJid;

    if (!isGroup) {
      return sock.sendMessage(
        from,
        { text: "❌ Cette commande fonctionne uniquement en groupe." },
        { quoted: m }
      );
    }

    const meta = await sock.groupMetadata(from);
    const participants = meta.participants || [];

    // Tous les JIDs à mentionner
    const mentions = participants.map((p) => p.id);

    // Texte optionnel après .tagall
    const reason = args?.length ? args.join(" ") : "";

    // Infos
    const groupName = meta.subject || "Groupe";
    const total = participants.length;
    const uptime = global.botStartTime
      ? formatUptime(Date.now() - global.botStartTime)
      : "N/A";

    // Liste style capture: @+225xxxx ...
    const list = mentions.map((jid) => `@${jid.split("@")[0]}`).join("\n");

    const caption =
`╭━━〔 📣 *TAGALL* • ${config.BOT_NAME || "NOVA XMD V1"} 〕━━╮
┃ 🏷️ Groupe   : ${groupName}
┃ 👥 Membres  : ${total}
┃ ⏱️ Uptime   : ${uptime}
┃ 👤 By       : @${(m.key.participant || m.key.remoteJid).split("@")[0]}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${list}

${reason ? "💬 Message : " + reason : ""}`.trim();

    // Envoi une seule fois (comme ta capture)
    await sock.sendMessage(
      from,
      {
        image: { url: pickRandom(TAG_IMAGES) },
        caption,
        mentions,
        contextInfo: channelContext(),
      },
      { quoted: m }
    );
  },
};