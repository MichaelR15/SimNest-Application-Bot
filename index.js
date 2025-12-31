require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const typeformPoller = require("./typeformPoller");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ─────────────────────────────────────────────
// 🔹 STAGE 2 DM EMBED (Accepted)
// ─────────────────────────────────────────────
function buildStageTwoDMEmbed(userName) {
  return new EmbedBuilder()
    .setImage("https://i.postimg.cc/cL2mQK6G/Sim-Nest-Application-Update.png")
    .setColor(0x57F287)
    .setDescription(
      `### Hi ${userName || "there"},\n\n` +
      "We’re happy to let you know that your application has been **accepted** and you’ve progressed to the next stage of the SimNest recruitment process.\n\n" +
      "A member of the team will reach out to you soon with further details on what happens next.\n\n" +
      "**SimNest**"
    );
}

// ─────────────────────────────────────────────
// 🔹 BOT READY
// ─────────────────────────────────────────────
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  typeformPoller.start(client);
});

// ─────────────────────────────────────────────
// 🔹 BUTTON HANDLER
// ─────────────────────────────────────────────
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);

  // Extract Applicant ID from footer
  const footerText = embed.data.footer?.text || "";
  const match = footerText.match(/Applicant ID:\s*(\d{17,20})/);
  const applicantId = match?.[1];

  // ACCEPT
  if (interaction.customId === "app_accept") {
    embed
      .addFields({
        name: "Reviewed",
        value: `Accepted by ${interaction.user}`
      })
      .setColor(0x57F287);

    await interaction.update({
      embeds: [embed],
      components: []
    });

    // DM applicant
    if (applicantId) {
      try {
        const user = await client.users.fetch(applicantId);
        await user.send({
          embeds: [buildStageTwoDMEmbed(user.username)]
        });
      } catch {
        console.warn(`Could not DM applicant ${applicantId}`);
      }
    }
  }

  // DENY
  if (interaction.customId === "app_deny") {
    embed
      .addFields({
        name: "Reviewed",
        value: `Denied by ${interaction.user}`
      })
      .setColor(0xED4245);

    await interaction.update({
      embeds: [embed],
      components: []
    });
  }
});

// 🔐 LOGIN
client.login(process.env.DISCORD_TOKEN);
