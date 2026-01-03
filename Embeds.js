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

function buildApplicationRejectedDM(username) {
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
            "Thank you for taking the time to apply to **SimNest**.\n\n" +
            "Unfortunately, your application was **not successful** on this occasion.\n\n" +
            "This doesn’t necessarily reflect negatively on you — we receive a high number of applications, and decisions are made based on current needs.\n\n" +
            "You’re welcome to apply again in the future.\n\n" +
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
            "Thanks for completing the assessment — we’ve finished reviewing your responses and you’ve **passed this stage**.\n\n" +
            "Your answers showed good judgement and an understanding of how moderation decisions should be handled.\n\n" +
            "The next step will be a **short conversation** with members of the **SimNest Directive team and the Owner**. You’ll be added to a group chat with them shortly.\n\n" +
            "There’s no fixed time for this — you can respond whenever you’re ready or free. It’s mainly an opportunity for you to ask questions about the role and for us to get to know you a bit better. While this stage is pass/fail, you won’t be asked anything difficult or put under pressure.\n\n" +
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
   STAFF ASSESSMENT LOG EMBED
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

/* ───────────────────────────
   INTERVIEW PASSED EMBED
─────────────────────────── */

function buildInterviewPassedDM(username, feedback) {
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
            "We’re happy to let you know that you’ve **successfully passed the interview stage**.\n\n" +
            "Welcome to the **SimNest staff team** — we’re excited to have you on board.\n\n" +
            (feedback
              ? `**Feedback from the team:**\n${feedback}\n\n`
              : "") +
            "You’ll receive further details shortly about next steps and onboarding.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

/* ───────────────────────────
   INTERVIEW FAILED EMBED
─────────────────────────── */


function buildInterviewFailedDM(username, feedback) {
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
            "Thank you for taking the time to speak with us.\n\n" +
            "After careful consideration, we’ve decided not to move forward with your application on this occasion.\n\n" +
            (feedback
              ? `**Feedback from the team:**\n${feedback}\n\n`
              : "") +
            "We genuinely appreciate your interest in SimNest and wish you all the best going forward.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}


module.exports = {
  buildAppliedDMComponents,
  buildStage2InviteDM,
  buildAssessmentPassedDM,
  buildAssessmentFailedDM,
  buildInterviewPassedDM,
  buildInterviewFailedDM,
  buildStaffAssessmentLog,
  buildApplicationRejectedDM,
};
