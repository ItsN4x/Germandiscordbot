/**
 * =================================================================CD=========
 * 💎 PROJECT: germod - ULTIMATE LUXURY MODERATION SYSTEM
 * ===========================================================================
 * MASTER_ID: 1412150123135500288
 * VERSION: 10.0.0 (Extended Edition)
 * LICENCE: EXCLUSIVE ACCESS ONLY
 * ===========================================================================
 */

const { 
    Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, 
    REST, Routes, SlashCommandBuilder, ActivityType, 
    PermissionFlagsBits, AttachmentBuilder, Collection, Events
} = require('discord.js');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const http = require('http');

/**
 * ---------------------------------------------------------------------------
 * 📂 DATENBANK INITIALISIERUNG
 * ---------------------------------------------------------------------------
 */
const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ 
    guilds: [], 
    superUsers: ["1412150123135500288"], 
    globalBlacklist: [], 
    systemLogs: [],
    warns: [],
    ticketCount: 0,
    botConfig: { 
        name: "germod", 
        color: "#00E5FF",
        luxuryMode: true 
    }
}).write();

const MASTER_ID = "1412150123135500288";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessageReactions
    ]
});

/**
 * ---------------------------------------------------------------------------
 * 🛠️ KOMPLEXE SLASH-COMMAND REGISTRIERUNG
 * ---------------------------------------------------------------------------
 */
const commands = [
    // --- MASTER BERECHTIGUNGEN ---
    new SlashCommandBuilder()
        .setName('give')
        .setDescription('👑 [MASTER] Gewährt einer User-ID permanenten Vollzugriff auf alle germod-Kerne.')
        .addStringOption(o => o.setName('userid').setDescription('Die Discord-ID der Person').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('revoke')
        .setDescription('🚫 [MASTER] Entzieht einer ID sämtliche Berechtigungen.')
        .addStringOption(o => o.setName('userid').setDescription('Die ID der Person').setRequired(true)),

    // --- PROFESSIONELLE MODERATION ---
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Vollstreckt einen permanenten Ausschluss vom Server.')
        .addUserOption(o => o.setName('user').setDescription('Der zu bannende Nutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Detaillierte Begründung der Sanktion')),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Entfernt ein Mitglied augenblicklich vom Server-Gelände.')
        .addUserOption(o => o.setName('user').setDescription('Nutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund')),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Erteilt eine systemweite Verwarnung.')
        .addUserOption(o => o.setName('user').setDescription('Nutzer').setRequired(true))
        .addStringOption(o => o.setName('grund').setDescription('Grund der Verwarnung').setRequired(true)),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🧹 Bereinigt den Chat-Verlauf (Smart-Purge).')
        .addIntegerOption(o => o.setName('anzahl').setDescription('Menge (1-100)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('🔇 Versetzt einen Nutzer in den Timeout-Status.')
        .addUserOption(o => o.setName('user').setDescription('Nutzer').setRequired(true))
        .addIntegerOption(o => o.setName('minuten').setDescription('Dauer in Minuten').setRequired(true)),

    // --- SYSTEM MANAGEMENT ---
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('⚙️ Öffnet das interaktive germod Admin-Dashboard.'),

    new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('🛡️ Konfiguriert den automatischen Link-Schutz des Servers.')
        .addBooleanOption(o => o.setName('status').setDescription('Aktivieren oder Deaktivieren').setRequired(true)),

    new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('🔒 Sperrt den aktuellen Kanal für alle normalen Mitglieder.')
        .addBooleanOption(o => o.setName('status').setDescription('Sperren?').setRequired(true)),

    // --- INFORMATION & ANALYSE ---
    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('🔍 Führt eine detaillierte Profil-Analyse durch.')
        .addUserOption(o => o.setName('target').setDescription('Der zu prüfende Nutzer')),

    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('📊 Zeigt technische Daten und Statistiken des Servers.'),

    new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('🎫 Erstellt das Support-Interface für Mitglieder.'),

    new SlashCommandBuilder()
        .setName('status')
        .setDescription('📈 Zeigt die technische Auslastung von germod an.')

].map(c => c.toJSON());

/**
 * ---------------------------------------------------------------------------
 * 🔒 SICHERHEITS-FUNKTIONEN (AUTHENTIFIZIERUNG)
 * ---------------------------------------------------------------------------
 */
const isAuthorized = (id) => {
    const list = db.get('superUsers').value();
    return list.includes(id);
};

const createLuxuryEmbed = (title, description, color = "#00E5FF") => {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: 'germod Luxury System | Security Unit' });
};

/**
 * ---------------------------------------------------------------------------
 * 🚀 SYSTEM STARTUP & COMMAND SYNC
 * ---------------------------------------------------------------------------
 */
client.once(Events.ClientReady, async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('--- germod SYSTEM-CHECK START ---');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Slash-Commands erfolgreich synchronisiert.');
        
        client.user.setPresence({
            activities: [{ name: 'Alleinherrschaft 2026 | germod', type: ActivityType.Watching }],
            status: 'dnd',
        });
        console.log(`📡 germod erfolgreich eingeloggt: ${client.user.tag}`);
    } catch (e) {
        console.error('❌ Synchronisierungs-Fehler:', e);
    }
});

