const { request } = require("undici");
require("dotenv").config();

const difficultyColors = {
  easy: "#75F347",
  medium: "#FFFE00",
  hard: "#FD7C00",
  difficult: "#FF3232",
  challenging: "#A00000",
  intense: "#19232D",
  remorseless: "#C800C8",
  insane: "#0000FF",
  extreme: "#0389FF",
  terrifying: "#00FFFF",
  catastrophic: "#FFFFFF",
  horrific: "#9695FF",
  unreal: "#5100CB",
  nil: "#65666D",
};

const difficultyEmojis = {
  easy: "<:Easy:1307184531853541446>",
  medium: "<:Medium:1307184770651914251>",
  hard: "<:Hard:1307184941053771877>",
  difficult: "<:Difficult:1307191420179972146>",
  challenging: "<:Challenging:1307191454464217190>",
  intense: "<:Intense:1307191473816731648>",
  remorseless: "<:Remorseless:1307191493911642172>",
  insane: "<:Insane:1307191513381601320>",
  extreme: "<:Extreme:1307191532616683601>",
  terrifying: "<:Terrifying:1307191549829845062>",
  catastrophic: "<:Catastrophic:1307191569736269885>",
  horrific: "<:Horrific:1307191589189193728>",
  unreal: "<:Unreal:1307191608390848532>",
};

async function fetchRobloxAvatar(robloxId) {
  const avatarResponse = await request(
    `https://thumbnails.roblox.com/v1/users/avatar-bust`,
    {
      method: "GET",
      query: {
        userIds: robloxId,
        size: "150x150",
        format: "Png",
        isCircular: true,
      },
    }
  );

  const avatarUrl =
    "https://static.wikia.nocookie.net/roblox/images/a/a4/Image666.png";
  if (avatarResponse.statusCode === 200) {
    const avatarData = await avatarResponse.body.json();
    if (avatarData.data && avatarData.data.length > 0) {
      return avatarData.data[0].imageUrl || avatarUrl;
    }
  } else {
    console.error(
      `Failed to fetch avatar image: ${
        avatarResponse.statusCode
      } - ${await avatarResponse.body.text()}`
    );
  }

  return avatarUrl;
}

async function fetchRobloxId(username) {
  const response = await request(
    `https://users.roblox.com/v1/usernames/users`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username] }),
    }
  );
  const data = await response.body.json();
  return data.data && data.data[0] ? data.data[0].id : null;
}

async function fetchRobloxUserInfo(robloxId) {
  try {
    const userResponse = await request(
      `https://users.roblox.com/v1/users/${robloxId}`
    );

    if (userResponse.statusCode === 200) {
      const userData = await userResponse.body.json();
      return {
        id: userData.id,
        name: userData.name,
        displayName: userData.displayName,
        created: userData.created,
        description: userData.description || "No description",
      };
    } else {
      console.error(`Failed to fetch user info: ${userResponse.statusCode}`);
      throw new Error("Error fetching Roblox user information.");
    }
  } catch (error) {
    console.error("Error in fetchRobloxUserInfo:", error);
    throw error;
  }
}

async function fetchJToHBadges() {
  let allBadges = [];
  let nextCursor = null;
  const maxRetries = 3;

  do {
    let attempts = 0;
    let badgesData;

    while (attempts < maxRetries) {
      try {
        const badgesResponse = await request(
          `https://badges.roblox.com/v1/universes/3264581003/badges`,
          {
            method: "GET",
            query: { limit: 100, cursor: nextCursor, sortOrder: "Asc" },
          }
        );

        if (badgesResponse.statusCode !== 200) {
          console.error(
            `Error fetching JToH badges (Attempt ${attempts + 1}): ${
              badgesResponse.status
            }`
          );
        } else {
          badgesData = await badgesResponse.body.json();
          break;
        }
      } catch (error) {
        console.error(`Request failed (Attempt ${attempts + 1}): ${error}`);
      }

      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!badgesData) {
      throw new Error("Failed to fetch JToH badges after multiple attempts.");
    }

    allBadges = allBadges.concat(badgesData.data);
    nextCursor = badgesData.nextPageCursor;
  } while (nextCursor);

  return allBadges.map((badge) => ({
    id: badge.id,
    name: badge.name,
  }));
}

const RATE_LIMIT_DELAY = 15000;

