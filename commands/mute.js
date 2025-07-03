const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member for a specified duration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to mute')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration of the timeout in minutes (1-1440)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(target.id);

    if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: 'I cannot timeout this user.', ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: 'You cannot mute yourself.', ephemeral: true });

    try {
      await member.timeout(duration * 60 * 1000, reason);
      const embed = new EmbedBuilder()
        .setTitle('Member Muted')
        .setColor('#00ffff')
        .setDescription(`**${target.tag}** has been muted for **${duration} minutes**.\n**Reason:** ${reason}`)
        .setTimestamp()
        .setFooter({ text: `Muted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error muting this user.', ephemeral: true });
    }
  }
};