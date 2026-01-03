require("dotenv").config();

const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField
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

const { buildInterviewWelcomeEmbed } = require("./interviewEmbeds");

const INTERVIEW_CATEGORY_ID = "1456842606003617975";
const INTERVIEW_ARCHIVE_CATEGORY_ID = "1456849242084741182";
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

/* ───────────────────────────
   CACHE
─────────────────────────── */

client.applicantCache = new Map();

/* ───────────────────────────
   EXPRESS
─────────────────────────── */

const app = express();
app.use(express.json({ limit: "2mb" }));
app.get("/", (_, res) => res.send("OK"));
app.use("/", tallyWebhook(client));

/* ───────────────────────────
   STATUS COMMAND
─────────────────────────── */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === "-status") {
    await msg.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 Bot Status")
          .setColor(0x57f287)
          .addFields(
            { name: "Status", value: "Online", inline: true },
            { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
            {
              name: "Uptime",
              value: `${Math.floor(process.uptime())}s`,
              inline: true
            }
          )
          .setTimestamp()
      ]
    });
  }
});

/* ───────────────────────────
   INTERACTIONS
─────────────────────────── */

client.on("interactionCreate", async (interaction) => {

  /* ───────── BUTTONS ───────── */
  if (interaction.isButton()) {
    const [action, applicantId] = interaction.customId.split(":");
    if (!applicantId) return;

    /* ── APPLICATION ACCEPT / DENY ── */
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

    /* ── START INTERVIEW (CREATE CHANNEL) ── */
    if (action === "interview_start") {
      console.log("[INTERVIEW CREATE] Start interview for", applicantId);

      const guild = interaction.guild;
      const applicant = await guild.members.fetch(applicantId).catch(() => null);

      if (!applicant) {
        return interaction.reply({
          content: "❌ Applicant not found in server.",
          ephemeral: true
        });
      }

      const cached = client.applicantCache.get(applicantId);
      const safeName =
        cached?.name ||
        applicant.user.username.toLowerCase().replace(/[^a-z0-9]/g, "");

      const channelName = `interview-${safeName}`;

      const channel = await guild.channels.create({
        name: channelName,
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
            allow: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      });

      console.log("[INTERVIEW CREATE] Channel created:", channel.id);

      await channel.send({
        embeds: [buildInterviewWelcomeEmbed(applicant.user)]
      });

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x57f287)
        .addFields({
          name: "Interview",
          value: `🗣️ Started by ${interaction.user}\nChannel: ${channel}`
        });

      await interaction.update({
        embeds: [updatedEmbed],
        components: []
      });

      return;
    }

    /* ── OPEN FEEDBACK MODAL ── */
    if (action === "assessment_pass" || action === "assessment_fail") {
      const modal = {
        title:
          action === "assessment_pass"
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
                max_length: 1000
              }
            ]
          }
        ]
      };

      return interaction.showModal(modal);
    }
  }

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

    try {
      const user = await client.users.fetch(applicantId);
      await user.send({
        components: passed
          ? buildInterviewPassedDM(user.username, feedback)
          : buildInterviewFailedDM(user.username, feedback),
        flags: 32768
      });
    } catch {}

    const channel = interaction.channel;
    const guild = interaction.guild;

    const member = await guild.members.fetch(applicantId).catch(() => null);
    const isAdmin =
      member?.permissions.has(PermissionsBitField.Flags.Administrator) ?? false;

    if (!isAdmin) {
      await channel.permissionOverwrites.edit(applicantId, {
        SendMessages: false
      });
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔒 Interview Concluded")
          .setColor(passed ? 0x57f287 : 0xed4245)
          .setTimestamp()
      ]
    });

    setTimeout(async () => {
      try {
        await channel.setParent(INTERVIEW_ARCHIVE_CATEGORY_ID);
      } catch {}
    }, 24 * 60 * 60 * 1000);
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
app.listen(PORT, () =>
  console.log(`🌐 Webhook server listening on ${PORT}`)
);

client.login(process.env.DISCORD_TOKEN);
