const { EmbedBuilder } = require("discord.js");

/**
 * Builds the welcome embed for an interview channel
 */
function buildInterviewWelcomeEmbed() {
  return new EmbedBuilder()
    .setTitle("👋 Welcome!")
    .setColor(0x5865f2)
    .setDescription(
      "Thanks for passing the assessment and joining us here.\n\n" +
      "This channel is for a **calm, casual conversation** with members of the **SimNest Directive Team** and the **Owner**. " +
      "There are **no set questions**, and there’s nothing you need to prepare — just be yourself.\n\n" +
      "This stage is still part of our review process, but it’s not about right or wrong answers. " +
      "We’re simply having a conversation and getting a feel for how you interact in a team setting."
    )
    .addFields(
      {
        name: "What we’ll be paying attention to",
        value:
          "• Professionalism\n" +
          "• Friendliness\n" +
          "• Politeness & respect\n" +
          "• How you communicate with others\n" +
          "• Overall attitude",
        inline: false
      },
      {
        name: "No pressure",
        value:
          "There’s no rush to reply — you can respond whenever you’re comfortable. " +
          "The conversation can move at a pace that feels natural to you.",
        inline: false
      }
    )
    .setFooter({
      text: "SimNest • Interview Stage"
    })
    .setTimestamp();
}

module.exports = {
  buildInterviewWelcomeEmbed
};
