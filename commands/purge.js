const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages from a channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Number of messages to delete (max 100)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: '❌ You must specify a number between 1 and 100.',
        ephemeral: true
      });
    }

    try {
      const messages = await interaction.channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('🧹 Messages Deleted')
        .setDescription(`Successfully deleted **${messages.size}** messages.`)
        .setFooter({ text: 'Action executed by ' + interaction.user.tag });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error('Purge error:', err);
      await interaction.reply({
        content: '❌ I was unable to delete messages. Make sure they are not older than 14 days.',
        ephemeral: true
      });
    }
  }
};