async function fetchAwardedDates(userId, badgeIds) {
  const batches = chunkArray(badgeIds, 100);

  const fetchBatchData = async (batch) => {
    let attempts = 0;
    const maxRetries = 5;

    while (attempts < maxRetries) {
      try {
        const awardedDatesResponse = await request(
          `https://badges.roblox.com/v1/users/${userId}/badges/awarded-dates`,
          { method: "GET", query: { badgeIds: batch.join(",") } }
        );

        if (awardedDatesResponse.statusCode === 200) {
          const awardedDatesData = await awardedDatesResponse.body.json();
          return awardedDatesData.data;
        }

        if (awardedDatesResponse.statusCode === 429) {
          console.warn(
            `Rate-limited (Attempt ${attempts + 1}). Retrying after ${
              RATE_LIMIT_DELAY / 1000
            } seconds.`
          );
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        } else {
          console.error(
            `Unexpected error (Attempt ${attempts + 1}): ${
              awardedDatesResponse.statusCode
            }`
          );
        }
      } catch (error) {
        console.error(
          `Request failed (Attempt ${attempts + 1}): ${error.message}`
        );
      }

      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    throw new Error("Failed to fetch awarded dates after multiple attempts.");
  };

  const allAwardedDates = [];
  for (const batch of batches) {
    const batchData = await fetchBatchData(batch);
    allAwardedDates.push(...(batchData || []));
  }

  const jtohBadges = await fetchBadgeInfo();
  const towerDifficultyData = await fetchTowerDifficultyData();

  const filteredBadges = allAwardedDates
    .map((awarded) => {
      const matchedJToHBadge = jtohBadges.find(
        (jtohBadge) => jtohBadge.badgeId === awarded.badgeId
      );

      if (matchedJToHBadge && matchedJToHBadge.category === "Beating Tower") {
        const towerData = towerDifficultyData.find(
          (tower) => tower.acronym === matchedJToHBadge.acronym
        );

        if (
          towerData &&
          towerData.locationType !== "event" &&
          towerData.towerType !== "MiniTower"
        ) {
          return {
            name: matchedJToHBadge.name,
            id: awarded.badgeId,
            acronym: matchedJToHBadge.acronym,
            difficultyName: towerData.difficultyName,
            numDifficulty: towerData.numDifficulty,
            location: towerData.location,
            towerType: towerData.towerType,
            awardedDate: awarded.awardedDate,
          };
        }
      }
    })
    .filter(Boolean);

  return filteredBadges;
}

async function fetchBadgeInfo() {
  const spreadsheetId = "1Lfd3n0zd5QuVvc3bVRYs_OnTL6loxtaizJNUGmP1AfQ";
  const range = "Info!A2:G";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API}`;

  try {
    const response = await request(url);
    const rows = await response.body.json();
    if (rows.values && rows.values.length) {
      return rows.values.map((row) => ({
        badgeId: Number(row[0].replace(/"/g, "")),
        category: row[5],
        acronym: row[6],
      }));
    } else {
      console.log("No data found in Badge Info.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching badge info:", error);
    return [];
  }
}

async function fetchTowerDifficultyData() {
  const spreadsheetId = "1NOtmaKlU1mIyKGkOZ_5H3rPm1cTVazOvkkZBLPoxy1c";
  const range = "Info!A2:P";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API}`;

  try {
    const response = await request(url);
    const rows = await response.body.json();
    if (rows.values && rows.values.length) {
      return rows.values.map((row) => ({
        name: row[0],
        acronym: row[1],
        numDifficulty: parseFloat(row[2]),
        location: row[5],
        difficultyName: row[4],
        locationType: row[6]?.toLowerCase(),
        areaCode: row[7],
        towerType: row[8],
      }));
    } else {
      console.log("No data found in Tower Difficulty.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching tower difficulty data:", error);
    return [];
  }
}

async function fetchAreaData() {
  const spreadsheetId = "1BlQ7neuwgjaopCWFkYRHX7XKScVZuBrf7ydRbHebtvE";
  const range = "Info!A2:H";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API}`;

  try {
    const response = await request(url);
    const rows = await response.body.json();
    if (rows.values && rows.values.length) {
      return rows.values.map((row) => ({
        areaName: row[0],
        acronym: row[3],
      }));
    } else {
      console.log("No data found in Area Difficulty.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching area difficulty data:", error);
    return [];
  }
}

function getTowerAcronym(towerName) {
  const words = towerName.split(" ");
  const acronym = words.map((word) => word.charAt(0)).join("");
  return acronym;
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

module.exports = {
  difficultyColors,
  difficultyEmojis,
  fetchRobloxUserInfo,
  fetchRobloxId,
  fetchRobloxAvatar,
  fetchJToHBadges,
  fetchAwardedDates,
  fetchBadgeInfo,
  fetchTowerDifficultyData,
  fetchAreaData,
  getTowerAcronym,
};
