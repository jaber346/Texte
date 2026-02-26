const axios = require("axios");
const FormData = require("form-data");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

module.exports = {
  name: "url",
  category: "Tools",
  description: "Uploader une image/vidéo et donner un lien (catbox)",

  async execute(sock, m, args, extra = {}) {
    const from = m.key.remoteJid;
    const reply = async (text) => {
      // compatible avec ton handler
      if (extra.MiniBot?.reply) return extra.MiniBot.reply(text);
      return sock.sendMessage(from, { text }, { quoted: m });
    };

    // message cité (reply)
    const qMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!qMsg) return reply("⚠️ Réponds à une image/vidéo avec *.url*");

    // détecter média
    let type = null;
    let media = null;

    if (qMsg.imageMessage) {
      type = "image";
      media = qMsg.imageMessage;
    } else if (qMsg.videoMessage) {
      type = "video";
      media = qMsg.videoMessage;
    } else if (qMsg.documentMessage) {
      type = "document";
      media = qMsg.documentMessage;
    }

    if (!type || !media) {
      return reply("❌ Média non supporté. Réponds à une *image* ou *vidéo*.");
    }

    try {
      await reply("⏳ Upload en cours...");

      // download
      const dlType = type === "image" ? "image" : type === "video" ? "video" : "document";
      const stream = await downloadContentFromMessage(media, dlType);
      const buffer = await streamToBuffer(stream);

      // upload catbox
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", buffer, {
        filename:
          type === "video" ? "nova.mp4" :
          type === "image" ? "nova.jpg" : "nova.bin"
      });

      const res = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      const url = String(res.data || "").trim();
      if (!url.startsWith("http")) {
        console.log("URL UPLOAD BAD RESPONSE:", res.data);
        return reply("❌ Upload échoué (catbox a refusé). Réessaie.");
      }

      return reply(`✅ URL :\n${url}`);

    } catch (e) {
      console.log("URL CMD ERROR:", e?.message || e);
      return reply("❌ Erreur upload. Vérifie que *axios* et *form-data* sont installés.");
    }
  }
};