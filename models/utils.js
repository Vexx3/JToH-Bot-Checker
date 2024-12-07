const { request } = require("undici");
const redisClient = require("./redis");
require("dotenv").config();

const difficultyOrder = [
  "epic",
  "korn",
  "easy",
  "medium",
  "hard",
  "difficult",
  "challenging",
  "intense",
  "remorseless",
  "insane",
  "extreme",
  "terrifying",
  "catastrophic",
  "horrific",
  "unreal",
  "nil",
  "gingerbread",
];

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
  gingerbread: "<:gingerbread:1309374694721323028>",
  korn: "<:korn:1309374994110742608>",
  nil: "<:nil:1309384772878995467>",
  epic: "<:epic:1309384795318648923>",
};

const RATE_LIMIT_DELAY = 5000;
const MAX_RETRIES = 5;

async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES) {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const response = await request(url, options);
      if (response.statusCode === 200) {
        return response;
      } else if (response.statusCode === 429) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      } else {
        console.error(
          `Unexpected error (Attempt ${attempts + 1}): ${response.statusCode}`
        );
      }
    } catch (error) {
      console.error(
        `Request failed (Attempt ${attempts + 1}): ${error.message}`
      );
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
  }
  throw new Error("Failed to fetch data after multiple attempts.");
}

async function fetchRobloxAvatar(robloxId) {
  const url = "https://thumbnails.roproxy.com/v1/users/avatar-bust";
  const options = {
    method: "GET",
    query: {
      userIds: robloxId,
      size: "60x60",
      format: "Png",
      isCircular: false,
    },
  };

  const avatarUrl =
    "https://static.wikia.nocookie.net/roblox/images/a/a4/Image666.png";
  const response = await fetchWithRetry(url, options);

  if (response) {
    const avatarData = await response.body.json();
    if (avatarData.data && avatarData.data.length > 0) {
      return avatarData.data[0].imageUrl || avatarUrl;
    }
  }

  return avatarUrl;
}

async function fetchRobloxId(username) {
  const url = "https://users.roproxy.com/v1/usernames/users";
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username] }),
  };

  const response = await fetchWithRetry(url, options);
  const data = await response.body.json();
  return data.data?.[0] ? data.data[0].id : null;
}

async function fetchRobloxUserInfo(robloxId) {
  try {
    const url = `https://users.roproxy.com/v1/users/${robloxId}`;
    const response = await fetchWithRetry(url, { method: "GET" });

    if (response) {
      const userData = await response.body.json();
      return {
        id: userData.id,
        name: userData.name,
        displayName: userData.displayName,
        created: userData.created,
        description: userData.description || "No description",
      };
    }
  } catch (error) {
    console.error("Error in fetchRobloxUserInfo:", error);
    throw error;
  }
}

async function fetchAwardedDateForBadge(userId, badgeIds) {
  for (const badgeId of badgeIds) {
    try {
      const url = `https://badges.roproxy.com/v1/users/${userId}/badges/${badgeId}/awarded-date`;
      const response = await fetchWithRetry(url, { method: "GET" });

      if (response) {
        const data = await response.body.json();
        if (data.awardedDate) {
          return data;
        }
      }
    } catch (error) {
      console.error(
        `Error in fetchAwardedDateForBadge for badge ${badgeId}:`,
        error
      );
    }
  }
  return null;
}

async function fetchAwardedDates(userId) {
  const cacheKey = `awardedDates_${userId}`;
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const jtohBadges = await fetchBadgeInfo();
  const beatingTowerBadges = jtohBadges.filter(
    (badge) => badge.category === "Beating Tower"
  );
  const badgeIds = beatingTowerBadges
    .flatMap((badge) => [badge.ktohBadgeId, badge.oldBadgeId, badge.badgeId])
    .filter(Boolean);
  const batches = chunkArray(badgeIds, 100);

  const fetchBatchData = async (batch) => {
    const url = `https://badges.roproxy.com/v1/users/${userId}/badges/awarded-dates`;
    const options = { method: "GET", query: { badgeIds: batch.join(",") } };
    const response = await fetchWithRetry(url, options);
    return response ? await response.body.json().data : [];
  };

  const allAwardedDates = [];
  for (const batch of batches) {
    const batchData = await fetchBatchData(batch);
    allAwardedDates.push(...(batchData || []));
  }

  const towerDifficultyData = await fetchTowerDifficultyData();

  const uniqueBadges = new Set();
  const filteredBadges = allAwardedDates
    .map((awarded) => {
      const matchedJToHBadge = jtohBadges.find(
        (jtohBadge) =>
          jtohBadge.ktohBadgeId === awarded.badgeId ||
          jtohBadge.oldBadgeId === awarded.badgeId ||
          jtohBadge.badgeId === awarded.badgeId
      );

      if (matchedJToHBadge) {
        const towerData = towerDifficultyData.find(
          (tower) => tower.acronym === matchedJToHBadge.acronym
        );

        if (towerData && towerData.locationType !== "event") {
          const badgeKey = matchedJToHBadge.acronym;
          if (!uniqueBadges.has(badgeKey)) {
            uniqueBadges.add(badgeKey);
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
      }

      return null;
    })
    .filter(Boolean);

  await redisClient.set(cacheKey, JSON.stringify(filteredBadges), "EX", 600);

  return filteredBadges;
}

async function fetchBadgeInfo() {
  const spreadsheetId = "1Lfd3n0zd5QuVvc3bVRYs_OnTL6loxtaizJNUGmP1AfQ";
  const range = "Info!A2:G";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${process.env.GOOGLE_API}`;

  try {
    const response = await request(url);
    const rows = await response.body.json();
    if (rows.values?.length) {
      return rows.values.map((row) => ({
        badgeId: Number(row[0].replace(/"/g, "")),
        oldBadgeId: Number(row[1]),
        ktohBadgeId: Number(row[2]),
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
    if (rows.values?.length) {
      return rows.values.map((row) => ({
        name: row[0],
        acronym: row[1],
        numDifficulty: parseFloat(row[2]),
        location: row[5],
        difficultyName: row[4],
        locationType: row[6]?.toLowerCase(),
        areaCode: row[7],
        accessible: row[10],
        towerType: row[8],
        creators: row[13],
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
    if (rows.values?.length) {
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

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

module.exports = {
  difficultyOrder,
  difficultyColors,
  difficultyEmojis,
  fetchRobloxUserInfo,
  fetchRobloxId,
  fetchRobloxAvatar,
  fetchAwardedDates,
  fetchBadgeInfo,
  fetchTowerDifficultyData,
  fetchAreaData,
  fetchAwardedDateForBadge,
};
