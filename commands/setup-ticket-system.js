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

    const button = new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('Open Ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket system set up in ${channel}`, ephemeral: true });
  },
};