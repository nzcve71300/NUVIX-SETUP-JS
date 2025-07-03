// ✅ index.js — Clean ticket system core
const { 
  Client, GatewayIntentBits, Partials, REST, Routes,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionsBitField
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

client.commands = new Map();

// 🔁 Load all slash commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// 🔁 Register slash commands
client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    const commands = [...client.commands.values()].map(cmd => cmd.data.toJSON());
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ Logged in as ${client.user.tag}`);
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

// ✅ Handle interactions
client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction, client);
    }

    if (interaction.isButton()) {
      const handler = require('./interactions/buttonHandler');
      await handler(interaction, client);
    }

    if (interaction.isModalSubmit()) {
      const handler = require('./interactions/modalHandler');
      await handler(interaction, client);
    }
  } catch (err) {
    console.error(`❌ Interaction error:`, err);
  }
});

client.login(process.env.TOKEN);
