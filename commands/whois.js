const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user')
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id);

    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle(`🔍 User Info — ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '**🆔 User ID**', value: user.id, inline: true },
        { name: '**📆 Account Created**', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '**📥 Joined Server**', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: '**🔰 Roles**', value: member.roles.cache.map(r => r.name).join(', ') || 'None' }
      )
      .setFooter({ text: 'Nuvix Bot System' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
