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

  if (interaction.isButton()) {
    const user = interaction.user;
    const guild = interaction.guild;
    const member = interaction.member;

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

    if (['rust_help', 'discord_help', 'purchase_help'].includes(interaction.customId)) {
      const modal = new ModalBuilder()
        .setCustomId(`modal_${interaction.customId}`)
        .setTitle(modalTitleMap[interaction.customId]);

      if (interaction.customId === 'rust_help') {
        modal.addComponents(
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
      }

      if (interaction.customId === 'discord_help') {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('discord_name')
              .setLabel('Discord Name')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('discord_problem')
              .setLabel('Problem?')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      }

      if (interaction.customId === 'purchase_help') {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('purchase_name')
              .setLabel('In-game/Discord Name')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('purchase_email')
              .setLabel('Email associated with the purchase')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      }

      return interaction.showModal(modal);
    }
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_')) {
    const type = interaction.customId.replace('modal_', '');
    const configPath = path.join(__dirname, 'ticketConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const supportRoleId = config.handlerRoleId;

    const categoryName = {
      'rust_help': 'Rust Help',
      'discord_help': 'Discord Help',
      'purchase_help': 'Purchase Help'
    }[type];

    // Create category if doesn't exist
    let category = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === categoryName);
    if (!category) {
      category = await interaction.guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }

    const channelName = `${type}-${interaction.user.username}`;
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: supportRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    // Build embed
    const embed = new EmbedBuilder()
      .setColor('#00ffff')
      .setTitle(`🧾 New ${categoryName} Ticket`)
      .setFooter({ text: 'Nuvix Ticket System' })
      .setTimestamp();

    if (type === 'rust_help') {
      embed.addFields(
        { name: 'In-game/Discord Name', value: interaction.fields.getTextInputValue('rust_name') },
        { name: 'Issue', value: interaction.fields.getTextInputValue('rust_issue') }
      );
    }

    if (type === 'discord_help') {
      embed.addFields(
        { name: 'Discord Name', value: interaction.fields.getTextInputValue('discord_name') },
        { name: 'Problem', value: interaction.fields.getTextInputValue('discord_problem') }
      );
    }

    if (type === 'purchase_help') {
      embed.addFields(
        { name: 'In-game/Discord Name', value: interaction.fields.getTextInputValue('purchase_name') },
        { name: 'Email', value: interaction.fields.getTextInputValue('purchase_email') }
      );
    }

    await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `✅ Ticket opened in ${ticketChannel}`, ephemeral: true });
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
