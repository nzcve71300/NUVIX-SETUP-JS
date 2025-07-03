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
    .setName('edit-reaction-role')
    .setDescription('Add a new role to an existing dropdown menu')
    .addStringOption(option =>
      option.setName('message_id')
        .setDescription('Message ID of the dropdown')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('role_name')
        .setDescription('Name of the new role to create and add')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const messageId = interaction.options.getString('message_id');
    const roleName = interaction.options.getString('role_name');
    const channel = interaction.channel;

    try {
      const msg = await channel.messages.fetch(messageId);
      const storedData = JSON.parse(fs.readFileSync(storagePath));
      const dropdown = storedData.find(d => d.messageId === messageId);

      if (!dropdown) {
        return interaction.reply({ content: '❌ Dropdown not found in database.', ephemeral: true });
      }

      const newRole = await interaction.guild.roles.create({
        name: roleName,
        reason: `Added via /edit-reaction-role by ${interaction.user.tag}`
      });

      dropdown.roles.push({ id: newRole.id, name: newRole.name });

      const newMenu = new StringSelectMenuBuilder()
        .setCustomId(dropdown.customId)
        .setPlaceholder('🎯 Choose your roles')
        .setMinValues(0)
        .setMaxValues(1)
        .addOptions(dropdown.roles.map(role => ({
          label: role.name,
          value: role.id,
          description: `Assign yourself the ${role.name} role`
        })));

      const row = new ActionRowBuilder().addComponents(newMenu);
      await msg.edit({ components: [row] });

      fs.writeFileSync(storagePath, JSON.stringify(storedData, null, 2));

      await interaction.reply({ content: `✅ Role **${roleName}** created and added to dropdown.`, ephemeral: true });
    } catch (err) {
      console.error('❌ Edit error:', err);
      await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
    }
  }
};
