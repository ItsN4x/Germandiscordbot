const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const PREFIX = '!';

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ─── !kick ───────────────────────────────────────────────
  if (command === 'kick') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply('❌ Du hast keine Berechtigung zum Kicken!');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Bitte erwähne einen User: `!kick @User [Grund]`');

    const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';

    try {
      await target.kick(reason);
      const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('👢 User gekickt')
        .addFields(
          { name: 'User', value: `${target.user.tag}`, inline: true },
          { name: 'Moderator', value: `${message.author.tag}`, inline: true },
          { name: 'Grund', value: reason }
        )
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    } catch (err) {
      message.reply('❌ Konnte den User nicht kicken. Fehlende Berechtigungen?');
    }
  }

  // ─── !ban ────────────────────────────────────────────────
  if (command === 'ban') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ Du hast keine Berechtigung zum Bannen!');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Bitte erwähne einen User: `!ban @User [Grund]`');

    const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';

    try {
      await target.ban({ reason });
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔨 User gebannt')
        .addFields(
          { name: 'User', value: `${target.user.tag}`, inline: true },
          { name: 'Moderator', value: `${message.author.tag}`, inline: true },
          { name: 'Grund', value: reason }
        )
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    } catch (err) {
      message.reply('❌ Konnte den User nicht bannen. Fehlende Berechtigungen?');
    }
  }

  // ─── !unban ──────────────────────────────────────────────
  if (command === 'unban') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ Du hast keine Berechtigung!');
    }

    const userId = args[0];
    if (!userId) return message.reply('❌ Bitte gib eine User-ID an: `!unban 123456789`');

    try {
      await message.guild.members.unban(userId);
      message.reply(`✅ User **${userId}** wurde entbannt.`);
    } catch (err) {
      message.reply('❌ User nicht gefunden oder nicht gebannt.');
    }
  }

  // ─── !mute ───────────────────────────────────────────────
  if (command === 'mute') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ Du hast keine Berechtigung zum Muten!');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Bitte erwähne einen User: `!mute @User [Minuten] [Grund]`');

    const minutes = parseInt(args[1]) || 10;
    const reason = args.slice(2).join(' ') || 'Kein Grund angegeben';
    const duration = minutes * 60 * 1000;

    try {
      await target.timeout(duration, reason);
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔇 User gemutet')
        .addFields(
          { name: 'User', value: `${target.user.tag}`, inline: true },
          { name: 'Moderator', value: `${message.author.tag}`, inline: true },
          { name: 'Dauer', value: `${minutes} Minuten`, inline: true },
          { name: 'Grund', value: reason }
        )
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    } catch (err) {
      message.reply('❌ Konnte den User nicht muten. Fehlende Berechtigungen?');
    }
  }

  // ─── !unmute ─────────────────────────────────────────────
  if (command === 'unmute') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ Du hast keine Berechtigung!');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Bitte erwähne einen User: `!unmute @User`');

    try {
      await target.timeout(null);
      message.reply(`✅ **${target.user.tag}** wurde entmutet.`);
    } catch (err) {
      message.reply('❌ Konnte den User nicht entmuten.');
    }
  }

  // ─── !clear ──────────────────────────────────────────────
  if (command === 'clear') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ Du hast keine Berechtigung!');
    }

    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply('❌ Bitte gib eine Zahl zwischen 1 und 100 an: `!clear 10`');
    }

    try {
      await message.channel.bulkDelete(amount + 1, true);
      const msg = await message.channel.send(`✅ **${amount}** Nachrichten gelöscht.`);
      setTimeout(() => msg.delete().catch(() => {}), 3000);
    } catch (err) {
      message.reply('❌ Nachrichten konnten nicht gelöscht werden (älter als 14 Tage?).');
    }
  }

  // ─── !warn ───────────────────────────────────────────────
  if (command === 'warn') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply('❌ Du hast keine Berechtigung!');
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Bitte erwähne einen User: `!warn @User [Grund]`');

    const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';

    const embed = new EmbedBuilder()
      .setColor('#FFFF00')
      .setTitle('⚠️ User verwarnt')
      .addFields(
        { name: 'User', value: `${target.user.tag}`, inline: true },
        { name: 'Moderator', value: `${message.author.tag}`, inline: true },
        { name: 'Grund', value: reason }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });

    // DM den User
    try {
      await target.send(`⚠️ Du wurdest auf **${message.guild.name}** verwarnt!\n**Grund:** ${reason}`);
    } catch {}
  }

  // ─── !help ───────────────────────────────────────────────
  if (command === 'help') {
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📋 Bot Befehle')
      .setDescription('Alle Moderations-Befehle:')
      .addFields(
        { name: '`!kick @User [Grund]`', value: 'Kickt einen User' },
        { name: '`!ban @User [Grund]`', value: 'Bannt einen User' },
        { name: '`!unban <UserID>`', value: 'Entbannt einen User' },
        { name: '`!mute @User [Minuten] [Grund]`', value: 'Mutet einen User (Standard: 10 Min)' },
        { name: '`!unmute @User`', value: 'Entmutet einen User' },
        { name: '`!warn @User [Grund]`', value: 'Verwarnt einen User' },
        { name: '`!clear <Anzahl>`', value: 'Löscht Nachrichten (max. 100)' },
      )
      .setFooter({ text: 'Moderation Bot' })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  }
});

// Keep-alive HTTP server für Render/UptimeRobot
const http = require('http');
http.createServer((req, res) => res.end('Bot läuft!')).listen(3000, () => {
  console.log('🌐 Keep-alive Server läuft auf Port 3000');
});

client.login(process.env.TOKEN);
