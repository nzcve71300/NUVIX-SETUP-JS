// 📁 interactions/buttonHandler.js
const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, ChannelType, EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const ticketDataPath = path.join(__dirname, '../data/tickets.json');

function loadData() {
  if (!fs.existsSync(ticketDataPath)) return {};
  return JSON.parse(fs.readFileSync(ticketDataPath));
}

function saveData(data) {
  fs.writeFileSync(ticketDataPath, JSON.stringify(data, null, 2));
}

module.exports = async (interaction, client) => {
  const id = interaction.customId;
  const guild = interaction.guild;
  const user = interaction.user;
  const data = loadData();

  // Prevent duplicate ticket
  const existing = guild.channels.cache.find(c => c.topic === `ticket-${user.id}`);
  if (existing) return interaction.reply({ content: `❌ You already have a ticket open: <#${existing.id}>`, ephemeral: true });

  if (id === 'ticket_rust') {
    const modal = new ModalBuilder()
      .setCustomId('form_rust')
      .setTitle('Rust Help');

    const ign = new TextInputBuilder()
      .setCustomId('Username')
      .setLabel('Your in-game name?')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const desc = new TextInputBuilder()
      .setCustomId('Describe your issue')
      .setLabel('Describe your issue (min 50 characters)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(50);

    return interaction.showModal(modal.addComponents(
      new ActionRowBuilder().addComponents(ign),
      new ActionRowBuilder().addComponents(desc)
    ));
  }

  if (id === 'ticket_discord') {
    const modal = new ModalBuilder()
      .setCustomId('form_discord')
      .setTitle('Discord Help');

    const name = new TextInputBuilder()
      .setCustomId('Discord name')
      .setLabel('Your Discord name?')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const desc = new TextInputBuilder()
      .setCustomId('Describe your problem')
      .setLabel('Describe your problem (min 50 characters)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(50);

    return interaction.showModal(modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(desc)
    ));
  }

  if (id === 'ticket_verify') {
    const modal = new ModalBuilder()
      .setCustomId('form_verify')
      .setTitle('Verify Purchase');

    const email = new TextInputBuilder()
      .setCustomId('Email')
      .setLabel('Email used for purchase')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    return interaction.showModal(modal.addComponents(
      new ActionRowBuilder().addComponents(email)
    ));
  }

  if (id === 'ticket_buy') {
    const catName = 'Buy Help';
    const staffRole = guild.roles.cache.get(data.staffRole);
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
      .setTitle(`🛒 Buy Help`)
      .setColor(0x00ff00)
      .setDescription(`**Opened by:** <@${user.id}>`);

    await channel.send({ content: `<@&${staffRole.id}>`, embeds: [embed] });
    await interaction.reply({ content: `✅ Your ticket has been opened: <#${channel.id}>`, ephemeral: true });
  }
};
