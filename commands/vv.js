const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// unwrap helpers
function unwrapMessage(msg = {}) {
  // ephemeral
  if (msg.ephemeralMessage?.message) return unwrapMessage(msg.ephemeralMessage.message);
  // viewOnce wrappers
  if (msg.viewOnceMessageV2?.message) return msg.viewOnceMessageV2.message;
  if (msg.viewOnceMessage?.message) return msg.viewOnceMessage.message;
  return msg;
}

module.exports = {
  name: "vv",
  category: "Tools",
  description: "Récupérer image/vidéo view-once",

  async execute(sock, m) {
    const from = m.key.remoteJid;

    const q = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) {
      return sock.sendMessage(from, { text: "⚠️ Réponds à un view-once (image/vidéo) avec *.vv*" }, { quoted: m });
    }

    try {
      const unwrapped = unwrapMessage(q);
      const type = Object.keys(unwrapped || {})[0];

      if (type === "imageMessage") {
        const media = unwrapped.imageMessage;
        const stream = await downloadContentFromMessage(media, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        return sock.sendMessage(from, { image: buffer, caption: "👁️ View Once (image) récupérée ✅" }, { quoted: m });
      }

      if (type === "videoMessage") {
        const media = unwrapped.videoMessage;
        const stream = await downloadContentFromMessage(media, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        return sock.sendMessage(from, { video: buffer, caption: "👁️ View Once (vidéo) récupérée ✅" }, { quoted: m });
      }

      return sock.sendMessage(from, { text: "❌ Ce message n’est pas un view-once valide." }, { quoted: m });
    } catch (e) {
      return sock.sendMessage(from, { text: "❌ Impossible de récupérer le view-once." }, { quoted: m });
    }
  },
};