const fs = require("fs");
const path = require("path");

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const FORM_ID = process.env.TYPEFORM_FORM_ID;
const TYPEFORM_TOKEN = process.env.TYPEFORM_TOKEN;

const APPLICATION_CHANNEL_ID = "1455058600668954634";
const PING_ROLE_ID = "1455059336580829359";

const TYPEFORM_REVIEW_URL =
  "https://admin.typeform.com/form/Q68IW4Ef/results#insights";

const STATE_FILE = path.join(__dirname, "lastResponse.json");

// ─────────────────────────────────────────────
// 🔹 VALIDATION
// ─────────────────────────────────────────────
if (!FORM_ID) throw new Error("TYPEFORM_FORM_ID missing");
if (!TYPEFORM_TOKEN) throw new Error("TYPEFORM_TOKEN missing");

// ─────────────────────────────────────────────
// 🔹 FETCH RESPONSES
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 🔹 STATE HELPERS
// ─────────────────────────────────────────────
function getLastResponseId() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")).lastResponseId;
}

function saveLastResponseId(id) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastResponseId: id }, null, 2));
}

// ─────────────────────────────────────────────
// 🔹 ANSWER HELPER (USES refs)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 🔹 APPLIED DM EMBED
// ─────────────────────────────────────────────
function buildAppliedDMEmbed(userName) {
  return new EmbedBuilder()
    .setImage("https://i.postimg.cc/cL2mQK6G/Sim-Nest-Application-Update.png")
    .setColor(13535332)
    .setDescription(
      `### Hi ${userName || "there"},\n\n` +
      "Thanks for applying to join the SimNest staff team — we’re glad you took the time to tell us a bit about yourself.\n\n" +
      "Your application is now with our team for review, and we’ll be in touch within the next few days. " +
      "We kindly ask that you don’t message staff to check on your application while reviews are ongoing.\n\n" +
      "If you’re selected to move forward, we’ll invite you to the next stage of the process.\n\n" +
      "**SimNest**"
    );
}

// ─────────────────────────────────────────────
// 🔹 START POLLER
// ─────────────────────────────────────────────
module.exports.start = (client) => {
  setInterval(async () => {
    try {
      const data = await fetchResponses();
      const latest = data.items?.[0];
      if (!latest) return;

      if (latest.response_id === getLastResponseId()) return;
      saveLastResponseId(latest.response_id);

      const channel = await client.channels.fetch(APPLICATION_CHANNEL_ID);
      if (!channel) return;

      const applicantId = getAnswer(latest.answers, "discord_id");
      const applicantName = getAnswer(latest.answers, "name");

      // ───────── STAFF EMBED ─────────
      const embed = new EmbedBuilder()
        .setTitle("📄 New Staff Application")
        .setColor(0x5865F2)
        .addFields(
    {
      name: "Applicant Information",
      value:
        `**Name:** ${getAnswer(latest.answers, "name")}\n` +
        `**Discord:** ${getAnswer(latest.answers, "discord_username")}\n` +
        `**User:** <@${getAnswer(latest.answers, "discord_id")}>`
    },
    {
      name: "Role Applied For",
      value: getAnswer(latest.answers, "role")
    },
    {
      name: "Motivation",
      value: getAnswer(latest.answers, "motivation")
    },
    {
      name: "Conflict Handling",
      value: getAnswer(latest.answers, "conflict_handling")
    },
    {
      name: "Moderation Experience",
      value: getAnswer(latest.answers, "moderation_experience")
    },
    {
      name: "Past Staff Experience",
      value:
        `**Communities:** ${getAnswer(latest.answers, "specific_servers")}\n\n` +
        `**Roles & Responsibilities:** ${getAnswer(latest.answers, "role_details")}\n\n` +
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
          .setCustomId("app_accept")
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("app_deny")
          .setLabel("Deny")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `<@&${PING_ROLE_ID}>`,
        embeds: [embed],
        components: [reviewRow, actionRow]
      });

      // ───────── DM APPLICANT ─────────
      if (/^\d{17,20}$/.test(applicantId)) {
        try {
          const user = await client.users.fetch(applicantId);
          await user.send({
            embeds: [buildAppliedDMEmbed(applicantName)]
          });
        } catch {
          console.warn(`Could not DM applicant ${applicantId}`);
        }
      }

      console.log("✅ New application processed");
    } catch (err) {
      console.error("Typeform polling error:", err.message);
    }
  }, 60 * 1000);
};
