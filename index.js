require("dotenv").config();

const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const typeformPoller = require("./typeformPoller");
const tallyWebhook = require("./tallyWebhook");

const {
  buildStage2InviteDM,
  buildAssessmentPassedDM,
  buildAssessmentFailedDM,
  buildInterviewPassedDM,
  buildInterviewFailedDM
} = require("./Embeds");

const INTERVIEW_CATEGORY_ID = "1456842606003617975";
const DIRECTIVE_ROLE_ID = "1310811297251590226";
const OWNER_ROLE_ID = "1310812850444304414";
const INTERVIEW_ARCHIVE_CATEGORY_ID = "1456849242084741182";


const { buildInterviewWelcomeEmbed } = require("./interviewEmbeds");


// Store minimal applicant metadata for later interview creation
const applicantCache = new Map();

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
   INTERACTIONS (BUTTONS + MODALS)
─────────────────────────── */

client.on("interactionCreate", async (interaction) => {

  /* ───────── BUTTONS ───────── */
  if (interaction.isButton()) {
    const [action, applicantId] = interaction.customId.split(":");
    if (!applicantId) return;

    // ── TYPEFORM APPLICATION FLOW ──
    if (action === "app_accept" || action === "app_deny") {
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

      return;
    }

    // ── INTERVIEW REVIEW FLOW (OPEN MODAL) ──
    if (action === "assessment_pass" || action === "assessment_fail") {
      const modal = {
        title: action === "assessment_pass"
          ? "Interview Feedback (Pass)"
          : "Interview Feedback (Fail)",
        custom_id: `interview_feedback:${action}:${applicantId}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "feedback",
                label: "Feedback for the applicant (optional)",
                style: 2,
                required: false,
                max_length: 1000,
                placeholder: "This feedback will be sent to the applicant."
              }
            ]
          }
        ]
      };

      return interaction.showModal(modal);
    }
  }

  /* ───────── MODAL SUBMIT ───────── */
/* ───────── MODAL SUBMIT ───────── */
if (interaction.isModalSubmit()) {
  const [type, action, applicantId] = interaction.customId.split(":");
  if (type !== "interview_feedback") return;

  const feedback = interaction.fields.getTextInputValue("feedback");
  const passed = action === "assessment_pass";

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(passed ? 0x57f287 : 0xed4245)
    .addFields({
      name: "Interview Outcome",
      value: `${passed ? "✅ Passed" : "❌ Failed"} by ${interaction.user}`
    });

  await interaction.update({ embeds: [embed], components: [] });

  // ───────────────────────────
  // DM APPLICANT
  // ───────────────────────────
  try {
    const user = await client.users.fetch(applicantId);
    await user.send({
      components: passed
        ? buildInterviewPassedDM(user.username, feedback)
        : buildInterviewFailedDM(user.username, feedback),
      flags: 32768
    });
  } catch {
    await interaction.followUp({
      content: "⚠️ Could not DM applicant.",
      ephemeral: true
    });
  }

  // ───────────────────────────
  // INTERVIEW CONCLUDED (LOCK + ARCHIVE)
  // ───────────────────────────
  try {
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) return;

    const cached = client.applicantCache?.get(applicantId);
    const outcome = passed ? "pass" : "fail";

    // Lock applicant
    await channel.permissionOverwrites.edit(applicantId, {
      SendMessages: false
    });

    // Closing embed
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔒 Interview Concluded")
          .setColor(passed ? 0x57f287 : 0xed4245)
          .setDescription(
            "This interview has now concluded.\n\n" +
            "You’ll receive feedback in your DMs shortly."
          )
          .setTimestamp()
      ]
    });

    // Archive after 24h
    setTimeout(async () => {
      try {
        const newName = `interview_${cached?.name || "applicant"}-${outcome}`;
        await channel.setName(newName);
        await channel.setParent(INTERVIEW_ARCHIVE_CATEGORY_ID);
      } catch (err) {
        console.error("[INTERVIEW] Archive failed:", err);
      }
    }, 24 * 60 * 60 * 1000);

  } catch (err) {
    console.error("[INTERVIEW] Conclusion handling failed:", err);
  }
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
