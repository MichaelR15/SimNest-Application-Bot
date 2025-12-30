require("dotenv").config();

const typeformPoller = require("./typeformPoller");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🧠 Format uptime nicely
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// 🧱 Build status embed
function buildStatusEmbed() {
  const memoryMB = Math.round(
    process.memoryUsage().heapUsed / 1024 / 1024
  );

  return new EmbedBuilder()
    .setTitle("📊 Bot Status")
    .setColor(0x57F287) // green
    .addFields(
      {
        name: "🟢 Status",
        value: "Online",
        inline: true
      },
      {
        name: "📡 Ping",
        value: `${client.ws.ping} ms`,
        inline: true
      },
      {
        name: "⏱️ Uptime",
        value: formatUptime(process.uptime()),
        inline: true
      },
      {
        name: "🖥️ Servers",
        value: `${client.guilds.cache.size}`,
        inline: true
      },
      {
        name: "💾 Memory",
        value: `${memoryMB} MB`,
        inline: true
      },
      {
        name: "⚙️ Versions",
        value: `Node.js ${process.version}\nDiscord.js ${require("discord.js").version}`,
        inline: true
      }
    )
    .setFooter({
      text: client.user.username,
      iconURL: client.user.displayAvatarURL()
    })
    .setTimestamp();
}

// 🔹 PREFIX COMMAND (-status)
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "-status") {
    const embed = buildStatusEmbed();
    await message.reply({ embeds: [embed] });
  }
});

// 🔹 REGISTER SLASH COMMAND
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
    typeformPoller.start(client);

  const statusCommand = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Shows the bot status");

  // 🔴 IMPORTANT: replace with YOUR server ID
  const guild = await client.guilds.fetch("1295537293939179590");
  await guild.commands.create(statusCommand);
});

// 🔹 SLASH COMMAND HANDLER
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "status") {
    const embed = buildStatusEmbed();
    await interaction.reply({ embeds: [embed] });
  }
});

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  // REVIEW BUTTON
  if (interaction.customId === "app_review") {
    const reviewedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("app_review")
        .setLabel("Reviewed")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId("app_deny")
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true),

      new ButtonBuilder()
        .setCustomId("app_next_stage")
        .setLabel("Move to Next Stage")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.update({
      components: [reviewedRow]
    });
  }

  // DENY BUTTON
  if (interaction.customId === "app_deny") {
    await interaction.update({
      content: "❌ Application denied.",
      components: []
    });
  }

  // NEXT STAGE BUTTON
  if (interaction.customId === "app_next_stage") {
    await interaction.update({
      content: "✅ Application moved to the next stage.",
      components: []
    });
  }
});


// 🔐 LOGIN
client.login(process.env.DISCORD_TOKEN);

