require("dotenv").config();
const express = require("express");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder
} = require("discord.js");

const typeformPoller = require("./typeformPoller");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const app = express();
app.use(express.json());

const tallyWebhook = require("./tallyWebhook")(client);
app.use("/", tallyWebhook);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});


/* ───────────────────────────
   STATUS EMBED
─────────────────────────── */

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  seconds %= 86400;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function buildStatusEmbed() {
  return new EmbedBuilder()
    .setTitle("📊 Bot Status")
    .setColor(0x57f287)
    .addFields(
      { name: "Status", value: "Online", inline: true },
      { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
      { name: "Uptime", value: formatUptime(process.uptime()), inline: true }
    )
    .setTimestamp();
}

/* ───────────────────────────
   V2 ACCEPTED DM (COMPONENTS)
─────────────────────────── */

function buildAcceptedDMComponents(username) {
  return [
    {
      type: 17,
      accent_color: 0x57f287,
      components: [
        {
          type: 12,
          items: [
            {
              type: 2,
              media: {
                url: "https://i.postimg.cc/cL2mQK6G/Sim-Nest-Application-Update.png"
              }
            }
          ]
        },
        {
          type: 10,
          content:
            `### Hi ${username || "there"},\n\n` +
            "We’re happy to let you know that your application has been **accepted**, and you’ve progressed to **Stage 2** of the SimNest recruitment process.\n\n" +
            "A member of the management team will be in touch shortly with next steps.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

/* ───────────────────────────
   PREFIX COMMAND
─────────────────────────── */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === "-status") {
    await msg.reply({ embeds: [buildStatusEmbed()] });
  }
});

/* ───────────────────────────
   READY
─────────────────────────── */

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  typeformPoller.start(client);
});

/* ───────────────────────────
   SLASH COMMAND
─────────────────────────── */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "status") {
    await interaction.reply({ embeds: [buildStatusEmbed()] });
  }
});

/* ───────────────────────────
   BUTTON HANDLER (FIXED)
─────────────────────────── */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, applicantId] = interaction.customId.split(":");

  if (!applicantId) {
    return interaction.reply({
      content: "❌ Applicant ID missing.",
      ephemeral: true
    });
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);

  /* ── ACCEPT ── */
  if (action === "app_accept") {
    embed.setColor(0x57f287).addFields({
      name: "Reviewed",
      value: `Accepted by ${interaction.user}`
    });

    await interaction.update({
      embeds: [embed],
      components: []
    });

    try {
      const user = await client.users.fetch(applicantId);
      await user.send({
        components: buildAcceptedDMComponents(user.username),
        flags: 32768
      });
    } catch {
      await interaction.followUp({
        content: "⚠️ Applicant could not be DMed (manual contact required).",
        ephemeral: true
      });
    }
  }

  /* ── DENY ── */
  if (action === "app_deny") {
    embed.setColor(0xed4245).addFields({
      name: "Reviewed",
      value: `Denied by ${interaction.user}`
    });

    await interaction.update({
      embeds: [embed],
      components: []
    });
  }
});

/* ───────────────────────────
   LOGIN
─────────────────────────── */

client.login(process.env.DISCORD_TOKEN);