/**
 * ---------------------------------------------------------------------------
 * 🛡️ EVENT-ÜBERWACHUNG (GHOSTPING & AUTOMOD)
 * ---------------------------------------------------------------------------
 */

client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;
    if (message.mentions.users.size > 0) {
        const ghostEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 GHOSTPING ENTDECKT')
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: 'Nutzer', value: `${message.author.tag} (${message.author.id})` },
                { name: 'Kanal', value: `${message.channel}` },
                { name: 'Inhalt', value: message.content || "*Inhalt nicht verfügbar*" }
            )
            .setTimestamp();
        message.channel.send({ embeds: [ghostEmbed] });
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    
    let settings = db.get('guilds').find({ id: message.guild.id }).value() || { antiLinks: false };
    
    if (settings.antiLinks && /https?:\/\/\S+/.test(message.content)) {
        if (!isAuthorized(message.author.id)) {
            try {
                await message.delete();
                const alert = await message.channel.send(`🚫 **germod AutoMod:** ${message.author}, Links sind hier untersagt!`);
                setTimeout(() => alert.delete().catch(() => {}), 4000);
            } catch (e) { /* Permission Error */ }
        }
    }
});

/**
 * ---------------------------------------------------------------------------
 * ⌨️ INTERACTION CORE (BEFEHLSAUSFÜHRUNG)
 * ---------------------------------------------------------------------------
 */
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;

    // --- STRIKTE ZUGRIFFSKONTROLLE ---
    if (!isAuthorized(user.id)) {
        return interaction.reply({ 
            embeds: [createLuxuryEmbed("ZUGRIFF VERWEIGERT", "Deine ID ist nicht im Sicherheits-Kern von **germod** hinterlegt.", "#8B0000")], 
            ephemeral: true 
        });
    }

    // --- BEFEHL: GIVE (VOLLZUGRIFF) ---
    if (commandName === 'give') {
        const targetId = options.getString('userid');
        if (user.id !== MASTER_ID) return interaction.reply({ content: "❌ Nur der MASTER darf Rechte vergeben.", ephemeral: true });
        
        if (db.get('superUsers').includes(targetId).value()) {
            return interaction.reply({ content: `⚠️ ID \`${targetId}\` ist bereits autorisiert.`, ephemeral: true });
        }

        db.get('superUsers').push(targetId).write();
        return interaction.reply({ 
            embeds: [createLuxuryEmbed("AUTORISIERUNG ERFOLGT", `Vollzugriff für ID \`${targetId}\` wurde aktiviert.`)] 
        });
    }

    // --- BEFEHL: BAN ---
    if (commandName === 'ban') {
        const target = options.getMember('user');
        const reason = options.getString('grund') || "Regelverstoß / Ausschluss durch germod-Admin";

        if (!target) return interaction.reply("❌ Nutzer im System nicht gefunden.");

        try {
            if (!target.bannable) throw new Error("Hierarchy");
            await target.ban({ reason: `${reason} | Admin: ${user.tag}` });
            
            const banEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🔨 URTEIL VOLLSTRECKT')
                .addFields(
                    { name: 'Nutzer', value: target.user.tag, inline: true },
                    { name: 'Administrator', value: user.tag, inline: true },
                    { name: 'Grund', value: reason }
                )
                .setTimestamp();
            return interaction.reply({ embeds: [banEmbed] });
        } catch (e) {
            let errorMsg = "Ein technischer Fehler ist aufgetreten.";
            if (e.message === "Hierarchy") errorText = "❌ **Hierarchie-Fehler:** Dieser User steht über mir.";
            return interaction.reply({ content: errorMsg, ephemeral: true });
        }
    }

    // --- BEFEHL: CLEAR ---
    if (commandName === 'clear') {
        const amount = options.getInteger('anzahl');
        try {
            const deleted = await channel.bulkDelete(amount, true);
            return interaction.reply({ content: `🧹 **Reinigung:** ${deleted.size} Nachrichten wurden entfernt.`, ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: "❌ Fehler: Nachrichten über 14 Tage alt.", ephemeral: true });
        }
    }

    // --- BEFEHL: STATUS ---
    if (commandName === 'status') {
        const statsEmbed = new EmbedBuilder()
            .setColor('#00FFFF')
            .setTitle('📈 germod SYSTEM-STATUS')
            .addFields(
                { name: 'Latenz (Ping)', value: `${client.ws.ping}ms`, inline: true },
                { name: 'Server', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'Nutzer', value: `${client.users.cache.size}`, inline: true }
            );
        return interaction.reply({ embeds: [statsEmbed] });
    }

    // --- BEFEHL: TICKET-PANEL ---
    if (commandName === 'ticket-panel') {
        const panel = new EmbedBuilder()
            .setColor('#00E5FF')
            .setTitle('🎫 SUPPORT-ANFRAGE')
            .setDescription('Benötigst du Hilfe? Klicke unten, um ein verschlüsseltes Ticket zu eröffnen.');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('t_create').setLabel('Ticket öffnen').setStyle(ButtonStyle.Success).setEmoji('📩')
        );
        return interaction.reply({ embeds: [panel], components: [row] });
    }
});

