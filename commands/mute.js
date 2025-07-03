const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a user for a certain time')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to mute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration (e.g. 1m, 5m, 1h, 1d)')
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

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    }

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return interaction.reply({ content: '❌ Invalid or too long duration (max 28d).', ephemeral: true });
    }

    try {
      await member.timeout(durationMs, reason);

      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('🔇 User Muted')
        .addFields(
          { name: '👤 User', value: `${user.tag}`, inline: true },
          { name: '⏱ Duration', value: durationStr, inline: true },
          { name: '📄 Reason', value: reason, inline: true }
        )
        .setFooter({ text: 'Action executed by ' + interaction.user.tag });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Mute Error:', err);
      await interaction.reply({ content: '❌ Failed to timeout user.', ephemeral: true });
    }
  }
};

// 🔧 Helper to convert duration strings
function parseDuration(input) {
  const match = input.match(/^(\d+)([smhd])$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  const unitMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return value * unitMs[unit];
}
