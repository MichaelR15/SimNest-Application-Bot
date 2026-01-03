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
  buildInterviewFailedDM,
  buildStage2InviteDM,
  buildApplicationRejectedDM
} = require("./Embeds");

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

    // ALWAYS acknowledge
    await interaction.deferUpdate();

    /* ── TYPEFORM APPLICATION ── */
    if (action === "app_accept") {
      try {
        const user = await client.users.fetch(applicantId);

        await user.send({
          components: buildStage2InviteDM(user.username),
          flags: 32768
        });

        console.log("[TYPEFORM] Accepted → Stage 2 invite sent:", applicantId);
      } catch (err) {
        console.warn("[TYPEFORM] Failed to DM Stage 2 invite:", err.message);
      }

      return;
    }

    if (action === "app_deny") {
      try {
        const user = await client.users.fetch(applicantId);

        await user.send({
          components: buildApplicationRejectedDM(user.username),
          flags: 32768
        });

        console.log("[TYPEFORM] Application rejected:", applicantId);
      } catch (err) {
        console.warn("[TYPEFORM] Failed to DM rejection:", err.message);
      }

      return;
    }

    /* ── START INTERVIEW ── */
    if (action === "interview_start") {
      try {
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
          content: `<@${applicantId}> <@&${DIRECTIVE_ROLE_ID}> <@&${OWNER_ROLE_ID}>`,
          allowedMentions: {
            users: [applicantId],
            roles: [DIRECTIVE_ROLE_ID, OWNER_ROLE_ID]
          }
        });

        const logChannel = await client.channels.fetch(INTERVIEW_LOG_CHANNEL_ID);
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🗂 Interview Started")
              .setColor(0x5865f2)
              .addFields(
                { name: "Applicant", value: `<@${applicantId}>` },
                { name: "Channel", value: `<#${channel.id}>` }
              )
              .setTimestamp()
          ],
          components: [
            {
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
            }
          ]
        });

      } catch (err) {
        console.error("[INTERVIEW] Failed to start interview:", err);
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
      return interaction.showModal({
        title: "Feedback",
        custom_id: `feedback:${action}:${applicantId}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "feedback",
                label: "Feedback for the applicant",
                style: 2,
                required: false,
                max_length: 1000
              }
            ]
          }
        ]
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

    try {
      const user = await client.users.fetch(applicantId);

      await user.send({
        components: action.startsWith("assessment")
          ? passed
            ? buildAssessmentPassedDM(user.username, feedback)
            : buildAssessmentFailedDM(user.username, feedback)
          : passed
            ? buildInterviewPassedDM(user.username, feedback)
            : buildInterviewFailedDM(user.username, feedback),
        flags: 32768
      });

    } catch (err) {
      console.warn("[DM] Failed to DM applicant:", err.message);
    }

    if (action.startsWith("interview")) {
      const channel = interaction.channel;

      await channel.permissionOverwrites.edit(applicantId, {
        SendMessages: false
      });

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
