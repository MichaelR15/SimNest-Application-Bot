const fs = require("fs");
const path = require("path");

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  buildAppliedDMComponents
} = require("./Embeds");

const FORM_ID = process.env.TYPEFORM_FORM_ID;
const TYPEFORM_TOKEN = process.env.TYPEFORM_TOKEN;

const APPLICATION_CHANNEL_ID = "1455058600668954634";
const PING_ROLE_ID = "1455059336580829359";

const TYPEFORM_REVIEW_URL =
  "https://admin.typeform.com/form/Q68IW4Ef/results#insights";

const STATE_FILE = path.join(__dirname, "typeform_state.json");

if (!FORM_ID) throw new Error("TYPEFORM_FORM_ID missing");
if (!TYPEFORM_TOKEN) throw new Error("TYPEFORM_TOKEN missing");

/* ───────────────────────────
   STATE
─────────────────────────── */

let state = { lastResponseId: null };

if (fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    console.warn("[TYPEFORM] State file invalid, starting fresh");
  }
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/* ───────────────────────────
   FETCH RESPONSES
─────────────────────────── */

async function fetchResponses() {
  const res = await fetch(
    `https://api.typeform.com/forms/${FORM_ID}/responses?completed=true&page_size=1&sort=submitted_at,desc`,
    {
      headers: {
        Authorization: `Bearer ${TYPEFORM_TOKEN}`,
        Accept: "application/json"
      }
    }
  );

  if (!res.ok) {
    throw new Error(`Typeform API error ${res.status}`);
  }

  return res.json();
}

/* ───────────────────────────
   ANSWER HELPER
─────────────────────────── */

function getAnswer(answers, ref) {
  const a = answers.find(x => x.field?.ref === ref);
  if (!a) return "Not provided";

  return (
    a.text ||
    a.choice?.label ||
    a.choices?.labels?.join(", ") ||
    "Not provided"
  );
}

/* ───────────────────────────
   START POLLER
─────────────────────────── */

module.exports.start = (client) => {
  setInterval(async () => {
    try {
      const data = await fetchResponses();
      const latest = data.items?.[0];
      if (!latest) return;

      // 🛑 Prevent resend on restart
      if (latest.response_id === state.lastResponseId) return;

      state.lastResponseId = latest.response_id;
      saveState();

      const channel = await client.channels.fetch(APPLICATION_CHANNEL_ID);
      if (!channel) return;

      const applicantId = getAnswer(latest.answers, "discord_id");
      const applicantName = getAnswer(latest.answers, "name");

      const staffEmbed = new EmbedBuilder()
        .setTitle("📄 New Staff Application")
        .setColor(0x5865F2)
        .addFields(
          {
            name: "Applicant Information",
            value:
              `**Name:** ${applicantName}\n` +
              `**Discord Username:** ${getAnswer(latest.answers, "discord_username")}\n` +
              `**User:** <@${applicantId}>\n` +
              `**Country:** ${getAnswer(latest.answers, "country")}\n` +
              `**Timezone:** ${getAnswer(latest.answers, "timezone")}`
          },
          {
            name: "Role & Motivation",
            value:
              `**Role Applied For:** ${getAnswer(latest.answers, "role")}\n\n` +
              `**Motivation:**\n${getAnswer(latest.answers, "motivation")}`
          },
          {
            name: "Conflict Handling",
            value: getAnswer(latest.answers, "conflict_handling")
          },
          {
            name: "Describe Yourself",
            value: getAnswer(latest.answers, "about")
          },
          {
            name: "Moderation Experience",
            value: getAnswer(latest.answers, "moderation_experience")
          },
          {
            name: "Past Staff Experience",
            value:
              `**Previous Experience:** ${getAnswer(latest.answers, "role_experience")}\n\n` +
              `**Servers:** ${getAnswer(latest.answers, "specific_servers")}\n\n` +
              `**Roles & Permissions:** ${getAnswer(latest.answers, "role_details")}\n\n` +
              `**Challenges Faced:** ${getAnswer(latest.answers, "role_challenges")}`
          }
        )
        .setFooter({
          text: `SimNest Staff Applications • Applicant ID: ${applicantId}`
        })
        .setTimestamp();

      const reviewRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Review Application")
          .setStyle(ButtonStyle.Link)
          .setURL(TYPEFORM_REVIEW_URL)
      );

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_accept:${applicantId}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`app_deny:${applicantId}`)
          .setLabel("Deny")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `<@&${PING_ROLE_ID}>`,
        embeds: [staffEmbed],
        components: [reviewRow, actionRow]
      });

      if (/^\d{17,20}$/.test(applicantId)) {
        try {
          const user = await client.users.fetch(applicantId);
          await user.send({
            components: buildAppliedDMComponents(applicantName),
            flags: 32768
          });
        } catch {
          console.warn(`Could not DM applicant ${applicantId}`);
        }
      }

      console.log("✅ Application processed");
    } catch (err) {
      console.error("Typeform polling error:", err.message);
    }
  }, 60 * 1000);
};
