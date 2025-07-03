// 📁 commands/close.js
const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close this ticket with a reason'),

  async execute(interaction) {
    const channel = interaction.channel;

    if (!channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ This command can only be used in a ticket channel.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('ticket_close_reason')
      .setTitle('Close Ticket');

    const reason = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Reason for closing the ticket')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(10);

    const row = new ActionRowBuilder().addComponents(reason);
    await interaction.showModal(modal.addComponents(row));
  }
};
