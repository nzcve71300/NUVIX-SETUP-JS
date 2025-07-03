const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock-server')
    .setDescription('Restore all channels to default visibility (removes verify lockdown)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const everyoneRole = guild.roles.everyone;

    let count = 0;

    for (const channel of guild.channels.cache.values()) {
      try {
        if (!channel.isTextBased() && !channel.isVoiceBased()) continue;

        // Restore @everyone view access
        await channel.permissionOverwrites.edit(everyoneRole, {
          ViewChannel: true,
          SendMessages: null,
          Connect: null,
        });

        count++;
      } catch (err) {
        console.warn(`⚠️ Failed to unlock ${channel.name}: ${err.message}`);
      }
    }

    await interaction.editReply({
      content: `✅ All channels unlocked for @everyone.\n🔓 ${count} channels updated.`,
    });
  }
};
