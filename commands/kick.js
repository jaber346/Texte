module.exports = {
  name: "kick",
  run: async (sock, m, args, { isGroup, from, sender, reply }) => {

    if (!isGroup)
      return reply("❌ Cette commande est réservée aux groupes.");

    // Récupération des infos du groupe
    const metadata = await sock.groupMetadata(from);
    const participants = metadata.participants;

    // Vérifie si le bot est admin
    const bot = participants.find(p => p.id === sock.user.id);
    if (!bot || bot.admin !== "admin")
      return reply("❌ Je dois être admin pour kick quelqu’un.");

    // Vérifie si l'utilisateur est admin
    const user = participants.find(p => p.id === sender);
    if (!user || user.admin !== "admin")
      return reply("❌ Seuls les admins peuvent utiliser cette commande.");

    // Récupère la cible
    let target;

    if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (args[0]) {
      target = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    }

    if (!target)
      return reply("❌ Mentionne un membre ou ajoute son numéro.\nEx: .kick @user");

    // Empêche de kick le propriétaire
    if (target === sock.user.id)
      return reply("❌ Je ne peux pas me kick moi-même.");

    try {
      await sock.groupParticipantsUpdate(from, [target], "remove");
      reply("✅ Membre expulsé avec succès.");
    } catch (err) {
      console.log("KICK ERROR:", err);
      reply("❌ Impossible de kick ce membre.");
    }
  }
};