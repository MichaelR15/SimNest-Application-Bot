const express = require("express");
const router = express.Router();

const {
  buildAssessmentPassedDM,
  buildAssessmentFailedDM,
  buildStaffAssessmentLog
} = require("./Embeds");

const STAFF_CHANNEL_ID = process.env.ASSESSMENT_CHANNEL_ID;
const PASS_MARK = Number(process.env.TALLY_PASS_SCORE || 7);

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

    // ── SCORE ──
    const score = Number(data.data.calculations?.score ?? 0);
    const passed = score >= PASS_MARK;

    // ── DM USER ──
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
