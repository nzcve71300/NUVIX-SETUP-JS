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

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: '❌ Could not find that member in this server.',
        ephemeral: true
      });
    }

    if (!member.bannable) {
      return interaction.reply({
        content: '❌ I cannot ban that user.',
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
      .setFooter({ text: 'Action executed by ' + interaction.user.tag });

    await interaction.reply({ embeds: [embed] });
  }
};
