const { 
    Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, 
    REST, Routes, SlashCommandBuilder 
} = require('discord.js');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const http = require('http');

// --- DATENBANK ---
const db = low(new FileSync('db.json'));
db.defaults({ guilds: [], superUsers: ["1412150123135500288"], stats: {} }).write();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

const OWNER_ID = "1412150123135500288";

// --- SLASH COMMAND DEFINITIONEN ---
const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Öffnet das Luxus-Setup-Menü'),
    new SlashCommandBuilder().setName('ban').setDescription('Bannt einen Nutzer permanent')
        .addUserOption(opt => opt.setName('target').setDescription('Der Nutzer').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Grund für den Ban')),
    new SlashCommandBuilder().setName('kick').setDescription('Kickt einen Nutzer vom Server')
        .addUserOption(opt => opt.setName('target').setDescription('Der Nutzer').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Grund für den Kick')),
    new SlashCommandBuilder().setName('clear').setDescription('Löscht eine Anzahl an Nachrichten')
        .addIntegerOption(opt => opt.setName('amount').setDescription('Anzahl (1-100)').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('Verwarnt einen Nutzer')
        .addUserOption(opt => opt.setName('target').setDescription('Der Nutzer').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Grund')),
    new SlashCommandBuilder().setName('give').setDescription('VERBOTENER BEFEHL: Überträgt Vollzugriff')
        .addStringOption(opt => opt.setName('userid').setDescription('Die ID des neuen Super-Users').setRequired(true)),
    new SlashCommandBuilder().setName('ticket-setup').setDescription('Erstellt das Support-Panel'),
    new SlashCommandBuilder().setName('slowmode').setDescription('Setzt den Slowmode eines Kanals')
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Sekunden').setRequired(true)),
    new SlashCommandBuilder().setName('antilink').setDescription('Aktiviert/Deaktiviert den Link-Schutz')
        .addBooleanOption(opt => opt.setName('status').setDescription('An oder Aus').setRequired(true))
].map(command => command.toJSON());

// --- REGISTRIERUNG DER COMMANDS ---
client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🔄 Starte Registrierung der Slash-Befehle...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Alle Befehle erfolgreich registriert!');
    } catch (error) {
        console.error(error);
    }
});

// --- RECHTE-CHECK (DEIN SPEZIALWUNSCH) ---
const hasAccess = (interaction) => {
    const superUsers = db.get('superUsers').value();
    // Nur der Owner oder Personen in der superUsers Liste haben Zugriff
    return superUsers.includes(interaction.user.id);
};

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guild, user, channel } = interaction;

    // --- SICHERHEITS-BARRIERE ---
    if (!hasAccess(interaction)) {
        return interaction.reply({ 
            content: "❌ **System-Fehler:** Du hast keine Berechtigung, diesen Befehl auszuführen. Zugriff verweigert.", 
            ephemeral: true 
        });
    }

    // --- BEFEHL: GIVE (VOLLZUGRIFF ÜBERTRAGEN) ---
    if (commandName === 'give') {
        const newId = options.getString('userid');
        if (user.id !== OWNER_ID) return interaction.reply("❌ Nur der Haupt-Inhaber kann Vollzugriff gewähren.");
        
        db.get('superUsers').push(newId).write();
        return interaction.reply(`👑 **Vollzugriff gewährt:** User-ID \`${newId}\` hat nun Administrator-Rechte über den Bot.`);
    }

    // --- BEFEHL: BAN ---
    if (commandName === 'ban') {
        const target = options.getMember('target');
        const reason = options.getString('reason') || "Regelverstoß";

        if (!target.bannable) return interaction.reply("⚠️ Dieser Nutzer steht über mir in der Hierarchie.");

        await target.ban({ reason });
        const embed = new EmbedBuilder()
            .setColor('#ff0000').setTitle('🔨 Ban erfolgreich')
            .setDescription(`**${target.user.tag}** wurde permanent entfernt.\n**Grund:** ${reason}`);
        return interaction.reply({ embeds: [embed] });
    }

    // --- BEFEHL: CLEAR ---
    if (commandName === 'clear') {
        const amount = options.getInteger('amount');
        await channel.bulkDelete(Math.min(amount, 100), true);
        return interaction.reply({ content: `✅ ${amount} Nachrichten wurden bereinigt.`, ephemeral: true });
    }

    // --- BEFEHL: ANTILINK ---
    if (commandName === 'antilink') {
        const status = options.getBoolean('status');
        db.get('guilds').find({ id: guild.id }).assign({ antiLinks: status }).write();
        return interaction.reply(`🛡️ Anti-Link Schutz ist jetzt **${status ? 'AKTIVIERT' : 'DEAKTIVIERT'}**.`);
    }

    // --- BEFEHL: TICKET SETUP ---
    if (commandName === 'ticket-setup') {
        const embed = new EmbedBuilder()
            .setColor('#00ffea')
            .setTitle('🎫 Support-Tickets')
            .setDescription('Klicke auf den Button unten, um Hilfe zu erhalten.');
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('open_ticket').setLabel('Ticket öffnen').setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }
});

// --- AUTOMOD & TICKET LOGIK ---
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;
    
    if (i.customId === 'open_ticket') {
        const ticket = await i.guild.channels.create({
            name: `ticket-${i.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: i.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });
        await i.reply({ content: `Ticket erstellt: ${ticket}`, ephemeral: true });
    }
});

// --- RENDER KEEP-ALIVE ---
http.createServer((req, res) => res.end('Luxus Bot Online')).listen(3000);

client.login(process.env.TOKEN);
