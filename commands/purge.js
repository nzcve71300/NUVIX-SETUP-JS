const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of recent messages')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (max 100)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: '❌ You must enter a number between 1 and 100.',
        ephemeral: true
      });
    }

    try {
      const messages = await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('🧹 Messages Deleted')
        .setDescription(`Successfully deleted **${messages.size}** messages.`)
        .setFooter({ text: `Action by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('❌ Purge error:', error);
      await interaction.reply({
        content: '❌ Could not delete messages. Make sure they’re not older than 14 days.',
        ephemeral: true
      });
    }
  }
};
