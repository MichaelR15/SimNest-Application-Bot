const { EmbedBuilder } = require("discord.js");

/* ───────────────────────────
   COMPONENTS V2 — APPLIED
─────────────────────────── */

function buildAppliedDMComponents(username) {
  return [
    {
      type: 17,
      accent_color: 13535332,
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
            "Thanks for applying to join the SimNest staff team — we’re glad you took the time to tell us a bit about yourself.\n\n" +
            "Your application is now with our team for review. Please don’t message staff to check on progress.\n\n" +
            "If selected, we’ll invite you to the next stage.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

/* ───────────────────────────
   COMPONENTS V2 — STAGE 2 INVITE
─────────────────────────── */

function buildStage2InviteDM(username) {
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
            "Your application has been **accepted** and you’ve progressed to **Stage 2**.\n\n" +
            "**Please complete the assessment below:**\n\n" +
            "👉 https://tally.so/r/zxyN5k\n\n" +
            "Once complete, we’ll review your results.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

/* ───────────────────────────
   COMPONENTS V2 — ASSESSMENT PASSED
─────────────────────────── */

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

/* ───────────────────────────
   COMPONENTS V2 — ASSESSMENT FAILED
─────────────────────────── */

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
            "Thanks for taking the time to complete the assessment — we really appreciate the effort you put into it.\n\n" +
            "After reviewing your responses, you **haven’t progressed to the next stage** on this occasion. This doesn’t mean you did anything wrong — we often have to make tough decisions based on consistency, experience, and current team needs.\n\n" +
            "You’re welcome to take what you’ve learned and **apply again in the future**, especially if you feel more confident with moderation scenarios and decision-making.\n\n" +
            "Thanks again for your interest in SimNest, and we wish you all the best.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

/* ───────────────────────────
   STAFF LOG EMBED
─────────────────────────── */

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

module.exports = {
  buildAppliedDMComponents,
  buildStage2InviteDM,
  buildAssessmentPassedDM,
  buildAssessmentFailedDM,
  buildStaffAssessmentLog
};
