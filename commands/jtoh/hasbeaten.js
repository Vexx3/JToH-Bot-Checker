const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  fetchRobloxId,
  fetchBadgeInfo,
  fetchAwardedDateForBadge,
  fetchTowerDifficultyData,
  fetchRobloxAvatar,
  difficultyColors,
  difficultyEmojis,
} = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hasbeaten")
    .setDescription("Check if a user has beaten a specific tower in JToH")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Roblox username")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("tower").setDescription("Tower acronym").setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const username = interaction.options.getString("username");
    const towerAcronym = interaction.options.getString("tower");

    const robloxId = await fetchRobloxId(username);
    if (!robloxId) {
      return interaction.editReply(`User ${username} not found.`);
    }

    const avatarUrl = await fetchRobloxAvatar(robloxId);
    const badgeInfo = await fetchBadgeInfo();
    const towerDifficultyData = await fetchTowerDifficultyData();

    const towerBadge = badgeInfo.find(
      (badge) => badge.acronym.toLowerCase() === towerAcronym.toLowerCase()
    );

    const towerData = towerDifficultyData.find(
      (tower) => tower.acronym.toLowerCase() === towerAcronym.toLowerCase()
    );

    if (!towerBadge) {
      return interaction.editReply(
        `Tower with acronym ${towerAcronym} not found.`
      );
    }

    const badgeIds = [
      towerBadge.ktohBadgeId,
      towerBadge.oldBadgeId,
      towerBadge.badgeId,
    ].filter(Boolean);
    const awardedDate = await fetchAwardedDateForBadge(robloxId, badgeIds);

    const difficultyLevel = towerData.difficultyName;
    const embedColor = difficultyColors[difficultyLevel] || "#99AAb5";
    const difficultyEmoji = difficultyEmojis[difficultyLevel] || ":question:";

    const embed = new EmbedBuilder()
      .setTitle(`Completion status of player`)
      .setColor(embedColor)
      .setThumbnail(avatarUrl)
      .addFields(
        {
          name: "Player",
          value: username,
        },
        {
          name: "Tower",
          value: `**[${difficultyEmoji}]** ${towerData.name}`,
        },
        {
          name: "Status",
          value: awardedDate
            ? "<:yes:1314114863290781707>"
            : "<:no:1314114886598660147>",
        }
      );

    if (awardedDate) {
      const date = new Date(awardedDate.awardedDate);
      embed.addFields({
        name: "Date beaten",
        value: `<t:${Math.floor(date.getTime() / 1000)}:F>`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
