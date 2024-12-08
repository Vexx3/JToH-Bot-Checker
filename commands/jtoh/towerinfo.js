const {
  SlashCommandBuilder,
  EmbedBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const { fetch } = require("undici");
const cheerio = require("cheerio");
const { difficultyColors } = require("../../models/utils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("towerinfo")
    .setDescription("Get information about a specific JToH Tower.")
    .addStringOption((option) =>
      option
        .setName("tower")
        .setDescription(
          "The name/acronym of the tower you want information about."
        )
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
    const towerName = interaction.options.getString("tower");
    const formattedTowerName = towerName.replace(/ /g, "_");
    const url = `https://jtoh.fandom.com/wiki/${formattedTowerName}`;

    await interaction.deferReply();

    try {
      const response = await fetch(url);
      const data = await response.text();
      const $ = cheerio.load(data);

      const towerTitle = extractTowerTitle($);
      const difficulty = extractInfo($, "Difficulty");
      const length = extractInfo($, "Length");
      const creator = extractCreators($);
      const imageUrl = extractImage($);
      const description = extractDescription($);

      if (!length || !difficulty || !creator || !imageUrl || !description) {
        await interaction.editReply(
          "Could not retrieve tower information. Please check the tower name and try again."
        );
        return;
      }

      const difficultyMatch = description.match(
        /\b(is a|is an) (\w+) difficulty\b/i
      );
      const difficultyLevel = difficultyMatch
        ? difficultyMatch[2].toLowerCase()
        : "nil";

      const embedColor =
        difficultyColors[difficultyLevel] || difficultyColors.nil;

      const towerEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(towerTitle)
        .setImage(imageUrl)
        .addFields(
          { name: "Length", value: length },
          { name: "Difficulty", value: difficulty },
          { name: "Creator(s)", value: creator },
          {
            name: "Description",
            value:
              description.length > 1024
                ? `${description.slice(0, 1021)}...`
                : description,
          }
        );

      await interaction.editReply({ embeds: [towerEmbed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "There was an error fetching the tower information. Please try again later."
      );
    }
  },
};

function extractTowerTitle($) {
  return (
    $("h2.pi-item.pi-item-spacing.pi-title.pi-secondary-background")
      .first()
      .text()
      .trim() || null
  );
}

function extractInfo($, label) {
  const infoElements = $(
    `h3.pi-data-label.pi-secondary-font:contains('${label}')`
  ).next("div.pi-data-value.pi-font");

  return infoElements.length
    ? infoElements
        .html()
        .replace(/<sup[^>]*>.*?<\/sup>/g, "")
        .replace(/<.*?>/g, "")
        .replace(/\s+/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\[.*?\]/g, "")
        .trim()
    : null;
}

function extractCreators($) {
  const creators = $(
    "h3.pi-data-label.pi-secondary-font:contains('Creator(s)')"
  )
    .next("div.pi-data-value.pi-font")
    .find("b")
    .map((_, el) => $(el).text().trim())
    .get();

  return creators.length ? creators.join(", ") : null;
}

function extractImage($) {
  const imgSrc = $("figure.pi-item.pi-image img").attr("src");
  return imgSrc ? imgSrc.trim() : null;
}

function extractDescription($) {
  const paragraphs = $(".mw-parser-output p");

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = $(paragraphs[i]);

    if (paragraph.find("strong.mw-selflink.selflink").length > 0) {
      let description = paragraph.html();

      description = description
        .replace(/<strong[^>]*>|<b[^>]*>|<a [^>]*>/g, "")
        .replace(/<\/strong>|<\/b>|<\/a>/g, "")
        .replace(/<sup[^>]*>.*?<\/sup>/g, "")
        .replace(/<.*?>/g, "")
        .replace(/\[.*?\]/g, "");

      description = description.replace(/\s{2,}/g, " ").trim();

      return description || null;
    }
  }

  return null;
}
