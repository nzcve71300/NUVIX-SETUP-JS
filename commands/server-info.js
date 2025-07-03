const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-info')
    .setDescription('Displays information about this server'),

  async execute(interaction) {
    const { guild } = interaction;

    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle(`📊 Server Info — ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '**🆔 Server ID**', value: guild.id, inline: true },
        { name: '**👑 Owner**', value: `<@${guild.ownerId}>`, inline: true },
        { name: '**📅 Created On**', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '**👥 Members**', value: `${guild.memberCount}`, inline: true },
        { name: '**💬 Channels**', value: `${guild.channels.cache.size}`, inline: true },
        { name: '**🛡️ Verification Level**', value: guild.verificationLevel.toString(), inline: true }
      )
      .setFooter({ text: 'Nuvix Bot System' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
