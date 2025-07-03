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
  ChannelType,
  PermissionsBitField
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

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

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

  if (interaction.isButton()) {
    const { guild, member, user } = interaction;
    const configPath = path.join(__dirname, 'ticketConfig.json');
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    const handlerRoleId = config.handlerRoleId;

    const createTicketChannel = async (categoryName, formData) => {
      let category = guild.channels.cache.find(c => c.name === categoryName.toLowerCase() && c.type === ChannelType.GuildCategory);
      if (!category) {
        category = await guild.channels.create({
          name: categoryName.toLowerCase(),
          type: ChannelType.GuildCategory
        });
      }

      const channel = await guild.channels.create({
        name: `ticket-${user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: handlerRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: guild.members.me.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor('#00ffff')
        .setTitle(`🎫 ${categoryName} Ticket`)
        .addFields(formData.map(f => ({ name: f.label, value: f.value || 'N/A' })))
        .setFooter({ text: `User: ${user.tag}`, iconURL: user.displayAvatarURL() });

      await channel.send({ content: `<@&${handlerRoleId}>`, embeds: [embed] });
      await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    };

    if (interaction.customId === 'accept_rules') {
      const modal = new ModalBuilder().setCustomId('verify_modal').setTitle('📝 Final Step: Enter Your Name');
      const nameInput = new TextInputBuilder()
        .setCustomId('name_input')
        .setLabel('Enter your name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Example: Zander')
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'open_ticket_rust') {
      const modal = new ModalBuilder().setCustomId('modal_rust').setTitle('🛠 Rust Help');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ign').setLabel('In-game or Discord Name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('issue').setLabel('Describe your issue').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    if (interaction.customId === 'open_ticket_discord') {
      const modal = new ModalBuilder().setCustomId('modal_discord').setTitle('💬 Discord Help');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('discord_name').setLabel('Discord Name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('problem').setLabel('Problem?').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return interaction.showModal(modal);
    }

    if (interaction.customId === 'open_ticket_purchase') {
      const modal = new ModalBuilder().setCustomId('modal_purchase').setTitle('💸 Purchase Help');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_name').setLabel('In-game or Discord Name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_type').setLabel('How do I pay? / Verify purchase / Email used').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return interaction.showModal(modal);
    }
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    const id = interaction.customId;

    if (id === 'modal_rust') {
      const fields = [
        { label: 'In-game or Discord Name', value: interaction.fields.getTextInputValue('ign') },
        { label: 'Issue Description', value: interaction.fields.getTextInputValue('issue') }
      ];
      return await createTicketChannel('Rust Help', fields);
    }

    if (id === 'modal_discord') {
      const fields = [
        { label: 'Discord Name', value: interaction.fields.getTextInputValue('discord_name') },
        { label: 'Problem', value: interaction.fields.getTextInputValue('problem') }
      ];
      return await createTicketChannel('Discord Help', fields);
    }

    if (id === 'modal_purchase') {
      const fields = [
        { label: 'In-game or Discord Name', value: interaction.fields.getTextInputValue('purchase_name') },
        { label: 'Purchase Info', value: interaction.fields.getTextInputValue('purchase_type') }
      ];
      return await createTicketChannel('Purchase Help', fields);
    }

    if (id === 'verify_modal') {
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

      await interaction.member.roles.add(role).catch(console.error);

      const confirmedEmbed = new EmbedBuilder()
        .setColor('#00ffff')
        .setTitle('✅ You Are Verified!')
        .setDescription(`Thanks **${name}**, you've been verified and granted access.`)
        .setFooter({ text: 'Welcome aboard!', iconURL: interaction.client.user.displayAvatarURL() });

      return await interaction.reply({ embeds: [confirmedEmbed], ephemeral: true });
    }
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
