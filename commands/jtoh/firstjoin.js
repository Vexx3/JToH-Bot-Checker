const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const {
  fetchRobloxId,
  fetchBadgeInfo,
  fetchAwardedDateForBadge,
  fetchRobloxAvatar,
} = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("firstjoin")
    .setDescription("Check the first join date of a user in JToH")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Roblox username")
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

    const robloxId = await fetchRobloxId(username);
    if (!robloxId) {
      return interaction.editReply(`User ${username} not found.`);
    }

    const avatarUrl = await fetchRobloxAvatar(robloxId);
    const badgeInfo = await fetchBadgeInfo();

    const firstJoinBadges = badgeInfo.filter(
      (badge) => badge.category === "First Join"
    );

    if (!firstJoinBadges?.length) {
      return interaction.editReply(`User ${username} has not played JToH yet.`);
    }

    const badgeIds = firstJoinBadges
      .flatMap((badge) => [badge.ktohBadgeId, badge.oldBadgeId, badge.badgeId])
      .filter(Boolean);
    const awardedDate = await fetchAwardedDateForBadge(robloxId, badgeIds);

    if (!awardedDate) {
      return interaction.editReply(`User ${username} has not played JToH yet.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`First Join Date of ${username}`)
      .setColor("#99AAb5")
      .setThumbnail(avatarUrl)
      .addFields({
        name: "Date",
        value: `<t:${Math.floor(
          new Date(awardedDate.awardedDate).getTime() / 1000
        )}:F>`,
      });

    await interaction.editReply({ embeds: [embed] });
  },
};
