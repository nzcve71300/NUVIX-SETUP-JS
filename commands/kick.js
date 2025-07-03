const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(user.id);

      if (!member || !member.kickable) {
        return interaction.reply({
          content: '❌ I cannot kick this user. Check my role position and permissions.',
          ephemeral: true
        });
      }

      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('🥾 Member Kicked')
        .addFields(
          { name: '👤 User', value: `${user.tag}`, inline: true },
          { name: '📄 Reason', value: reason, inline: true }
        )
        .setFooter({ text: `Action by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Kick error:', error);
      await interaction.reply({
        content: '❌ Something went wrong. Please contact a server admin.',
        ephemeral: true
      });
    }
  }
};
