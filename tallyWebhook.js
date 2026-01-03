const express = require("express");
const router = express.Router();

const {
  buildAssessmentPassedDM,
  buildAssessmentFailedDM,
  buildStaffAssessmentLog
} = require("./Embeds");

// Users allowed to submit multiple times
const DUPLICATE_WHITELIST = new Set([
  "654110914311618561", // example
  "614895781832556585", // your test user
]);

const {EmbedBuilder,} = require("discord.js");

const STAFF_CHANNEL_ID = process.env.ASSESSMENT_CHANNEL_ID;
const PASS_MARK = Number(process.env.TALLY_PASS_SCORE || 7);

const processedSubmissions = new Set();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = (client) => {
router.post("/tally", async (req, res) => {
  console.log("🟢 TALLY ROUTE HIT");

  try {
    const data = req.body;

const fieldsArray = data?.data?.fields;

if (!Array.isArray(fieldsArray)) {
  console.warn("[TALLY] Missing fields payload");
  return res.sendStatus(200);
}

fieldsArray.forEach(f => {
  console.log("FIELD:", {
    key: f.key,
    label: f.label,
    type: f.type,
    value: f.value
  });
});


// Build a map of ref → value (fallback to key)
const fields = Object.fromEntries(
  fieldsArray.map(f => [
    f.ref || f.key,
    typeof f.value === "string"
      ? f.value
      : f.value?.text ?? f.text ?? ""
  ])
);

const applicantName =
  fields["name"] ||
  fields["applicant_name"] ||
  "unknown";

const roleApplied =
  fields["role"] ||
  fields["role_applied_for"] ||
  "role";


const discordField = fieldsArray.find(
  f =>
    f.type === "INPUT_TEXT" &&
    typeof f.value === "string" &&
    f.label?.toLowerCase().includes("discord")
);

const discordId = discordField?.value?.trim();

if (!discordId || !/^\d{17,20}$/.test(discordId)) {
  console.warn("[TALLY] Invalid or missing discord_id", {
    label: discordField?.label,
    value: discordField?.value,
    type: discordField?.type
  });
  return res.sendStatus(200);
}

if (!discordId || !/^\d{17,20}$/.test(discordId)) {
  console.warn("[TALLY] Invalid or missing discord_id");
  return res.sendStatus(200);
}

if (
  processedSubmissions.has(discordId) &&
  !DUPLICATE_WHITELIST.has(discordId)
) {
  console.log("[TALLY] Duplicate submission ignored:", discordId);
  return res.sendStatus(200);
}

processedSubmissions.add(discordId);

// Cache for interview stage
client.applicantCache ??= new Map();
client.applicantCache.set(discordId, {
  name: applicantName.toLowerCase().replace(/[^a-z0-9]/g, ""),
  role: roleApplied.toLowerCase().replace(/[^a-z0-9]/g, "")
});


    // ── SCORE ──
const scoreField = fieldsArray.find(
  f => f.type === "CALCULATED_FIELDS"
);

const score = Number(scoreField?.value || 0);
    const passed = score >= PASS_MARK;

    const REVIEW_CHANNEL_ID = "1456484120061280341";

const reviewEmbed = new EmbedBuilder()
  .setTitle("🧪 Assessment Review")
  .setColor(0x5865f2)
  .addFields(
    { name: "Applicant", value: `<@${discordId}>`, inline: false },
    { name: "Score", value: `${score} / 10`, inline: true },
    { name: "Auto Result", value: passed ? "✅ Pass" : "❌ Fail", inline: true }
  )
  .setTimestamp();

const reviewButtons = {
  type: 1,
  components: passed
    ? [
        {
          type: 2,
          style: 3,
          label: "Start Interview",
          custom_id: `interview_start:${discordId}`
        },
        {
          type: 2,
          style: 4,
          label: "Fail",
          custom_id: `assessment_fail:${discordId}`
        }
      ]
    : [
        {
          type: 2,
          style: 4,
          label: "Fail",
          custom_id: `assessment_fail:${discordId}`
        }
      ]
};

const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);
await reviewChannel.send({
  embeds: [reviewEmbed],
  components: [reviewButtons]
});

    // ── DM USER ──

    console.log("📨 DM TARGET DISCORD ID:", discordId);

// ── DM USER (DELAYED, NON-BLOCKING) ──
setTimeout(async () => {
  try {
    const user = await client.users.fetch(discordId);
    await user.send({
      components: passed
        ? buildAssessmentPassedDM(user.username)
        : buildAssessmentFailedDM(user.username),
      flags: 32768
    });
  } catch (dmErr) {
    console.warn("[TALLY] Could not DM applicant:", dmErr.message);
  }
}, 60 * 1000); // 1 minute

    // ── STAFF LOG ──
    if (STAFF_CHANNEL_ID) {
      try {
        const channel = await client.channels.fetch(STAFF_CHANNEL_ID);
        await channel.send({
          embeds: [
            buildStaffAssessmentLog({ discordId, score, passed })
          ]
        });
      } catch (staffErr) {
        console.warn("[TALLY] Failed to post staff log:", staffErr.message);
      }
    }

    console.log(
      `[ASSESSMENT] ${passed ? "PASS" : "FAIL"} | ${discordId} | ${score}/10`
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("[TALLY] Webhook error:", err);
    res.sendStatus(200);
  }
});

  return router;
};
