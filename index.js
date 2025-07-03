const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  REST,
  Routes,
  InteractionType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load commands
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Deploy commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: client.commands.map(cmd => cmd.data.toJSON()) }
    );
    console.log('✅ Commands registered!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ Error executing command.', ephemeral: true });
      }
    }
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'verify_setup_modal') {
    const setupCommand = require('./commands/setup-verify.js');
    try {
      await setupCommand.handleModal(interaction);
    } catch (err) {
      console.error(err);
    }
  }

  if (interaction.isChannelSelectMenu() && interaction.customId === 'select_verify_channel') {
    const setupCommand = require('./commands/setup-verify.js');
    try {
      await setupCommand.handleChannelSelect(interaction);
    } catch (err) {
      console.error(err);
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'verify_select') {
    const configPath = path.join(__dirname, 'verifyRules.json');
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    const data = config[interaction.guild.id];

    if (!data) {
      return interaction.reply({ content: '⚠️ Rules not found. Please re-run `/setup-verify`.', ephemeral: true });
    }

    const rulesEmbed = new EmbedBuilder()
      .setTitle('📜 Server Rules')
      .setDescription(data.rules)
      .setColor('#000000')
      .setFooter({ text: 'Nuvix Bot', iconURL: interaction.client.user.displayAvatarURL() });

    const acceptButton = new ButtonBuilder()
      .setCustomId('accept_rules')
      .setLabel('✅ Accept Rules')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(acceptButton);
    await interaction.reply({ embeds: [rulesEmbed], components: [row], ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'accept_rules') {
    const modal = new ModalBuilder()
      .setCustomId('verify_modal')
      .setTitle('📝 Final Step: Enter Your Name');

    const nameInput = new TextInputBuilder()
      .setCustomId('name_input')
      .setLabel('Enter your name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Example: Zander')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'verify_modal') {
    const name = interaction.fields.getTextInputValue('name_input');
    const guild = interaction.guild;

    let role = guild.roles.cache.find(r => r.name.toLowerCase() === 'verified');
    if (!role) {
      role = await guild.roles.create({
        name: 'Verified',
        color: '#00ffff',
        reason: 'Auto-created for verification'
      });

      const botMember = await guild.members.fetchMe();
      await guild.roles.setPosition(role, botMember.roles.highest.position - 1);
    }

    await interaction.member.roles.add(role).catch(err => {
      console.error('❌ Failed to assign Verified role:', err);
    });

    const confirmedEmbed = new EmbedBuilder()
      .setColor('#00ffff')
      .setTitle('✅ You Are Verified!')
      .setDescription(`Thanks **${name}**, you've been verified and granted access.`)
      .setFooter({ text: 'Welcome aboard!', iconURL: interaction.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [confirmedEmbed], ephemeral: true });
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
