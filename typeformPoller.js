const fs = require("fs");
const path = require("path");

const FORM_ID = process.env.TYPEFORM_FORM_ID;
const TYPEFORM_TOKEN = process.env.TYPEFORM_TOKEN;

const APPLICATION_CHANNEL_ID = "1455058600668954634";
const PING_ROLE_ID = "1455059336580829359";

const STATE_FILE = path.join(__dirname, "lastResponse.json");

// 🔎 HARD VALIDATION (important)
if (!FORM_ID) {
  throw new Error("TYPEFORM_FORM_ID is not set");
}
if (!TYPEFORM_TOKEN) {
  throw new Error("TYPEFORM_TOKEN is not set");
}

console.log("Using Typeform token starting with:", TYPEFORM_TOKEN.slice(0, 8));
console.log("Using Typeform form ID:", FORM_ID);

async function fetchResponses() {
  const url = `https://api.typeform.com/forms/${FORM_ID}/responses?completed=true&page_size=1&sort=submitted_at,desc`;

  const res = await fetch(url, {
    method: "GET",
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
      await channel.send({
        content: `<@&${PING_ROLE_ID}>`,
        embeds: [embed]
      });

      console.log("New application detected and posted.");
    } catch (err) {
      console.error("Typeform polling error:", err.message);
    }
  }, 60 * 1000);
};
