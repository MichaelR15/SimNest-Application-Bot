const express = require("express");
const router = express.Router();

const { EmbedBuilder } = require("discord.js");

// ENV VARS (set these in Railway)
const STAFF_CHANNEL_ID = process.env.ASSESSMENT_CHANNEL_ID;
const PASS_MARK = Number(process.env.TALLY_PASS_SCORE || 7);

// ───────────────────────────
// COMPONENTS V2 DM EMBEDS
// ───────────────────────────

function buildAssessmentPassedDM(username) {
  return [
    {
      type: 17,
      accent_color: 0x57f287,
      components: [
        {
          type: 12,
          items: [
            {
              type: 2,
              media: {
                url: "https://i.postimg.cc/cL2mQK6G/Sim-Nest-Application-Update.png"
              }
            }
          ]
        },
        {
          type: 10,
          content:
            `### Hi ${username || "there"},\n\n` +
            "Thanks for completing the assessment — you’ve **successfully passed** this stage of the process.\n\n" +
            "The next phase will be a **short conversation** with members of the **Directive / Owner team**. You’ll be added to a chat shortly.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

function buildAssessmentFailedDM(username) {
  return [
    {
      type: 17,
      accent_color: 0xed4245,
      components: [
        {
          type: 12,
          items: [
            {
              type: 2,
              media: {
                url: "https://i.postimg.cc/cL2mQK6G/Sim-Nest-Application-Update.png"
              }
            }
          ]
        },
        {
          type: 10,
          content:
            `### Hi ${username || "there"},\n\n` +
            "Thanks for completing the assessment.\n\n" +
            "Unfortunately, you **haven’t progressed** to the next stage on this occasion.\n\n" +
            "We appreciate the time you took to apply.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

// ───────────────────────────
// STAFF LOG EMBED
// ───────────────────────────

function buildStaffAssessmentLog({ discordId, score, passed }) {
  return new EmbedBuilder()
    .setTitle("🧪 Staff Assessment Result")
    .setColor(passed ? 0x57f287 : 0xed4245)
    .addFields(
      {
        name: "Applicant",
        value: `<@${discordId}> (${discordId})`,
        inline: false
      },
      {
        name: "Score",
        value: `${score} / 10`,
        inline: true
      },
      {
        name: "Outcome",
        value: passed ? "✅ Passed" : "❌ Failed",
        inline: true
      }
    )
    .setTimestamp();
}

// ───────────────────────────
// WEBHOOK ROUTE
// ───────────────────────────

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
        data.data.fields.map(f => [f.key, f.value])
      );

      const discordId = fields.discord_id;
      const score = Number(data.data.calculations?.score ?? 0);

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
              buildStaffAssessmentLog({
                discordId,
                score,
                passed
              })
            ]
          });

          console.log(
            `[ASSESSMENT] ${passed ? "PASS" : "FAIL"} | ${discordId} | ${score}/10`
          );
        } catch (staffErr) {
          console.warn("[TALLY] Failed to post staff log:", staffErr.message);
        }
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("[TALLY] Webhook error:", err);
      res.sendStatus(200); // never let Tally retry forever
    }
  });

  return router;
};
