const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'ticketConfig.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket-system')
    .setDescription('Setup the support ticket system')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel for ticket setup').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addStringOption(opt => opt.setName('description').setDescription('Description text').setRequired(true))
    .addRoleOption(opt => opt.setName('roles').setDescription('Roles allowed to handle tickets').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const description = interaction.options.getString('description');
    const handlerRole = interaction.options.getRole('roles');

    const config = { guild: interaction.guild.id, ticketChannelId: channel.id, handlerRoleId: handlerRole.id };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const embed = new EmbedBuilder()
      .setColor('#00ffff')
      .setTitle('Support Ticket')
      .setDescription(description);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rust_help').setLabel('Rust Help').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('discord_help').setLabel('Discord Help').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('purchase_help').setLabel('Purchase Help').setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [buttons] });
    await interaction.reply({ content: `✅ Ticket system set up in ${channel}`, ephemeral: true });
  },
};
