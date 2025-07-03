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
  PermissionFlagsBits
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

const activeTickets = new Set();

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
    await interaction.deferReply({ ephemeral: true });

    const id = `${interaction.guild.id}_${interaction.user.id}_${interaction.customId}`;
    if (activeTickets.has(id)) return interaction.editReply({ content: '⚠️ You already have an open ticket.' });
    activeTickets.add(id);

    const ticketId = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
    const categoryName = `${interaction.customId}-help`.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    let category = interaction.guild.channels.cache.find(c => c.name === categoryName && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await interaction.guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }

    const channel = await interaction.guild.channels.create({
      name: ticketId,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    const modal = new ModalBuilder()
      .setCustomId(`modal_${interaction.customId}`)
      .setTitle(`📝 ${categoryName} Form`);

    if (interaction.customId === 'rust_help') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ingame_name').setLabel('In-game or Discord name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rust_issue').setLabel('Describe your issue').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
    } else if (interaction.customId === 'discord_help') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('discord_name').setLabel('Discord name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('discord_problem').setLabel('Problem?').setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
    } else if (interaction.customId === 'purchase_help') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_name').setLabel('In-game/Discord Name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('purchase_type').setLabel('Email or "How do I pay?"').setStyle(TextInputStyle.Short).setRequired(true))
      );
    }

    await interaction.editReply({ content: '📨 Ticket created. Please fill in the form.' });
    await interaction.client.channels.cache.get(channel.id).send(`<@${interaction.user.id}> Please complete the form to get help.`);
    await interaction.user.send({ content: `✅ Ticket created: ${channel.name}` }).catch(() => {});
    await interaction.user.send({ content: '📩 A staff member will be with you shortly.' }).catch(() => {});
    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_')) {
    await interaction.deferReply({ ephemeral: true });
    const fields = interaction.fields.fields;
    const responses = Array.from(fields.values()).map(input => `**${input.label}:** ${input.value}`).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#00ffff')
      .setTitle('📨 New Ticket')
      .setDescription(responses)
      .setFooter({ text: `User: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('📪 Close with Reason')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.channel.send({ embeds: [embed], components: [closeBtn] });
    await interaction.editReply({ content: '✅ Ticket submitted.' });
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return await interaction.reply({ content: '❌ Only staff can close tickets.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('close_reason_modal')
      .setTitle('📪 Reason for Closing');

    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Enter reason for closing the ticket')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'close_reason_modal') {
    const reason = interaction.fields.getTextInputValue('close_reason');
    const userId = interaction.channel.topic?.match(/\d{17,}/)?.[0];
    const user = await interaction.guild.members.fetch(userId || interaction.channel.recipient?.id).catch(() => null);

    await interaction.reply({ content: '📪 Ticket closed with reason. Channel will be deleted shortly.', ephemeral: true });

    if (user) {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('📪 Ticket Closed')
            .setColor('#ff0000')
            .setDescription(`Your ticket has been closed for the following reason:\n\n${reason}`)
            .setFooter({ text: 'Thank you for contacting support.', iconURL: client.user.displayAvatarURL() })
        ]
      }).catch(() => {});
    }

    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
