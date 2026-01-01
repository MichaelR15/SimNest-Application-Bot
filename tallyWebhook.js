const express = require("express");
const router = express.Router();

const {
  EmbedBuilder
} = require("discord.js");

module.exports = (client) => {
  router.post("/tally", async (req, res) => {
    try {
      const data = req.body;

      // Extract fields
      const fields = Object.fromEntries(
        data.data.fields.map(f => [f.key, f.value])
      );

      const discordId = fields.discord_id;
      const score = Number(data.data.calculations?.score ?? 0);

      if (!discordId) {
        console.warn("Tally webhook received without discord_id");
        return res.sendStatus(200);
      }

      const user = await client.users.fetch(discordId);

      // FAIL
      if (score <= 6) {
        const embed = new EmbedBuilder()
          .setTitle("Assessment Result")
          .setColor(0xed4245)
          .setDescription(
            "Thank you for completing the assessment.\n\n" +
            "Unfortunately, you have **not progressed** to the next stage at this time."
          );

        await user.send({ embeds: [embed] });
      }

      // PASS
      if (score >= 7) {
        const embed = new EmbedBuilder()
          .setTitle("Assessment Passed 🎉")
          .setColor(0x57f287)
          .setDescription(
            "Congratulations!\n\n" +
            "You have **passed the assessment** and will move forward in the recruitment process."
          );

        await user.send({ embeds: [embed] });
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("Tally webhook error:", err);
      res.sendStatus(200); // Always 200 so Tally doesn't retry forever
    }
  });

  return router;
};
