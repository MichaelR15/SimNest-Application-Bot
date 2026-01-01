require("dotenv").config();

const express = require("express");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const typeformPoller = require("./typeformPoller");
const { handleTallyWebhook } = require("./tallyWebhook");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
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

// 1️⃣ APPLIED (UNCHANGED)
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
            "Your application is now with our team for review, and we’ll be in touch within the next few days. We kindly ask that you don’t message staff to check on your application while reviews are ongoing.\n\n" +
            "If you’re selected to move forward, we’ll invite you to the next stage of the process.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

// 2️⃣ ACCEPTED → STAGE 2 (TALLY)
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
            "We’re happy to let you know that your application has been **accepted**, and you’ve progressed to **Stage 2** of the SimNest recruitment process.\n\n" +
            "**Next step:** please complete the short assessment using the link below:\n\n" +
            "👉 **https://tally.so/r/zxyN5k**\n\n" +
            "Once completed, we’ll review your responses and update you.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

// 3️⃣ ASSESSMENT PASSED
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
            "Thanks for completing the assessment — you’ve **successfully passed** this stage of the process.\n\n" +
            "The next phase will be a **short conversation** with members of the **Directive / Owner team**. You’ll be added to a chat shortly so this can take place.\n\n" +
            "We look forward to speaking with you.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

// 4️⃣ ASSESSMENT FAILED
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
            "Thanks for taking the time to complete the assessment.\n\n" +
            "After reviewing your responses, we’re unable to progress your application further on this occasion.\n\n" +
            "We appreciate the effort you put into applying and wish you all the best moving forward.\n\n" +
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
   BUTTON HANDLER (ACCEPT / DENY)
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
   TALLY WEBHOOK SERVER
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
  } catch (e) {
    console.error("[TALLY]", e);
    res.send("OK");
  }
});

app.listen(process.env.PORT || 8080, () =>
  console.log("Webhook server ready")
);

/* ───────────────────────────
   LOGIN
─────────────────────────── */

client.login(process.env.DISCORD_TOKEN);
