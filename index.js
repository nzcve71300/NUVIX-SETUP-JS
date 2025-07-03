const {
  Client, GatewayIntentBits, Partials, Collection, REST, Routes,
  EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// 📁 Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

// 🔃 Register slash commands
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Slash commands registered.');
  } catch (err) {
    console.error('❌ Command registration failed:', err);
  }
});

// 💬 Handle commands and dropdowns
client.on('interactionCreate', async interaction => {
  // 🟦 Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error in /${interaction.commandName}:`, error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('❌ Something went wrong')
        .setDescription('Please try again later or contact staff.')
        .setFooter({ text: 'Nuvix Bot System' });
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }

  // 🎯 Elite Kit Dropdown (from /how-to-claim)
  if (interaction.isStringSelectMenu() && interaction.customId === 'elite_kit_select') {
    const responses = {
      kit_1: '**I NEED METAL FRAGMENTS.**',
      kit_2: '**I NEED HIGH QUALITY METAL.**',
      kit_3: '**I NEED SCRAP.**',
      kit_4: '**I NEED LOW GRADE FUEL.**',
      kit_5: '**I NEED FOOD.**'
    };
    const response = responses[interaction.values[0]];
    const embed = new EmbedBuilder()
      .setColor('#00FFFF')
      .setTitle('🎁 Kit Claim Info')
      .setDescription(response)
      .setFooter({ text: 'Nuvix Bot System' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // 🧩 Reaction Role Dropdown (dynamic ID starts with reaction_role_)
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('reaction_role_')) {
    const selectedRoleIds = interaction.values;
    const member = interaction.member;

    // Add selected roles, remove others from same dropdown
    const storedData = JSON.parse(fs.readFileSync('./reactionRoles.json', 'utf8'));
    const dropdownData = storedData.find(entry => entry.customId === interaction.customId);
    if (!dropdownData) return interaction.reply({ content: '❌ Dropdown not found in database.', ephemeral: true });

    try {
      // Remove unselected roles from same dropdown
      for (const role of dropdownData.roles) {
        const hasRole = member.roles.cache.has(role.id);
        const shouldHave = selectedRoleIds.includes(role.id);
        if (hasRole && !shouldHave) {
          await member.roles.remove(role.id);
        }
        if (!hasRole && shouldHave) {
          await member.roles.add(role.id);
        }
      }

      const assigned = selectedRoleIds.map(id => {
        const role = interaction.guild.roles.cache.get(id);
        return role ? `**${role.name}**` : `Role`;
      }).join(', ') || 'None';

      const embed = new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('✅ Roles Updated')
        .setDescription(`Your roles have been updated: ${assigned}`)
        .setFooter({ text: 'Nuvix Bot System' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error('❌ Reaction role error:', err);
      await interaction.reply({ content: '❌ Failed to update roles.', ephemeral: true });
    }
  }
});

// 🔒 Auto-ban links
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const linkRegex = /(https?:\/\/|www\.)\S+/gi;
  if (linkRegex.test(message.content)) {
    try {
      await message.member.ban({ reason: 'Auto-banned for posting a link' });
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('🔨 User Banned')
            .setDescription(`**${message.author.tag}** was banned for posting a link.`)
        ]
      });
    } catch (err) {
      console.error('❌ Failed to auto-ban:', err);
    }
  }
});

client.login(process.env.TOKEN);
