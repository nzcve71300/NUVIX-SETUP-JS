const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ban')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(user.id);

      if (!member || !member.bannable) {
        return interaction.reply({
          content: '❌ I cannot ban this user. Check my role position and permissions.',
          ephemeral: true
        });
      }

      await member.ban({ reason });

      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('🔨 Member Banned')
        .addFields(
          { name: '👤 User', value: `${user.tag}`, inline: true },
          { name: '📄 Reason', value: reason, inline: true }
        )
        .setFooter({ text: `Action by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Ban error:', error);
      await interaction.reply({
        content: '❌ Something went wrong. Please contact a server admin.',
        ephemeral: true
      });
    }
  }
};
