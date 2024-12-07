const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Get information about the bot")
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
    const userCount = await interaction.client.application
      .fetch()
      .then((app) => app.approximateUserInstallCount);

    const embed = new EmbedBuilder()
      .setTitle(interaction.client.user.username)
      .setColor("#58b9ff")
      .setDescription(
        "A bot that provides various commands to interact with JToH game data, including checking tower completions, achievements, and more."
      )
      .addFields(
        {
          name: "Servers",
          value: interaction.client.guilds.cache.size.toString(),
          inline: true,
        },
        {
          name: "Installed Users",
          value: userCount.toString(),
          inline: true,
        },
        {
          name: "Commands",
          value: interaction.client.commands
            .map((cmd) => `\`${cmd.data.name}\``)
            .join(", "),
        },
        {
          name: "Developer",
          value: "_zylx",
          inline: true,
        },
        {
          name: "Contributor",
          value: "CRP Land for JToH datas.",
          inline: true,
        },
        {
          name: "Library",
          value: "[discord.js](https://discord.js.org/)",
          inline: true,
        }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Authorize TowerTracker")
        .setStyle(ButtonStyle.Link)
        .setURL(
          "https://discord.com/oauth2/authorize?client_id=1306467343433596948"
        ),
      new ButtonBuilder()
        .setLabel("Support Server")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/wdP6GZB6KE"),
      new ButtonBuilder()
        .setLabel("JToH Game")
        .setStyle(ButtonStyle.Link)
        .setURL("https://www.roblox.com/games/8562822414/")
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
