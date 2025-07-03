const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)),
  
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(target.id);

    if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    if (!member.bannable) return interaction.reply({ content: 'I cannot ban this user.', ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: 'You cannot ban yourself.', ephemeral: true });

    try {
      await member.ban({ reason });
      const embed = new EmbedBuilder()
        .setTitle('Member Banned')
        .setColor('#00ffff')
        .setDescription(`**${target.tag}** has been banned.\n**Reason:** ${reason}`)
        .setTimestamp()
        .setFooter({ text: `Banned by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error banning this user.', ephemeral: true });
    }
  }
};