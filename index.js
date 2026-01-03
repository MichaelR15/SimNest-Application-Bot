require("dotenv").config();

const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const tallyWebhook = require("./tallyWebhook");
const typeformPoller = require("./typeformPoller");

const {
  buildAssessmentPassedDM,
  buildAssessmentFailedDM,
  buildInterviewPassedDM,
  buildInterviewFailedDM
} = require("./Embeds");

const { buildInterviewWelcomeComponents } = require("./interviewEmbeds");

const INTERVIEW_CATEGORY_ID = "1456842606003617975";
const INTERVIEW_ARCHIVE_CATEGORY_ID = "1456849242084741182";
const INTERVIEW_LOG_CHANNEL_ID = "1456484120061280341";
const DIRECTIVE_ROLE_ID = "1310811297251590226";
const OWNER_ROLE_ID = "1310812850444304414";

/* ───────────────────────────
   CLIENT
─────────────────────────── */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.applicantCache = new Map();

/* ───────────────────────────
   EXPRESS
─────────────────────────── */

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/", tallyWebhook(client));

/* ───────────────────────────
   INTERACTIONS
─────────────────────────── */

client.on("interactionCreate", async (interaction) => {

  /* ───────── BUTTONS ───────── */
  if (interaction.isButton()) {
    const [action, applicantId] = interaction.customId.split(":");
    if (!applicantId) return;

    /* ── START INTERVIEW ── */
    if (action === "interview_start") {
      try {
        await interaction.deferUpdate();

        const guild = interaction.guild;

        const cached = client.applicantCache.get(String(applicantId));
        const user = await client.users.fetch(applicantId);

        const safeName =
          cached?.name ||
          user.username.toLowerCase().replace(/[^a-z0-9]/g, "");

        const channel = await guild.channels.create({
          name: `interview-${safeName}`,
          parent: INTERVIEW_CATEGORY_ID,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: guild.members.me.id, // ✅ BOT ITSELF
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.AttachFiles
              ]
            },
            {
              id: applicantId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: DIRECTIVE_ROLE_ID,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: OWNER_ROLE_ID,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            }
          ]
        });

        await channel.send({
          components: buildInterviewWelcomeComponents(),
          flags: 32768
        });

        await channel.send({
          components: [{
            type: 1,
            components: [
              {
                type: 2,
                style: 3,
                label: "Pass Interview",
                custom_id: `interview_pass:${applicantId}`
              },
              {
                type: 2,
                style: 4,
                label: "Fail Interview",
                custom_id: `interview_fail:${applicantId}`
              }
            ]
          }]
        });

      } catch (err) {
        console.error("[INTERVIEW CREATE] Failed:", err);
        if (!interaction.replied) {
          await interaction.followUp({
            content: "⚠️ Failed to create interview channel.",
            ephemeral: true
          });
        }
      }
      return;
    }

    /* ── OPEN FEEDBACK MODAL ── */
    if (
      action === "assessment_pass" ||
      action === "assessment_fail" ||
      action === "interview_pass" ||
      action === "interview_fail"
    ) {
      const stage =
        action.startsWith("assessment") ? "Assessment" : "Interview";

      return interaction.showModal({
        title: `${stage} Feedback`,
        custom_id: `feedback:${action}:${applicantId}`,
        components: [{
          type: 1,
          components: [{
            type: 4,
            custom_id: "feedback",
            label: "Feedback for the applicant",
            style: 2,
            required: false,
            max_length: 1000
          }]
        }]
      });
    }
  }

  /* ───────── MODAL SUBMIT ───────── */
  if (interaction.isModalSubmit()) {
    const [type, action, applicantId] = interaction.customId.split(":");
    if (type !== "feedback") return;

    const feedback = interaction.fields.getTextInputValue("feedback");
    const passed = action.endsWith("pass");

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(passed ? 0x57f287 : 0xed4245)
      .addFields(
        { name: "Outcome", value: passed ? "✅ Passed" : "❌ Failed" },
        feedback ? { name: "Feedback", value: feedback } : null
      )
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });

    const user = await client.users.fetch(applicantId);
    await user.send({
      components: action.startsWith("assessment")
        ? (passed
            ? buildAssessmentPassedDM(user.username, feedback)
            : buildAssessmentFailedDM(user.username, feedback))
        : (passed
            ? buildInterviewPassedDM(user.username, feedback)
            : buildInterviewFailedDM(user.username, feedback)),
      flags: 32768
    });

    if (action.startsWith("assessment") && passed) {
      const logChannel = await client.channels.fetch(INTERVIEW_LOG_CHANNEL_ID);
      await logChannel.send({
        content: `<@${applicantId}>`,
        components: [{
          type: 1,
          components: [{
            type: 2,
            style: 1,
            label: "Start Interview",
            custom_id: `interview_start:${applicantId}`
          }]
        }]
      });
    }

    if (action.startsWith("interview")) {
      const channel = interaction.channel;

      await channel.permissionOverwrites.edit(
        channel.guild.roles.everyone,
        { SendMessages: false }
      );

      setTimeout(() => {
        channel.setParent(INTERVIEW_ARCHIVE_CATEGORY_ID).catch(() => {});
      }, 24 * 60 * 60 * 1000);
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

app.listen(process.env.PORT || 8080);
client.login(process.env.DISCORD_TOKEN);
