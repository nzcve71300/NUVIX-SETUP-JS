const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)),
  
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(target.id);

    if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: 'I cannot kick this user.', ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: 'You cannot kick yourself.', ephemeral: true });

    try {
      await member.kick(reason);
      const embed = new EmbedBuilder()
        .setTitle('Member Kicked')
        .setColor('#00ffff')
        .setDescription(`**${target.tag}** has been kicked.\n**Reason:** ${reason}`)
        .setTimestamp()
        .setFooter({ text: `Kicked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error kicking this user.', ephemeral: true });
    }
  }
};