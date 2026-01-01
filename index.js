require("dotenv").config();

const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const typeformPoller = require("./typeformPoller");
const { handleTallyWebhook } = require("./tallyWebhook");

app.post("/tally", (req, res) => {
  console.log("🟢 TALLY WEBHOOK HIT");
  console.log(JSON.stringify(req.body, null, 2));
  res.send("OK");
});

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
   EXPRESS (TALLY WEBHOOK)
─────────────────────────── */

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/", (_, res) => res.send("OK"));

app.post("/tally", async (req, res) => {
  try {
    if (req.query.key !== process.env.TALLY_WEBHOOK_KEY) {
      return res.status(401).send("Unauthorized");
    }

    await handleTallyWebhook(client, {
      payload: req.body,
      buildAssessmentPassedDM,
      buildAssessmentFailedDM
    });

    res.send("OK");
  } catch (err) {
    console.error("[TALLY WEBHOOK ERROR]", err);
    res.send("OK"); // prevent retries
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("🌐 Webhook server listening");
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
   COMPONENTS V2 EMBEDS
─────────────────────────── */

// APPLIED (unchanged)
function buildAppliedDMComponents(username) {
  return [
    {
      type: 17,
      accent_color: 13535332,
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
            "Thanks for applying to join the SimNest staff team — we’re glad you took the time to tell us a bit about yourself.\n\n" +
            "Your application is now with our team for review. Please don’t message staff to check on progress.\n\n" +
            "If selected, we’ll invite you to the next stage.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

// STAGE 2 (TALLY)
function buildStage2InviteDM(username) {
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
            "Your application has been **accepted** and you’ve progressed to **Stage 2**.\n\n" +
            "**Please complete the assessment below:**\n\n" +
            "👉 https://tally.so/r/zxyN5k\n\n" +
            "Once complete, we’ll review your results.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

// ASSESSMENT PASSED
function buildAssessmentPassedDM(username) {
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
            "You’ve **passed the assessment** 🎉\n\n" +
            "The next phase will be a **short conversation** with members of the **Directive / Owner team**.\n\n" +
            "You’ll be added to a chat shortly.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

// ASSESSMENT FAILED
function buildAssessmentFailedDM(username) {
  return [
    {
      type: 17,
      accent_color: 0xed4245,
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
            "Thanks for completing the assessment.\n\n" +
            "Unfortunately, you haven’t progressed further on this occasion.\n\n" +
            "We appreciate the effort you put in and wish you the best going forward.\n\n" +
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
   LOGIN
─────────────────────────── */

client.login(process.env.DISCORD_TOKEN);
