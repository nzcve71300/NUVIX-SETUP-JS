const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'verifyRules.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('Set up the verify rules and choose a verify channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('verify_setup_modal')
      .setTitle('🛠️ Enter Server Rules');

    const rulesInput = new TextInputBuilder()
      .setCustomId('rules_input')
      .setLabel('Enter the server rules')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('Example:\n1. Be respectful\n2. No spam\n3. Follow Discord TOS');

    const row = new ActionRowBuilder().addComponents(rulesInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const rules = interaction.fields.getTextInputValue('rules_input');

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('select_verify_channel')
        .setPlaceholder('Select the verification channel')
        .addChannelTypes(ChannelType.GuildText)
    );

    interaction.client.verifySetupTemp ||= {};
    interaction.client.verifySetupTemp[interaction.user.id] = {
      rules,
      guildId: interaction.guild.id
    };

    await interaction.reply({
      content: '📢 Now choose the channel where the verify embed will be sent.',
      components: [row],
      ephemeral: true
    });
  },

  async handleChannelSelect(interaction) {
    const temp = interaction.client.verifySetupTemp?.[interaction.user.id];
    if (!temp) return interaction.reply({ content: '⚠️ Setup expired or missing rules.', ephemeral: true });

    const { rules, guildId } = temp;
    const selectedChannel = interaction.values[0];

    const data = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};

    data[guildId] = {
      rules,
      channelId: selectedChannel
    };

    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));

    const guild = interaction.guild;
    const verifyRole = await ensureVerifiedRole(guild);
    const everyoneRole = guild.roles.everyone;

    // 🔐 FULL LOCKDOWN: Remove ViewChannel from ALL roles except Verified
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isTextBased() && !channel.isVoiceBased()) continue;

      try {
        // Deny access to all roles except 'Verified'
        for (const role of guild.roles.cache.values()) {
          if (role.id !== verifyRole.id) {
            await channel.permissionOverwrites.edit(role, { ViewChannel: false });
          }
        }

        // Allow Verified role
        await channel.permissionOverwrites.edit(verifyRole, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          Connect: true
        });

        // Let @everyone see ONLY the verify channel
        if (channel.id === selectedChannel) {
          await channel.permissionOverwrites.edit(everyoneRole, {
            ViewChannel: true,
            SendMessages: false
          });
        } else {
          await channel.permissionOverwrites.edit(everyoneRole, {
            ViewChannel: false
          });
        }
      } catch (err) {
        console.warn(`⚠️ Could not update permissions for ${channel.name}`);
      }
    }

    const channel = guild.channels.cache.get(selectedChannel);

    const embed = new EmbedBuilder()
      .setTitle('🔐 Verify to Access')
      .setDescription('Use the menu below to read and accept the rules.')
      .setColor('#00ffff');

    const dropdown = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('verify_select')
        .setPlaceholder('📜 Select to view server rules')
        .addOptions([
          {
            label: 'View Server Rules',
            value: 'view_rules',
            description: 'Read and accept our rules to gain access',
          }
        ])
    );

    await channel.send({ embeds: [embed], components: [dropdown] });

    await interaction.update({
      content: `✅ Verification system has been set up in <#${selectedChannel}>`,
      components: []
    });
  }
};

async function ensureVerifiedRole(guild) {
  let role = guild.roles.cache.find(r => r.name.toLowerCase() === 'verified');
  if (!role) {
    role = await guild.roles.create({
      name: 'Verified',
      color: '#00ffff',
      reason: 'Auto-created for verification system'
    });

    const bot = await guild.members.fetchMe();
    await guild.roles.setPosition(role, bot.roles.highest.position - 1);
  }
  return role;
}
