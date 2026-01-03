/**
 * Builds the welcome components for an interview channel (Components V2)
 */
function buildInterviewWelcomeComponents() {
  return [
    {
      type: 17,
      accent_color: 0x5865f2,
      components: [
        // ───────── IMAGE HEADER ─────────
        {
          type: 12,
          items: [
            {
              type: 2,
              media: {
                url: "https://i.postimg.cc/hjFSfYVg/Interview.png"
              }
            }
          ]
        },

        // ───────── MAIN CONTENT ─────────
        {
          type: 10,
          content:
            "### 👋 Welcome!\n\n" +
            "Thanks for passing the assessment and joining us here.\n\n" +
            "This channel is for a **calm, casual conversation** with members of the **SimNest Directive Team** and the **Owner**. " +
            "There are **no set questions**, and there’s nothing you need to prepare — just be yourself.\n\n" +
            "This stage is still part of our review process, but it’s not about right or wrong answers. " +
            "We’re simply having a conversation and getting a feel for how you interact in a team setting.\n\n" +

            "**What we’ll be paying attention to:**\n" +
            "• Professionalism\n" +
            "• Politeness & respect\n" +
            "• How you communicate with others\n" +
            "• Overall attitude\n\n" +

            "**No pressure**\n" +
            "There’s no rush to reply — you can respond whenever you’re comfortable. " +
            "The conversation can move at a pace that feels natural to you. We will end the interview once we feel we have enough information to make a decision.\n\n" +
            "**SimNest**"
        }
      ]
    }
  ];
}

module.exports = {
  buildInterviewWelcomeComponents
};
