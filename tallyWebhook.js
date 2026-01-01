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
    try {
      const data = req.body;

      if (!data?.data?.fields) {
        console.warn("[TALLY] Missing fields payload");
        return res.sendStatus(200);
      }

// Convert Tally fields into key/value object
const fields = Object.fromEntries(
  data.data.fields.map(f => [f.ref || f.key, f.value])
);

const discordId = fields.discord_id;

// 🔍 DEBUG — TEMPORARY
console.log("TALLY FIELDS:", Object.keys(fields));

if (!discordId || !/^\d{17,20}$/.test(discordId)) {
  console.warn("[TALLY] Invalid or missing discord_id");
  return res.sendStatus(200);
}

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
