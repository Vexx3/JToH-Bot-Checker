const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require("discord.js");
const {
  difficultyOrder,
  difficultyColors,
  difficultyEmojis,
  fetchRobloxAvatar,
  fetchRobloxId,
  fetchJToHBadges,
  fetchAwardedDates,
} = require("../../models/utils");

module.exports = {
  cooldown: 20,
  data: new SlashCommandBuilder()
    .setName("hardesttowers")
    .setDescription("Check the hardest towers beaten by a user in JToH")
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

    try {
      const robloxId = await fetchRobloxId(username);

      if (!robloxId) {
        return interaction.editReply(`User ${username} not found.`);
      }

      const avatarUrl = await fetchRobloxAvatar(robloxId);
      const jtohBadges = await fetchJToHBadges(robloxId);
      const badgeIds = jtohBadges.map((badge) => badge.id);
      const awardedTowers = await fetchAwardedDates(robloxId, badgeIds);

      if (!awardedTowers?.length) {
        return interaction.editReply(
          `No JToH tower badges found for **${username}**.`
        );
      }

      awardedTowers.sort((a, b) => b.numDifficulty - a.numDifficulty);
      const top10HardestTowers = awardedTowers.slice(0, 10);

      const createEmbed = (towers) => {
        const hardestDifficulty = towers[0]?.difficultyName;
        const embedColor = difficultyColors[hardestDifficulty];

        return new EmbedBuilder()
          .setTitle("The top 10 hardest tower(s)")
          .setColor(embedColor)
          .setThumbnail(avatarUrl)
          .addFields(
            {
              name: "Player",
              value: username,
              inline: true,
            },
            {
              name: "The list of hardest towers",
              value: towers
                .map(
                  (tower) =>
                    `**[${difficultyEmojis[tower.difficultyName] || ""}]** ${
                      tower.acronym
                    } (${tower.numDifficulty}) - <t:${Math.floor(
                      new Date(tower.awardedDate).getTime() / 1000
                    )}:R>`
                )
                .join("\n"),
            }
          );
      };

      const embed = createEmbed(top10HardestTowers);

      const sortedDifficulties = [
        ...new Set(awardedTowers.map((t) => t.difficultyName)),
      ].sort(
        (a, b) =>
          difficultyOrder.indexOf(a.toLowerCase()) -
          difficultyOrder.indexOf(b.toLowerCase())
      );

      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("filter_difficulty")
          .setPlaceholder("Select a difficulty to filter")
          .addOptions([
            new StringSelectMenuOptionBuilder()
              .setLabel("Show All")
              .setValue("all")
              .setDescription("Reset to default")
              .setEmoji("🔄"),
            ...sortedDifficulties.map((difficulty) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(
                  difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                )
                .setValue(difficulty)
                .setDescription(`Show only ${difficulty} towers`)
                .setEmoji(difficultyEmojis[difficulty] || null)
            ),
          ])
      );

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [selectMenu],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "filter_difficulty") {
          const selectedDifficulty = i.values[0];

          if (selectedDifficulty === "all") {
            const defaultEmbed = createEmbed(top10HardestTowers);

            await i.update({ embeds: [defaultEmbed] });
          } else {
            const filteredTowers = awardedTowers
              .filter((tower) => tower.difficultyName === selectedDifficulty)
              .slice(0, 10);

            const filteredEmbed = createEmbed(filteredTowers);

            await i.update({ embeds: [filteredEmbed] });
          }
        }
      });

      collector.on("end", () => {
        selectMenu.components[0].setDisabled(true);
        interaction.editReply({ components: [selectMenu] });
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply(
        "An error occurred while executing this command."
      );
    }
  },
};
