const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete all messages from a specified member in the current channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member whose messages will be deleted')
        .setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const channel = interaction.channel;

    if (!channel.isTextBased()) return interaction.reply({ content: 'This command can only be used in text channels.', ephemeral: true });

    // Fetch messages from the channel and filter by target user, then bulk delete
    try {
      await interaction.deferReply({ ephemeral: true });

      let messagesToDelete = [];
      let lastId;

      // Fetch messages in batches (up to 100 per fetch), until no more or limit reached
      while (messagesToDelete.length < 500) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        const filtered = messages.filter(msg => msg.author.id === target.id);
        messagesToDelete = messagesToDelete.concat(Array.from(filtered.values()));

        lastId = messages.last().id;
      }

      if (messagesToDelete.length === 0) {
        await interaction.editReply({ content: `No messages found from ${target.tag} in this channel.` });
        return;
      }

      // Bulk delete in batches of max 100 messages (Discord limit)
      for (let i = 0; i < messagesToDelete.length; i += 100) {
        const batch = messagesToDelete.slice(i, i + 100);
        await channel.bulkDelete(batch, true);
      }

      const embed = new EmbedBuilder()
        .setTitle('Messages Purged')
        .setColor('#00ffff')
        .setDescription(`Deleted **${messagesToDelete.length}** messages from **${target.tag}**.`)
        .setTimestamp()
        .setFooter({ text: `Purged by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'An error occurred while deleting messages.', ephemeral: true });
    }
  }
};