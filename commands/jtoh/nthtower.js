const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const {
  fetchRobloxId,
  fetchRobloxAvatar,
  fetchAwardedDates,
  difficultyColors,
  difficultyEmojis,
} = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nthtower")
    .setDescription("Check the nth tower beaten by a user in JToH")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Roblox username")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("nth")
        .setDescription("The nth tower to check")
        .setRequired(true)
    )
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  async execute(interaction) {
    await interaction.deferReply();

    const username = interaction.options.getString("username");
    const nth = interaction.options.getInteger("nth");

    const robloxId = await fetchRobloxId(username);
    if (!robloxId) {
      return interaction.editReply(`User ${username} not found.`);
    }

    const avatarUrl = await fetchRobloxAvatar(robloxId);
    const awardedTowers = await fetchAwardedDates(robloxId);

    if (!awardedTowers?.length) {
      return interaction.editReply(
        `No JToH tower badges found for **${username}**.`
      );
    }

    const filteredAwardedTowers = awardedTowers
      .filter((badge) => badge.towerType !== "MiniTower")
      .sort((a, b) => new Date(a.awardedDate) - new Date(b.awardedDate));

    if (nth < 1 || nth > filteredAwardedTowers.length) {
      return interaction.editReply(
        `Invalid number. Please provide a number between 1 and ${filteredAwardedTowers.length}.`
      );
    }

    const nthTower = filteredAwardedTowers[nth - 1];
    const embedColor = difficultyColors[nthTower.difficultyName] || "#99AAb5";
    const difficultyEmoji =
      difficultyEmojis[nthTower.difficultyName] || ":question:";

    const embed = new EmbedBuilder()
      .setTitle(`The ${nth}th tower beaten by ${username}`)
      .setColor(embedColor)
      .setThumbnail(avatarUrl)
      .addFields(
        {
          name: "No.",
          value: nth.toString(),
        },
        {
          name: "Tower",
          value: `**[${difficultyEmoji}]** ${nthTower.acronym}`,
        },
        {
          name: "Date beaten",
          value: `<t:${Math.floor(
            new Date(nthTower.awardedDate).getTime() / 1000
          )}:f>`,
        }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
