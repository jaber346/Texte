module.exports = {
  name: "tag",
  category: "Group",
  description: "Mention invisible de tous les membres (tag caché)",

  async execute(sock, m, args, { isGroup, prefix } = {}) {
    const from = m.key.remoteJid;

    if (!isGroup) {
      return sock.sendMessage(from, { text: "❌ Cette commande fonctionne uniquement en groupe." }, { quoted: m });
    }

    const meta = await sock.groupMetadata(from);
    const participants = meta.participants || [];
    const mentions = participants.map(p => p.id);

    // 1) Message en argument: .tag bonjour
    let text = args.join(" ").trim();

    // 2) Si pas d’args, et tu replies un msg -> on reprend le texte du msg cité
    if (!text) {
      const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (q) {
        text =
          q.conversation ||
          q.extendedTextMessage?.text ||
          q.imageMessage?.caption ||
          q.videoMessage?.caption ||
          "";
      }
    }

    // 3) Si toujours vide
    if (!text) {
      return sock.sendMessage(from, {
        text: `Utilisation :\n${prefix || "."}tag bonjour\nou réponds à un message puis ${prefix || "."}tag`
      }, { quoted: m });
    }

    // ✅ Tag invisible: on ajoute des caractères invisibles pour “porter” les mentions
    // (WhatsApp affiche pas @ mais notif quand même)
    const invisible = "\u2063"; // invisible separator
    const hiddenMentions = mentions.map(() => invisible).join("");

    await sock.sendMessage(
      from,
      {
        text: text + hiddenMentions,
        mentions
      },
      { quoted: m }
    );
  }
};