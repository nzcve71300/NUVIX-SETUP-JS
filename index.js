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
  ChannelType,
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

  // BUTTONS
  if (interaction.isButton()) {
    const { customId, guild, member, user } = interaction;
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'ticketConfig.json'), 'utf8'));
    const supportRoleId = config.handlerRoleId;

    // CLOSE BUTTON
    if (customId === 'close_ticket') {
      if (!member.roles.cache.has(supportRoleId)) {
        return interaction.reply({ content: '❌ Only staff can close this ticket.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('close_reason_modal')
        .setTitle('Close Ticket with Reason')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('close_reason')
              .setLabel('Reason for closing the ticket')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    // OPEN TICKET BUTTON
    const categoryNameMap = {
      'rust_help': 'Rust Help',
      'discord_help': 'Discord Help',
      'purchase_help': 'Purchase Help',
    };
    const modalTitleMap = {
      'rust_help': '🛠 Rust Help Ticket',
      'discord_help': '💬 Discord Help Ticket',
      'purchase_help': '💸 Purchase Help Ticket',
    };

    if (['rust_help', 'discord_help', 'purchase_help'].includes(customId)) {
      const modal = new ModalBuilder()
        .setCustomId(`modal_${customId}`)
        .setTitle(modalTitleMap[customId]);

      const inputs = {
        'rust_help': [
          { id: 'rust_name', label: 'In-game/Discord Name', style: TextInputStyle.Short },
          { id: 'rust_issue', label: 'Describe your issue', style: TextInputStyle.Paragraph }
        ],
        'discord_help': [
          { id: 'discord_name', label: 'Discord Name', style: TextInputStyle.Short },
          { id: 'discord_problem', label: 'Problem?', style: TextInputStyle.Paragraph }
        ],
        'purchase_help': [
          { id: 'purchase_name', label: 'In-game/Discord Name', style: TextInputStyle.Short },
          { id: 'purchase_email', label: 'Email associated with the purchase', style: TextInputStyle.Short }
        ]
      };

      const fields = inputs[customId].map(input =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId(input.id).setLabel(input.label).setStyle(input.style).setRequired(true)
        )
      );

      modal.addComponents(...fields);
      return interaction.showModal(modal);
    }
  }

  // MODALS
  if (interaction.type === InteractionType.ModalSubmit) {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'ticketConfig.json'), 'utf8'));
    const supportRoleId = config.handlerRoleId;

    if (interaction.customId === 'close_reason_modal') {
      const reason = interaction.fields.getTextInputValue('close_reason');
      const userMention = interaction.channel.topic;
      const userId = userMention?.match(/<@(\d+)>/)?.[1];

      if (!userId) return interaction.reply({ content: '❌ Could not find ticket owner.', ephemeral: true });

      const user = await client.users.fetch(userId).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor('#00ffff')
        .setTitle('📨 Your Ticket Was Closed')
        .setDescription(`Your support ticket has been **closed** by a staff member.`)
        .addFields(
          { name: 'Reason:', value: reason },
          { name: 'Closed by:', value: `<@${interaction.user.id}>` }
        )
        .setFooter({ text: 'Thank you for contacting Nuvix Support' })
        .setTimestamp();

      if (user) await user.send({ embeds: [embed] }).catch(() => null);

      await interaction.reply({ content: '✅ Ticket closed. Deleting channel...', ephemeral: true });
      setTimeout(() => interaction.channel.delete().catch(() => null), 3000);
    }

    if (interaction.customId.startsWith('modal_')) {
      const type = interaction.customId.replace('modal_', '');
      const categoryName = {
        'rust_help': 'Rust Help',
        'discord_help': 'Discord Help',
        'purchase_help': 'Purchase Help'
      }[type];

      // Check for existing ticket by user
      const existingChannel = interaction.guild.channels.cache.find(c => c.name === `${type}-${interaction.user.username}`);
      if (existingChannel) {
        return interaction.reply({ content: '❌ You already have an open ticket.', ephemeral: true });
      }

      // Create or get category
      let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === categoryName);
      if (!category) {
        category = await interaction.guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory });
      }

      // Create channel
      const ticketChannel = await interaction.guild.channels.create({
        name: `${type}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `<@${interaction.user.id}>`,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      // Embed + button
      const embed = new EmbedBuilder()
        .setColor('#00ffff')
        .setTitle(`🧾 New ${categoryName} Ticket`)
        .setFooter({ text: 'Nuvix Ticket System' })
        .setTimestamp();

      const fields = {
        'rust_help': [
          { name: 'In-game/Discord Name', value: interaction.fields.getTextInputValue('rust_name') },
          { name: 'Issue', value: interaction.fields.getTextInputValue('rust_issue') }
        ],
        'discord_help': [
          { name: 'Discord Name', value: interaction.fields.getTextInputValue('discord_name') },
          { name: 'Problem', value: interaction.fields.getTextInputValue('discord_problem') }
        ],
        'purchase_help': [
          { name: 'In-game/Discord Name', value: interaction.fields.getTextInputValue('purchase_name') },
          { name: 'Email', value: interaction.fields.getTextInputValue('purchase_email') }
        ]
      };

      embed.addFields(...fields[type]);

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('📪 Close with reason')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [closeBtn] });
      await interaction.reply({ content: `✅ Ticket opened in ${ticketChannel}`, ephemeral: true });
    }
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
