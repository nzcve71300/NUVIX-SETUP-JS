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

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: '❌ Could not find that member in this server.',
        ephemeral: true
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        content: '❌ I cannot kick that user.',
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
      .setFooter({ text: 'Action executed by ' + interaction.user.tag });

    await interaction.reply({ embeds: [embed] });
  }
};
