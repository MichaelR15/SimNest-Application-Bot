const fs = require("fs");
const path = require("path");

const FORM_ID = process.env.TYPEFORM_FORM_ID;
const TYPEFORM_TOKEN = process.env.TYPEFORM_TOKEN;

const APPLICATION_CHANNEL_ID = "PASTE_CHANNEL_ID";
const PING_ROLE_ID = "PASTE_ROLE_ID";

// Where we remember the last response we processed
const STATE_FILE = path.join(__dirname, "lastResponse.json");

async function fetchResponses() {
  const res = await fetch(
    `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1&sort=submitted_at,desc`,
    {
      headers: {
        Authorization: `Bearer ${TYPEFORM_TOKEN}`
      }
    }
  );

  if (!res.ok) throw new Error("Failed to fetch Typeform responses");
  return res.json();
}

function getLastResponseId() {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE)).lastResponseId;
}

function saveLastResponseId(id) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ lastResponseId: id }));
}

module.exports.start = (client) => {
  setInterval(async () => {
    try {
      const data = await fetchResponses();
      const latest = data.items?.[0];
      if (!latest) return;

      const lastId = getLastResponseId();
      if (latest.response_id === lastId) return;

      // New application detected
      saveLastResponseId(latest.response_id);

      const channel = await client.channels.fetch(APPLICATION_CHANNEL_ID);
      if (!channel) return;

      const embed = {
        title: "📄 New Application",
        description: "A new staff application has been submitted.",
        color: 0x5865F2,
        timestamp: new Date().toISOString()
      };

      await channel.send({
        content: `<@&${PING_ROLE_ID}>`,
        embeds: [embed]
      });

      console.log("New application detected and posted.");
    } catch (err) {
      console.error("Typeform polling error:", err.message);
    }
  }, 60 * 1000); // checks every 1 minute
};
