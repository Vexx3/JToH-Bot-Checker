const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    setInterval(() => {
      const randomStatus = [
        "Fetching JToH stats... Because your gameplay is a tragedy.",
        "Tracking your JToH progress... Spoiler: You’re not improving.",
        "Tracking your progress... Or the lack of it. Same thing.",
        "Looking for towers you haven’t beaten... Which, judging by your track record, is all of them.",
        "Fetching progress... Or, more accurately, the lack of it",
        "Looking for the hardest towers... Let’s just hope you ever make it past 'Easy'.",
      ];

      const status =
        randomStatus[Math.floor(Math.random() * randomStatus.length)];

      client.user.setActivity({
        type: ActivityType.Custom,
        name: "custom",
        state: status,
      });
    }, 90000);
  },
};
