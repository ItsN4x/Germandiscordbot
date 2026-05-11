const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const http = require('http');

// --- DATENBANK SETUP ---
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

// --- HILFSFUNKTIONEN ---
const getSettings = (gid) => {
  let s = db.get('guilds').find({ id: gid }).value();
  if (!s) { 
    s = { id: gid, autoRole: null, antiLinks: false, standardGrund: "Kein Grund angegeben (Automatisch)", autoMod: true }; 
    db.get('guilds').push(s).write(); 
  }
  return s;
};

// Verbesserte Fehlermeldungen (MPS/Berechtigungen)
const handleErr = (chan, error) => {
  let msg = "Ein unbekannter Fehler ist aufgetreten.";
  if (error.message.includes("Missing Permissions")) msg = "❌ MPS-Fehler: Ich habe nicht genug Rechte (Permissions). Prüfe meine Rolle!";
  if (error.message.includes("Privileged intent")) msg = "❌ Intent-Fehler: Du musst 'Server Members' im Developer Portal aktivieren!";
  if (error.message.includes("Higher than bot")) msg = "❌ Hierarchie-Fehler: Der User hat eine höhere Rolle als ich!";

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ Technischer Fehler')
    .setDescription(msg)
    .setFooter({ text: `Original-Error: ${error.message}` });
  return chan.send({ embeds: [embed] });
};

client.once('ready', () => console.log(`✅ Bot ist bereit als ${client.user.tag}`));

// --- AUTOMOD LOGIK ---
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.guild) return;
  const s = getSettings(msg.guild.id);

  if (s.antiLinks && /https?:\/\/\S+/.test(msg.content)) {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await msg.delete().catch(() => {});
      return msg.channel.send(`🚫 ${msg.author}, Links sind hier nicht erlaubt! (AutoMod)`);
    }
  }

  if (!msg.content.startsWith(PREFIX)) return;
  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // --- SETUP BEFEHL (DEUTSCH) ---
  if (cmd === 'setup') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) return msg.reply("❌ Nur Admins dürfen das!");

    const sub = args[0]?.toLowerCase();
    if (!sub) {
      const help = new EmbedBuilder()
        .setTitle('⚙️ Bot-Konfiguration')
        .setColor('#5865F2')
        .setDescription('Nutze folgende Befehle zum Einstellen:')
        .addFields(
          { name: '`!setup autorole @Rolle`', value: 'Vergibt automatisch Rollen beim Join.' },
          { name: '`!setup antilink on/off`', value: 'Aktiviert/Deaktiviert den Link-Schutz.' },
          { name: '`!setup grund [Dein Text]`', value: 'Setzt einen Standard-Grund für Bans/Kicks.' }
        );
      return msg.channel.send({ embeds: [help] });
    }

    try {
      if (sub === 'autorole') {
        const role = msg.mentions.roles.first();
        db.get('guilds').find({ id: msg.guild.id }).assign({ autoRole: role?.id }).write();
        msg.reply(`✅ Auto-Rolle wurde auf **${role?.name || 'Deaktiviert'}** gesetzt.`);
      }

      if (sub === 'antilink') {
        const state = args[1] === 'on';
        db.get('guilds').find({ id: msg.guild.id }).assign({ antiLinks: state }).write();
        msg.reply(`✅ Anti-Link ist nun **${state ? 'AKTIVIERT' : 'DEAKTIVIERT'}**.`);
      }

      if (sub === 'grund') {
        const neuerGrund = args.slice(1).join(' ');
        if (!neuerGrund) return msg.reply("❌ Bitte gib einen Text ein.");
        db.get('guilds').find({ id: msg.guild.id }).assign({ standardGrund: neuerGrund }).write();
        msg.reply(`✅ Standard-Grund geändert zu: \`${neuerGrund}\``);
      }
    } catch (e) { handleErr(msg.channel, e); }
  }

  // --- BAN BEFEHL ---
  if (cmd === 'ban') {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
    const target = msg.mentions.members.first();
    if (!target) return msg.reply("❌ Wen soll ich bannen?");

    const grund = args.slice(1).join(' ') || s.standardGrund;

    try {
      await target.ban({ reason: grund });
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔨 User gebannt')
        .addFields(
          { name: 'User', value: target.user.tag, inline
