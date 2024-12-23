const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const {
  difficultyEmojis,
  fetchRobloxAvatar,
  fetchRobloxId,
  fetchTowerDifficultyData,
  fetchBadgeInfo,
  fetchAwardedDates,
} = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("areacompletion")
    .setDescription(
      "Check the tower completion status for a user in a specific area"
    )
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Roblox username")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("area_code").setDescription("Area code").setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const username = interaction.options.getString("username");
    const areaCode = interaction.options.getString("area_code");

    const robloxId = await fetchRobloxId(username);

    if (!robloxId) {
      return interaction.editReply(`User ${username} not found.`);
    }

    const avatarUrl = await fetchRobloxAvatar(robloxId);
    const awardedTowers = await fetchAwardedDates(robloxId, true);
    const towerData = await fetchTowerDifficultyData();
    const badgeInfo = await fetchBadgeInfo();

    const towersInArea = towerData
      .filter((tower) => tower.areaCode === areaCode)
      .sort((a, b) => a.numDifficulty - b.numDifficulty);

    const completionList = towersInArea
      .map((tower) => {
        const badge = badgeInfo.find(
          (badge) => badge.acronym === tower.acronym
        );
        const hasBeaten =
          badge &&
          awardedTowers.some(
            (awarded) =>
              awarded.id === badge.ktohBadgeId ||
              awarded.id === badge.oldBadgeId ||
              awarded.id === badge.badgeId
          );
        const status = hasBeaten
          ? "<:yes:1314114863290781707>"
          : "<:no:1314114886598660147>";
        const emoji =
          difficultyEmojis[tower.difficultyName.toLowerCase()] ||
          ":grey_question:";
        return `**[${emoji}]** ${tower.acronym} - ${status}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`Tower completion in area ${areaCode} for ${username}`)
      .setColor("#58b9ff")
      .setThumbnail(avatarUrl)
      .setDescription(`**Completion**\n${completionList}`);

    await interaction.editReply({ embeds: [embed] });
  },
};
