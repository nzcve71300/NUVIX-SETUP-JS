// ✅ index.js — Final, full, fixed file
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
  PermissionsBitField
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
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

const ticketButtons = ['rust_help', 'discord_help', 'purchase_help'];

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction);
  }

  if (interaction.isButton() && ticketButtons.includes(interaction.customId)) {
    const modal = new ModalBuilder()
      .setCustomId(`modal_${interaction.customId}`)
      .setTitle('📝 Submit a Ticket');

    const nameInput = new TextInputBuilder()
      .setCustomId(interaction.customId === 'rust_help' ? 'ingame_name' : 'discord_name')
      .setLabel(interaction.customId === 'rust_help' ? 'In-game name or Discord name' : 'Discord name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const issueInput = new TextInputBuilder()
      .setCustomId('issue')
      .setLabel(
        interaction.customId === 'purchase_help'
          ? 'Select: How do I pay / Verify my purchase'
          : 'Describe your issue'
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(issueInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_')) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.customId.split('_')[1];
    const guild = interaction.guild;
    const categoryName = type === 'rust_help' ? 'Rust Help' : type === 'discord_help' ? 'Discord Help' : 'Purchase Help';
    const nameField = type === 'rust_help' ? 'ingame_name' : 'discord_name';
    const userName = interaction.fields.getTextInputValue(nameField);
    const issue = interaction.fields.getTextInputValue('issue');

    let category = guild.channels.cache.find(c => c.name === categoryName.toLowerCase().replace(/ /g, '-') && c.type === 4);
    if (!category) {
      category = await guild.channels.create({
        name: categoryName.toLowerCase().replace(/ /g, '-'),
        type: 4
      });
    }

    const ticketChannel = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: 0,
      parent: category.id,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: ['ViewChannel']
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages']
        },
        {
          id: process.env.HANDLER_ROLE,
          allow: ['ViewChannel', 'SendMessages']
        }
      ]
    });

    const closeBtn = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setEmoji('🔒')
      .setLabel('Close with reason')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);

    const embed = new EmbedBuilder()
      .setColor('#00ffff')
      .setTitle('📩 New Ticket')
      .setDescription(`**Submitted by:** <@${interaction.user.id}>
**Username:** ${userName}
**Issue:** ${issue}`)
      .setFooter({ text: `Category: ${categoryName}` });

    await ticketChannel.send({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: `✅ Ticket created in ${ticketChannel}`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    if (!interaction.member.roles.cache.has(process.env.HANDLER_ROLE)) {
      return interaction.reply({ content: '❌ Only staff can close tickets.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_close_reason')
      .setTitle('Reason for Closing');

    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_close_reason') {
    await interaction.deferReply({ ephemeral: true });

    const reason = interaction.fields.getTextInputValue('close_reason');
    const userMention = interaction.channel.topic?.match(/<@(\d+)>/)?.[1];
    const user = userMention ? await interaction.guild.members.fetch(userMention).catch(() => null) : null;

    if (user) {
      const dmEmbed = new EmbedBuilder()
        .setTitle('📪 Your ticket has been closed')
        .setDescription(`**Reason:** ${reason}`)
        .setColor('#00ffff')
        .setFooter({ text: 'If you need further help, feel free to open another ticket.' });

      await user.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    await interaction.editReply({ content: '✅ Ticket will now be deleted.', ephemeral: true });
    setTimeout(() => {
      interaction.channel.delete().catch(() => null);
    }, 2000);
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
