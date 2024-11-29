const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    const serverCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0
    );

    const status = `Serving ${serverCount} servers and ${userCount} installed users`;

    client.user.setActivity({
      type: ActivityType.Custom,
      name: "custom",
      state: status,
    });
  },
};
