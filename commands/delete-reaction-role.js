const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const storagePath = path.join(__dirname, '../reactionRoles.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-reaction-role')
    .setDescription('Remove a role from a dropdown menu')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('ID of the dropdown message')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('role_id')
        .setDescription('ID of the role to remove')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');
    const roleId = interaction.options.getString('role_id');

    try {
      const channel = interaction.channel;
      const msg = await channel.messages.fetch(messageId);
      const storedData = JSON.parse(fs.readFileSync(storagePath));
      const dropdown = storedData.find(d => d.messageId === messageId);

      if (!dropdown) {
        return interaction.reply({ content: '❌ Dropdown not found in database.', ephemeral: true });
      }

      // Remove role from menu and server
      dropdown.roles = dropdown.roles.filter(r => r.id !== roleId);
      const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
      if (role) await role.delete('Deleted via /delete-reaction-role');

      // Update menu
      const updatedMenu = new StringSelectMenuBuilder()
        .setCustomId(dropdown.customId)
        .setPlaceholder('🎯 Choose your roles')
        .setMinValues(0)
        .setMaxValues(1)
        .addOptions(dropdown.roles.map(r => ({
          label: r.name,
          value: r.id,
          description: `Assign yourself the ${r.name} role`
        })));

      const row = new ActionRowBuilder().addComponents(updatedMenu);
      await msg.edit({ components: [row] });

      fs.writeFileSync(storagePath, JSON.stringify(storedData, null, 2));
      await interaction.reply({ content: `✅ Role removed from dropdown and deleted.`, ephemeral: true });
    } catch (error) {
      console.error('❌ Delete error:', error);
      await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
    }
  }
};
