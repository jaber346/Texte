module.exports = {
  name: "autostatus",

  execute: async ({ sock, m, args }) => {
    try {
      const sender = m.key.participant || m.key.remoteJid;
      const senderNumber = sender.split("@")[0];

      if (senderNumber !== global.owner) {
        return sock.sendMessage(
          m.key.remoteJid,
          { text: "❌ Commande réservée au owner." },
          { quoted: m }
        );
      }

      const arg = (args[0] || "").toLowerCase();

      if (arg === "on") {
        global.autoStatus = true;
        return sock.sendMessage(
          m.key.remoteJid,
          { text: "✅ AutoStatus activé." },
          { quoted: m }
        );
      }

      if (arg === "off") {
        global.autoStatus = false;
        return sock.sendMessage(
          m.key.remoteJid,
          { text: "⛔ AutoStatus désactivé." },
          { quoted: m }
        );
      }

      return sock.sendMessage(
        m.key.remoteJid,
        {
          text: "Utilisation:\n.autostatus on\n.autostatus off"
        },
        { quoted: m }
      );

    } catch (err) {
      console.log("AUTOSTATUS CMD ERROR:", err?.message || err);
    }
  }
};