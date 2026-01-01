require("dotenv").config();

const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const typeformPoller = require("./typeform");
const tallyWebhook = require("./tallywebhook");

const {
  buildStage2InviteDM
} = require("./Embeds");

/* ───────────────────────────
   DISCORD CLIENT
─────────────────────────── */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

/* ───────────────────────────
   EXPRESS SERVER
─────────────────────────── */

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/", (_, res) => res.send("OK"));

app.use("/", tallyWebhook(client));

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
   PREFIX COMMAND
─────────────────────────── */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === "-status") {
    await msg.reply({ embeds: [buildStatusEmbed()] });
  }
});

/* ───────────────────────────
   BUTTON HANDLER
─────────────────────────── */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, applicantId] = interaction.customId.split(":");
  if (!applicantId) return;

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);

  if (action === "app_accept") {
    embed.setColor(0x57f287).addFields({
      name: "Reviewed",
      value: `Accepted by ${interaction.user}`
    });

    await interaction.update({ embeds: [embed], components: [] });

    try {
      const user = await client.users.fetch(applicantId);
      await user.send({
        components: buildStage2InviteDM(user.username),
        flags: 32768
      });
    } catch {
      await interaction.followUp({
        content: "⚠️ Could not DM applicant.",
        ephemeral: true
      });
    }
  }

  if (action === "app_deny") {
    embed.setColor(0xed4245).addFields({
      name: "Reviewed",
      value: `Denied by ${interaction.user}`
    });

    await interaction.update({ embeds: [embed], components: [] });
  }
});

/* ───────────────────────────
   READY
─────────────────────────── */

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  typeformPoller.start(client);
});

/* ───────────────────────────
   START
─────────────────────────── */

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🌐 Webhook server listening on ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);

/* ───────────────────────────
   END
─────────────────────────── */
