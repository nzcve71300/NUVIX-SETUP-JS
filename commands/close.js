const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this ticket (admins only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ Use this only in a ticket channel.', ephemeral: true });
    }

    const closeButton = new ButtonBuilder()
      .setCustomId('close_with_reason')
      .setLabel('Close with Reason')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await interaction.reply({
      content: '⚠️ Are you sure you want to close this ticket? Click the button below to provide an optional reason.',
      components: [row],
      ephemeral: true,
    });
  },
};