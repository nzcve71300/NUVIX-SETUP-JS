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
  partials: [Partials.Channel],
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

const activeTickets = new Map();

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

  if (interaction.isButton()) {
    if (['ticket_rust', 'ticket_discord', 'ticket_purchase'].includes(interaction.customId)) {
      if (activeTickets.has(interaction.user.id)) {
        return interaction.reply({ content: '❗ You already have an open ticket.', ephemeral: true });
      }

      let modal;

      if (interaction.customId === 'ticket_rust') {
        modal = new ModalBuilder()
          .setCustomId('modal_rust')
          .setTitle('🛠 Rust Help')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('rust_name')
                .setLabel('In-game/Discord Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('rust_issue')
                .setLabel('Describe your issue')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
      } else if (interaction.customId === 'ticket_discord') {
        modal = new ModalBuilder()
          .setCustomId('modal_discord')
          .setTitle('💬 Discord Help')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('discord_name')
                .setLabel('Discord Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('discord_issue')
                .setLabel('What is the problem?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
      } else if (interaction.customId === 'ticket_purchase') {
        modal = new ModalBuilder()
          .setCustomId('modal_purchase')
          .setTitle('💰 Purchase Help')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('purchase_name')
                .setLabel('In-game/Discord Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('purchase_reason')
                .setLabel('Email or Question')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          );
      }

      await interaction.showModal(modal);
    }

    if (interaction.customId === 'close_ticket') {
      const member = interaction.guild.members.cache.get(interaction.user.id);
      const config = JSON.parse(fs.readFileSync('./ticketConfig.json', 'utf8'));

      if (!member.roles.cache.has(config.handlerRoleId)) {
        return interaction.reply({ content: '❌ Only staff can close this ticket.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_close_reason')
        .setTitle('📩 Close Ticket')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('close_reason')
              .setLabel('Reason for closing')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      await interaction.showModal(modal);
    }
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_')) {
    const config = JSON.parse(fs.readFileSync('./ticketConfig.json', 'utf8'));
    const userId = interaction.user.id;

    let categoryName = '', fields = [];
    if (interaction.customId === 'modal_rust') {
      categoryName = 'Rust Help';
      fields = [
        { name: 'Name', value: interaction.fields.getTextInputValue('rust_name') },
        { name: 'Issue', value: interaction.fields.getTextInputValue('rust_issue') }
      ];
    } else if (interaction.customId === 'modal_discord') {
      categoryName = 'Discord Help';
      fields = [
        { name: 'Discord Name', value: interaction.fields.getTextInputValue('discord_name') },
        { name: 'Problem', value: interaction.fields.getTextInputValue('discord_issue') }
      ];
    } else if (interaction.customId === 'modal_purchase') {
      categoryName = 'Purchase Help';
      fields = [
        { name: 'Name', value: interaction.fields.getTextInputValue('purchase_name') },
        { name: 'Details', value: interaction.fields.getTextInputValue('purchase_reason') }
      ];
    }

    const existingCategory = interaction.guild.channels.cache.find(c => c.name === categoryName.toLowerCase() && c.type === ChannelType.GuildCategory);
    const category = existingCategory || await interaction.guild.channels.create({ name: categoryName.toLowerCase(), type: ChannelType.GuildCategory });

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: config.handlerRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor('#00ffff')
      .setTitle('📨 New Ticket')
      .addFields(fields)
      .setFooter({ text: `Ticket opened by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Close with Reason')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `<@&${config.handlerRoleId}>`, embeds: [embed], components: [closeBtn] });
    await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    activeTickets.set(userId, channel.id);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_close_reason') {
    const reason = interaction.fields.getTextInputValue('close_reason');
    const channel = interaction.channel;
    const user = channel.permissionOverwrites.cache.find(po => po.allow.has(PermissionsBitField.Flags.ViewChannel) && po.id !== interaction.guild.id && po.id !== interaction.client.user.id)?.id;

    if (user) {
      const userObj = await interaction.guild.members.fetch(user).catch(() => null);
      if (userObj) {
        const dmEmbed = new EmbedBuilder()
          .setColor('#00ffff')
          .setTitle('📪 Your Ticket Has Been Closed')
          .setDescription(`Hello, your support ticket has been formally closed by staff.

**Reason:**
${reason}

If you need further assistance, you're welcome to open another ticket anytime.`)
          .setFooter({ text: 'Thank you for contacting support.', iconURL: interaction.client.user.displayAvatarURL() });

        await userObj.send({ embeds: [dmEmbed] }).catch(() => null);
      }
    }

    await channel.delete().catch(() => null);
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
