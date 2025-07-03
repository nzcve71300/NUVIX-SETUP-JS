// 📁 interactions/modalHandler.js
const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ChannelType, EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const ticketDataPath = path.join(__dirname, '../data/tickets.json');

function saveData(data) {
  fs.writeFileSync(ticketDataPath, JSON.stringify(data, null, 2));
}

function loadData() {
  if (!fs.existsSync(ticketDataPath)) return {};
  return JSON.parse(fs.readFileSync(ticketDataPath));
}

module.exports = async (interaction, client) => {
  const id = interaction.customId;

  // 🧠 Store per-user cache safely
  if (!client._ticketCache) client._ticketCache = {};
  const userId = interaction.user.id;

  // Step 1: Admin types panel message
  if (id === 'setup_panel_message') {
    const msg = interaction.fields.getTextInputValue('panel_desc');
    client._ticketCache[userId] = { message: msg };

    const channelSelect = new ModalBuilder()
      .setCustomId('setup_panel_channel')
      .setTitle('Choose Panel Channel');

    const input = new TextInputBuilder()
      .setCustomId('panel_channel')
      .setLabel('Channel ID or #channel mention')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    return interaction.showModal(channelSelect.addComponents(row));
  }

  // Step 2: Admin picks a channel
  if (id === 'setup_panel_channel') {
    const channelInput = interaction.fields.getTextInputValue('panel_channel');
    const channelId = channelInput.replace(/[<#>]/g, '');
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel) return interaction.reply({ content: '❌ Invalid channel.', ephemeral: true });

    if (!client._ticketCache[userId]) client._ticketCache[userId] = {};
    client._ticketCache[userId].channelId = channel.id;

    const roleModal = new ModalBuilder()
      .setCustomId('setup_panel_role')
      .setTitle('Choose Staff Role');

    const input = new TextInputBuilder()
      .setCustomId('staff_role')
      .setLabel('Staff role ID or @mention')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    return interaction.showModal(roleModal.addComponents(row));
  }

  // Step 3: Admin picks role, then panel is sent
  if (id === 'setup_panel_role') {
    const roleInput = interaction.fields.getTextInputValue('staff_role');
    const roleId = roleInput.replace(/[<@&>]/g, '');
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) return interaction.reply({ content: '❌ Invalid role.', ephemeral: true });

    const setup = client._ticketCache[userId];
    if (!setup || !setup.channelId || !setup.message) {
      return interaction.reply({ content: '❌ Setup data missing. Please run /ticket-setup again.', ephemeral: true });
    }

    const targetChannel = interaction.guild.channels.cache.get(setup.channelId);
    const panel = new EmbedBuilder()
      .setTitle('🎫 Support Tickets')
      .setDescription(setup.message)
      .setColor(0x00ffff);

    const row = new ActionRowBuilder().addComponents(
      new (require('discord.js').ButtonBuilder)().setCustomId('ticket_rust').setLabel('Rust Help').setStyle(4),
      new (require('discord.js').ButtonBuilder)().setCustomId('ticket_discord').setLabel('Discord Help').setStyle(1),
      new (require('discord.js').ButtonBuilder)().setCustomId('ticket_verify').setLabel('Verify Purchase').setStyle(2),
      new (require('discord.js').ButtonBuilder)().setCustomId('ticket_buy').setLabel('Buy Help').setStyle(3),
    );

    await targetChannel.send({ embeds: [panel], components: [row] });
    await interaction.reply({ content: '✅ Ticket panel sent successfully!', ephemeral: true });

    const data = loadData();
    data.staffRole = role.id;
    saveData(data);
  }

  // ✅ Handle user modal forms (Rust, Discord, Verify)
  if (id.startsWith('form_rust') || id.startsWith('form_discord') || id.startsWith('form_verify')) {
    const data = loadData();
    const user = interaction.user;
    const guild = interaction.guild;
    const staffRole = guild.roles.cache.get(data.staffRole);
    const fields = interaction.fields.fields;

    const values = {};
    for (const [key, field] of fields) values[key] = field.value;

    const catName = id.includes('rust') ? 'Rust Help'
                    : id.includes('discord') ? 'Discord Help'
                    : 'Verify Purchase';

    let category = guild.channels.cache.find(c => c.name === catName && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await guild.channels.create({ name: catName, type: ChannelType.GuildCategory });
    }

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      topic: `ticket-${user.id}`,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`📩 New Ticket — ${catName}`)
      .setColor(0x00ffff)
      .setDescription(`**Opened by:** <@${user.id}>\n\n${Object.entries(values).map(([k, v]) => `**${k}:** ${v}`).join('\n')}`);

    await channel.send({ content: `<@&${staffRole.id}>`, embeds: [embed] });
    await interaction.reply({ content: `✅ Your ticket has been opened: <#${channel.id}>`, ephemeral: true });
  }

  // ✅ Handle ticket closing modal
  if (id === 'ticket_close_reason') {
    const reason = interaction.fields.getTextInputValue('close_reason');
    const channel = interaction.channel;
    const guild = interaction.guild;

    const userIdMatch = channel.topic?.match(/ticket-(\d+)/);
    const ticketUserId = userIdMatch ? userIdMatch[1] : null;
    if (!ticketUserId) return interaction.reply({ content: '❌ Could not find ticket creator.', ephemeral: true });

    const user = await client.users.fetch(ticketUserId).catch(() => null);
    if (!user) return interaction.reply({ content: '❌ Failed to fetch ticket user.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Ticket Closed')
      .setColor(0x00ffff)
      .setDescription(`Your ticket has been closed.\n\n**Reason:**\n${reason}`)
      .setFooter({ text: guild.name, iconURL: guild.iconURL() });

    await user.send({ embeds: [embed] }).catch(() => null);
    await interaction.reply({ content: '✅ Ticket closed. Deleting in 5 seconds...', ephemeral: true });

    setTimeout(() => channel.delete().catch(() => null), 5000);
  }
};
