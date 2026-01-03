const express = require("express");
const router = express.Router();

const {
  buildAssessmentPassedDM,
  buildAssessmentFailedDM,
  buildStaffAssessmentLog
} = require("./Embeds");

const { EmbedBuilder } = require("discord.js");

// Users allowed to submit multiple times
const DUPLICATE_WHITELIST = new Set([
  "654110914311618561",
  "614895781832556585",
]);

const STAFF_CHANNEL_ID = process.env.ASSESSMENT_CHANNEL_ID;
const PASS_MARK = Number(process.env.TALLY_PASS_SCORE || 7);

const processedSubmissions = new Set();

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

      const fields = Object.fromEntries(
        fieldsArray.map(f => [
          f.ref || f.key,
          typeof f.value === "string"
            ? f.value
            : f.value?.text ?? ""
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

      // ✅ Use known Discord ID field
      const discordId = String(fields["question_d6dpRy"] || "").trim();

      if (!discordId || !/^\d{17,20}$/.test(discordId)) {
        console.warn("[TALLY] Invalid Discord User ID:", discordId);
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
      client.applicantCache.set(String(discordId), {
        name: applicantName.toLowerCase().replace(/[^a-z0-9]/g, ""),
        role: roleApplied.toLowerCase().replace(/[^a-z0-9]/g, "")
      });

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
          { name: "Applicant", value: `<@${discordId}>` },
          { name: "Score", value: `${score} / 10`, inline: true },
          { name: "Auto Result", value: passed ? "✅ Pass" : "❌ Fail", inline: true }
        )
        .setTimestamp();

      // ── STAGE 2: Written answers (ONLY if passed) ──
      if (passed) {
        const writtenAnswers = fieldsArray
          .filter(
            f =>
              f.type === "TEXTAREA" &&
              typeof f.value === "string" &&
              f.value.trim().length
          )
          .map(f => {
            const name = String(f.label || "Written Answer").slice(0, 256);
            let value = f.value.trim();
            if (value.length > 1000) value = value.slice(0, 1000) + "…";
            return { name, value, inline: false };
          });

        // Embed limit: 25 fields total (we already use 3)
        const remainingSlots = 25 - 3;
        reviewEmbed.addFields(
          ...writtenAnswers.slice(0, Math.max(0, remainingSlots))
        );
      }

      const reviewButtons = {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Pass Assessment",
            custom_id: `assessment_pass:${discordId}`
          },
          {
            type: 2,
            style: 4,
            label: "Fail Assessment",
            custom_id: `assessment_fail:${discordId}`
          }
        ]
      };

      const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);
      await reviewChannel.send({
        embeds: [reviewEmbed],
        components: [reviewButtons]
      });

      if (STAFF_CHANNEL_ID) {
        const staffLog = await client.channels.fetch(STAFF_CHANNEL_ID);
        await staffLog.send({
          embeds: [
            buildStaffAssessmentLog({ discordId, score, passed })
          ]
        });
      }

      console.log(`[ASSESSMENT] ${discordId} | ${score}/10`);
      res.sendStatus(200);

    } catch (err) {
      console.error("[TALLY] Webhook error:", err);
      res.sendStatus(200);
    }
  });

  return router;
};
