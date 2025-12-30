const fs = require("fs");
const path = require("path");

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const fields = require("./typeformfields");

const FORM_ID = process.env.TYPEFORM_FORM_ID;
const TYPEFORM_TOKEN = process.env.TYPEFORM_TOKEN;

const APPLICATION_CHANNEL_ID = "1455058600668954634";
const PING_ROLE_ID = "1455059336580829359";

const STATE_FILE = path.join(__dirname, "lastResponse.json");

// 🔎 HARD VALIDATION
if (!FORM_ID) throw new Error("TYPEFORM_FORM_ID is not set");
if (!TYPEFORM_TOKEN) throw new Error("TYPEFORM_TOKEN is not set");

console.log("Using Typeform token starting with:", TYPEFORM_TOKEN.slice(0, 8));
console.log("Using Typeform form ID:", FORM_ID);

// --------------------
// Typeform fetch
// --------------------
async function fetchResponses() {
  const url = `https://api.typeform.com/forms/${FORM_ID}/responses?completed=true&page_size=1&sort=submitted_at,desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TYPEFORM_TOKEN}`,
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Typeform API error ${res.status}: ${text}`);
  }

  return res.json();
}

// --------------------
// State helpers
// --------------------
function getLastResponseId() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")).lastResponseId;
}

function saveLastResponseId(id) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ lastResponseId: id }, null, 2)
  );
}

// --------------------
// Answer helper
// --------------------
function getAnswer(answers, fieldId) {
  const a = answers.find(x => x.field?.id === fieldId);
  if (!a) return "Not provided";

  return (
    a.text ||
    a.choice?.label ||
    a.choices?.labels?.join(", ") ||
    "Not provided"
  );
}

// --------------------
// Poller start
// --------------------
module.exports.start = (client) => {
  setInterval(async () => {
    try {
      const data = await fetchResponses();
      const latest = data.items?.[0];
      if (!latest) return;

      const lastId = getLastResponseId();
      if (latest.response_id === lastId) return;

      saveLastResponseId(latest.response_id);

      const channel = await client.channels.fetch(APPLICATION_CHANNEL_ID);
      if (!channel) return;

      const answers = latest.answers;

      // ---- Extract answers
      const name = getAnswer(answers, fields.NAME);
      const discordTag = getAnswer(answers, fields.DISCORD_USERNAME);
      const discordId = getAnswer(answers, fields.DISCORD_ID);
      const role = getAnswer(answers, fields.ROLE_APPLYING_FOR);
      const motivation = getAnswer(answers, fields.MOTIVATION);
      const conflict = getAnswer(answers, fields.CONFLICT);

      // ---- Build embed
      const embed = new EmbedBuilder()
        .setTitle("📄 New Staff Application")
        .setColor(0x5865F2)
        .addFields(
          {
            name: "Applicant Information",
            value:
              `**Name:** ${name}\n` +
              `**Discord:** ${discordTag}\n` +
              `**User ID:** ${discordId}`
          },
          {
            name: "Role Applied For",
            value: role,
            inline: true
          },
          {
            name: "Motivation",
            value: motivation.slice(0, 1000)
          },
          {
            name: "Conflict Handling",
            value: conflict.slice(0, 1000)
          }
        )
        .setTimestamp()
        .setFooter({ text: "SimNest Staff Applications" });

      // ---- Buttons
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("app_review")
          .setLabel("Review")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("app_deny")
          .setLabel("Deny")
          .setStyle(ButtonStyle.Danger)
      );

      // ---- Send message
      await channel.send({
        content: `<@&${PING_ROLE_ID}>`,
        embeds: [embed],
        components: [buttons]
      });

      console.log("New application detected and posted.");
    } catch (err) {
      console.error("Typeform polling error:", err.message);
    }
  }, 60 * 1000);
};
