const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Duration (e.g. 10m, 1h, 1d)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(user.id);
      const duration = parseDuration(durationStr);

      if (!member || !member.moderatable) {
        return interaction.reply({
          content: '❌ I cannot mute this user. Check my permissions and role position.',
          ephemeral: true
        });
      }

      if (!duration || duration > 2419200000) {
        return interaction.reply({
          content: '❌ Invalid or too long duration (Max: 28d)',
          ephemeral: true
        });
      }

      await member.timeout(duration, reason);

      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('🔇 User Muted')
        .addFields(
          { name: '👤 User', value: user.tag, inline: true },
          { name: '⏱ Duration', value: durationStr, inline: true },
          { name: '📄 Reason', value: reason, inline: true }
        )
        .setFooter({ text: `Action by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Mute error:', error);
      await interaction.reply({
        content: '❌ Something went wrong. Please contact a server admin.',
        ephemeral: true
      });
    }
  }
};

function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const unitMs = {
    s: 1000,
    m: 60_000,
    h: 60 * 60_000,
    d: 24 * 60 * 60_000
  };

  return value * unitMs[unit];
}