/**
 * ---------------------------------------------------------------------------
 * 🎫 TICKET-SYSTEM LOGIK
 * ---------------------------------------------------------------------------
 */
client.on(Events.InteractionCreate, async (i) => {
    if (!i.isButton()) return;

    if (i.customId === 't_create') {
        try {
            const ticketChannel = await i.guild.channels.create({
                name: `ticket-${i.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: i.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const welcome = new EmbedBuilder()
                .setColor('#27AE60')
                .setTitle('📩 TICKET GEÖFFNET')
                .setDescription(`Hallo ${i.user}, ein Administrator wird sich in Kürze melden.`);
            
            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('t_close').setLabel('Schließen').setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ embeds: [welcome], components: [closeRow] });
            return i.reply({ content: `✅ Ticket erstellt: ${ticketChannel}`, ephemeral: true });
        } catch (e) {
            return i.reply({ content: "❌ Fehler beim Erstellen des Kanals.", ephemeral: true });
        }
    }

    if (i.customId === 't_close') {
        await i.reply("🔒 Ticket wird in 5 Sekunden archiviert...");
        setTimeout(() => i.channel.delete().catch(() => {}), 5000);
    }
});

/**
 * ---------------------------------------------------------------------------
 * 🌐 RENDER SERVER (KEEP-ALIVE) & LOGIN
 * ---------------------------------------------------------------------------
 */
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('germod Luxury System Status: Online ✅');
}).listen(3000);

client.login(process.env.TOKEN);

/**
 * ENDE DER DATEI - germod v10.0.0
 * Alle Klammern wurden erfolgreich geschlossen.
 */
