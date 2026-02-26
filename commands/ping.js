// ==================== commands/ping.js ====================
module.exports = {
  name: "ping",
  category: "General",
  description: "Tester la vitesse du bot",

  execute: run,
  run
};

async function run(sock, m, args, { currentMode, prefix, reply } = {}) {
  try {
    const from = m.key.remoteJid;

    const start = Date.now();

    // petite attente réelle pour mesurer
    await new Promise(res => setTimeout(res, 50));

    const latency = Date.now() - start;

    const text =
`╭━━〔 ⌬ *NOVA XMD V1* ⌬ 〕━━╮
┃ 🏓 PING STATUS
┣━━━━━━━━━━━━━━━━━━
┃ ⚡ Speed   : ${latency} ms
┃ 🟢 Status  : Online
┃ 🌐 Mode    : ${(currentMode || "public").toUpperCase()}
┃ 🔧 Prefix  : ${prefix || "."}
╰━━━━━━━━━━━━━━━━━━╯`;

    const newsletterContext = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363423249667073@newsletter",
        newsletterName: "NOVA XMD V1",
        serverMessageId: 1
      }
    };

    if (reply) {
      return sock.sendMessage(
        from,
        { text, contextInfo: newsletterContext },
        { quoted: m }
      );
    } else {
      return sock.sendMessage(
        from,
        { text, contextInfo: newsletterContext },
        { quoted: m }
      );
    }

  } catch (err) {
    console.log("PING ERROR:", err);
  }
}