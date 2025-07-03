const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('how-to-claim')
    .setDescription('Send a dropdown guide for elite kit claiming')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎖️ ELITE KITS CLAIM')
      .setDescription('Select your kit below to see how to claim it.')
      .setColor('#00FFFF')
      .setFooter({ text: 'Nuvix Bot System' });

    const dropdown = new StringSelectMenuBuilder()
      .setCustomId('elite_kit_select')
      .setPlaceholder('📦 Choose a kit to claim')
      .addOptions([
        {
          label: 'ELITE KIT 1',
          description: 'I NEED METAL FRAGMENTS',
          value: 'kit_1',
        },
        {
          label: 'ELITE KIT 2',
          description: 'I NEED HIGH QUALITY METAL',
          value: 'kit_2',
        },
        {
          label: 'ELITE KIT 3',
          description: 'I NEED SCRAP',
          value: 'kit_3',
        },
        {
          label: 'ELITE KIT 4',
          description: 'I NEED LOW GRADE FUEL',
          value: 'kit_4',
        },
        {
          label: 'ELITE KIT 5',
          description: 'I NEED FOOD',
          value: 'kit_5',
        }
      ]);

    const row = new ActionRowBuilder().addComponents(dropdown);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false // visible to everyone and stays forever
    });
  }
};
