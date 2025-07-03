const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const storagePath = path.join(__dirname, '../reactionRoles.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-reaction-roles')
    .setDescription('Create a reaction role dropdown menu')
    .addStringOption(option =>
      option.setName('role_name')
        .setDescription('Name of the role to create')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const roleName = interaction.options.getString('role_name');
    const guild = interaction.guild;

    // 👤 Create role in server
    const role = await guild.roles.create({
      name: roleName,
      reason: `Reaction Role created by ${interaction.user.tag}`,
    });

    const dropdown = new StringSelectMenuBuilder()
      .setCustomId(`reaction_role_${Date.now()}`) // unique ID
      .setPlaceholder('🎯 Choose your roles')
      .setMinValues(0)
      .setMaxValues(1)
      .addOptions([
        {
          label: role.name,
          value: role.id,
          description: `Assign yourself the ${role.name} role`
        }
      ]);

    const embed = new EmbedBuilder()
      .setTitle('🎭 Reaction Role Menu')
      .setDescription('Select a role below to assign it to yourself')
      .setColor('#00FFFF');

    const row = new ActionRowBuilder().addComponents(dropdown);

    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    // 💾 Store message ID and dropdown ID for future editing/deleting
    const storedData = fs.existsSync(storagePath) ? JSON.parse(fs.readFileSync(storagePath)) : [];
    storedData.push({
      messageId: message.id,
      customId: dropdown.data.custom_id,
      roles: [{ id: role.id, name: role.name }]
    });
    fs.writeFileSync(storagePath, JSON.stringify(storedData, null, 2));

    await interaction.reply({
      content: `✅ Role **${role.name}** created and dropdown posted.`,
      ephemeral: true
    });
  }
};
