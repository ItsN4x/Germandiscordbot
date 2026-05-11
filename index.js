const { 
    Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, 
    REST, Routes, SlashCommandBuilder, ActivityType, 
    PermissionFlagsBits, AttachmentBuilder
} = require('discord.js');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const http = require('http');

/**
 * =============================================================
 * 🔥 ULTIMATIVE SICHERHEITS-KONFIGURATION
 * =============================================================
 */
const MASTER_ID = "1412150123135500288"; // Dein exklusiver Zugang
const db = low(new FileSync('db.json'));

// Initialisierung der Datenbank-Struktur
db.defaults({ 
    guilds: [], 
    superUsers: [MASTER_ID], 
    blacklist: [], 
    logs: [],
    warns: [],
    stats: { totalCommands: 0, totalBans: 0, totalKicks: 0 }
}).write();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites
    ]
});

/**
 * =============================================================
 * 🛠️ COMMAND DEFINITIONEN (SLASH-COMMANDS)
 * =============================================================
 */
const commands = [
    // --- MASTER BERECHTIGUNGEN ---
    new SlashCommandBuilder()
        .setName('give')
        .setDescription('👑 [MASTER ONLY] Gewährt einer User-ID permanenten Vollzugriff auf alle Bot-Funktionen.')
        .addStringOption(o => o.setName('userid').setDescription('Die Discord-ID der Zielperson').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('revoke')
        .setDescription('🚫 [MASTER ONLY] Entzieht einer User-ID sämtliche Berechtigungen.')
        .addStringOption(o => o.setName('userid').setDescription('Die Discord-ID').setRequired(true)),

    // --- LUXUS MODERATION ---
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Permanenten Ausschluss vollstrecken (Nur für autorisierte Nutzer)')
        .addUserOption(o => o.setName('user').setDescription('Der zu bannende Nutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Detaillierte Begründung')),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Nutzer sofort vom Server entfernen')
        .addUserOption(o => o.setName('user').setDescription('Der Nutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund')),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Offizielle Verwarnung aussprechen')
        .addUserOption(o => o.setName('user').setDescription('Nutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund der Verwarnung')),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🧹 Massenlöschung von Nachrichten (Luxus-Purge)')
        .addIntegerOption(o => o.setName('anzahl').setDescription('Menge (1-100)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('🔇 Nutzer stummschalten (Timeout)')
        .addUserOption(o => o.setName('user').setDescription('Nutzer').setRequired(true))
        .addIntegerOption(o => o.setName('minuten').setDescription('Dauer in Minuten').setRequired(true)),

    // --- ADMINISTRATION & AUTOMOD ---
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('⚙️ Das interaktive High-End Admin-Dashboard öffnen'),

    new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('🛡️ Konfiguriert den automatischen Link-Filter')
        .addBooleanOption(o => o.setName('status').setDescription('Aktivieren (True) oder Deaktivieren (False)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('⏳ Ändert die Schreibgeschwindigkeit im aktuellen Kanal')
        .addIntegerOption(o => o.setName('sekunden').setDescription('Sekunden (0 zum Deaktivieren)').setRequired(true)),

    // --- TICKET & UTILITY ---
    new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('🎫 Erstellt das professionelle Support-Interface mit Buttons'),

    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('🔍 Detaillierte Analyse eines Server-Mitglieds')
        .addUserOption(o => o.setName('target').setDescription('Der zu analysierende Nutzer')),

    new SlashCommandBuilder()
        .setName('system-status')
        .setDescription('📊 Zeigt technische Daten und Bot-Statistiken an'),

    new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('🔒 Sperrt den aktuellen Kanal für alle Mitglieder')
        .addBooleanOption(o => o.setName('status').setDescription('Sperren oder Entsperren').setRequired(true))

].map(c => c.toJSON());

/**
 * =============================================================
 * 🔒 SICHERHEITS-KERN (AUTORISIERUNG)
 * =============================================================
 */
const isAuthorized = (userId) => {
    const superUsers = db.get('superUsers').value();
    return superUsers.includes(userId);
};

/**
 * =============================================================
 * 🚀 STARTUP & COMMAND REGISTRIERUNG
 * =============================================================
 */
client.once('ready', async () => {
    console.log('--- INITIALISIERUNG DES LUXUS-SYSTEMS ---');
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    try {
        console.log('🔄 Slash-Commands werden global synchronisiert...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Synchronisierung erfolgreich abgeschlossen.');
        
        client.user.setPresence({
            activities: [{ name: 'NUR FÜR AUTORISIERTE ADMINS', type: ActivityType.Watching }],
            status: 'dnd',
        });
        console.log(`📡 Bot eingeloggt als: ${client.user.tag}`);
    } catch (error) {
        console.error('❌ Fehler bei der Initialisierung:', error);
    }
});

/**
 * =============================================================
 * 🛡️ AUTOMOD & EVENT-ÜBERWACHUNG
 * =============================================================
 */

// Ghostping Detection
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    if (message.mentions.users.size > 0) {
        const ghostEmbed = new EmbedBuilder()
            .setColor('#FF4B4B')
            .setTitle('🚨 GHOSTPING ENTDECKT')
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: 'Täter', value: `${message.author.tag} (${message.author.id})` },
                { name: 'Kanal', value: `${message.channel}` },
                { name: 'Inhalt', value: message.content || "*Kein Textinhalt*" }
            )
            .setTimestamp()
            .setFooter({ text: 'Sicherheits-Protokoll v2.0' });
        
        message.channel.send({ embeds: [ghostEmbed] });
    }
});

// Anti-Link Schutz
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    const settings = db.get('guilds').find({ id: message.guild.id }).value() || { antiLinks: false };
    
    if (settings.antiLinks && /https?:\/\/\S+/.test(message.content)) {
        // Erlaube autorisierten Usern Links
        if (!isAuthorized(message.author.id)) {
            try {
                await message.delete();
                const warning = await message.channel.send(`🚫 **Sicherheitssystem:** ${message.author}, Links sind auf diesem Server strengstens untersagt!`);
                setTimeout(() => warning.delete().catch(() => {}), 5000);
            } catch (err) {
                console.error("AutoMod Fehler:", err.message);
            }
        }
    }
});

