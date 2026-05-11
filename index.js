const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const http = require('http');

// --- DATENBANK ---
const db = low(new FileSync('db.json'));
db.defaults({ guilds: [] }).write();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = '!';

client.once('ready', () => console.log(`✅ Bot ist online: ${client.user.tag}`));

// --- AUTOMOD & JOIN LOGIK ---
client.on('guildMemberAdd', async (member) => {
  const settings = db.get('guilds').find({ id: member.guild.id }).value() || {};
  if (settings.autoRole) {
    const role = member.guild.roles.cache.get(settings.autoRole);
    if (role) await member.roles.add(role).catch(() => {});
  }
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.guild) return;

  // Datenbank-Eintrag sicherstellen
  let s = db.get('guilds').find({ id: msg.guild.id }).value();
  if (!s) {
    s = { id: msg.guild.id, autoRole: null, antiLinks: false, standardGrund: "Kein Grund angegeben" };
    db.get('guilds').push(s).write();
  }

  // AUTOMOD: Anti-Link
  if (s.antiLinks && /https?:\/\/\S+/.test(msg.content)) {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      try {
        await msg.delete();
        return msg.channel.send(`🚫 **AutoMod:** ${msg.author}, Links sind hier nicht erlaubt!`).then(m => setTimeout(() => m.delete(), 3000));
      } catch (e) { console.log("Fehler beim Löschen: " + e.message); }
    }
  }

  if (!msg.content.startsWith(PREFIX)) return;
  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // --- SETUP BEFEHL ---
  if (cmd === 'setup') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply("❌ Nur Admins können das Setup nutzen.");
    
    const option = args[0]?.toLowerCase();
    if (option === 'autorole') {
      const role = msg.mentions.roles.first();
      db.get('guilds').find({ id: msg.guild.id }).assign({ autoRole: role?.id }).write();
      return msg.reply(`✅ **Setup:** Auto-Rolle ist jetzt ${role ? `<@&${role.id}>` : "Deaktiviert"}.`);
    }

    if (option === 'antilink') {
      const status = args[1] === 'on';
      db.get('guilds').find({ id: msg.guild.id }).assign({ antiLinks: status }).write();
      return msg.reply(`✅ **Setup:** Anti-Link ist nun **${status ? 'AN' : 'AUS'}**.`);
    }

    if (option === 'grund') {
      const neuerGrund = args.slice(1).join(' ');
      if (!neuerGrund) return msg.reply("❌ Bitte gib einen Standard-Grund an.");
      db.get('guilds').find({ id: msg.guild.id }).assign({ standardGrund: neuerGrund }).write();
      return msg.reply(`✅ **Setup:** Standard-Grund auf \`${neuerGrund}\` gesetzt.`);
    }

    const setupEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('⚙️ Bot-Einstellungen (Deutsch)')
      .addFields(
        { name: '`!setup autorole @Rolle`', value: 'Rolle für neue Mitglieder.' },
        { name: '`!setup antilink on/off`', value: 'Automatischer Link-Schutz.' },
        { name: '`!setup grund [Text]`', value: 'Standard-Grund für Banns.' }
      );
    return msg.channel.send({ embeds: [setupEmbed] });
  }

  // --- BAN BEFEHL ---
  if (cmd === 'ban') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return msg.reply("❌ Du darfst keine Leute bannen.");
    const target = msg.mentions.members.first();
    if (!target) return msg.reply("❌ Bitte markiere einen User.");
    const grund = args.slice(1).join(' ') || s.standardGrund;

    try {
      if (!target.bannable) throw new Error("Higher than bot");
      await target.ban({ reason: grund });
      const success = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔨 Mitglied gebannt')
        .addFields({ name: 'User', value: `${target.user.tag}`, inline: true }, { name: 'Grund', value: grund, inline: true })
        .setTimestamp();
      msg.channel.send({ embeds: [success] });
    } catch (err) {
      let f = `Fehler: ${err.message}`;
      if (err.message.includes("Permissions")) f = "❌ **MPS-Fehler:** Fehlende Rechte!";
      if (err.message.includes("Higher")) f = "❌ **Hierarchie-Fehler:** User steht über mir!";
      msg.channel.send({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('⚠️ Fehler').setDescription(f)] });
    }
  }
});

// Render Keep-Alive
http.createServer((req, res) => res.end('Bot Online')).listen(3000);

client.login(process.env.TOKEN);