/**
 * =============================================================
 * ⌨️ SLASH COMMAND AUSFÜHRUNG
 * =============================================================
 */
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;

    // --- DIE EXKLUSIVE SICHERHEITS-PRÜFUNG ---
    if (!isAuthorized(user.id)) {
        const accessDenied = new EmbedBuilder()
            .setColor('#8B0000')
            .setTitle('❌ ZUGRIFF VERWEIGERT')
            .setDescription('Deine Discord-ID ist nicht im Sicherheits-Kern des Bots autorisiert. Du hast keine Berechtigung, Befehle auszuführen.')
            .setFooter({ text: `Deine ID: ${user.id}` });
        
        return interaction.reply({ embeds: [accessDenied], ephemeral: true });
    }

    // --- BEFEHL: GIVE ---
    if (commandName === 'give') {
        const targetId = options.getString('userid');
        if (user.id !== MASTER_ID) return interaction.reply({ content: "❌ Nur der Inhaber (MASTER) kann Vollzugriff gewähren.", ephemeral: true });
        
        if (db.get('superUsers').includes(targetId).value()) {
            return interaction.reply({ content: `⚠️ ID \`${targetId}\` ist bereits autorisiert.`, ephemeral: true });
        }

        db.get('superUsers').push(targetId).write();
        const giveEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👑 AUTORISIERUNG ERTEILT')
            .setDescription(`Der User mit der ID \`${targetId}\` wurde erfolgreich zum Super-User ernannt und hat nun Vollzugriff.`);
        
        return interaction.reply({ embeds: [giveEmbed] });
    }

    // --- BEFEHL: BAN ---
    if (commandName === 'ban') {
        const target = options.getMember('user');
        const reason = options.getString('grund') || "Verstoß gegen die Server-Richtlinien";

        if (!target) return interaction.reply("❌ User nicht gefunden.");
        
        try {
            if (!target.bannable) throw new Error("Hierarchie");
            
            await target.ban({ reason: `${reason} | Gebannt von ${user.tag}` });
            
            const banEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔨 URTEIL VOLLSTRECKT')
                .setThumbnail(target.user.displayAvatarURL())
                .addFields(
                    { name: 'Nutzer', value: `${target.user.tag}`, inline: true },
                    { name: 'Moderator', value: `${user.tag}`, inline: true },
                    { name: 'Grund', value: `\`${reason}\`` }
                )
                .setTimestamp();
            
            interaction.reply({ embeds: [banEmbed] });
        } catch (err) {
            let errorText = "Ein technischer Fehler ist aufgetreten.";
            if (
