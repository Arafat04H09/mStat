require("dotenv").config({ path: "../.env" });
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const axios = require("axios");
const { BigQuery } = require("@google-cloud/bigquery");
const { Storage } = require("@google-cloud/storage");
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const bigquery = new BigQuery();
const storage = new Storage();
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

const datasetId = "user_data";
const storageBucket = "my-common-bucket";

const corsOptions = {
  origin: ["http://localhost:5173"],
};
app.use(cors(corsOptions));

let lastTokenFetchTime = null;
let accessToken = null;

async function updateAccessToken() {
  if (accessToken) return;

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      null,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        params: {
          grant_type: "client_credentials",
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        },
      }
    );

    accessToken = response.data.access_token;
    spotifyApi.setAccessToken(accessToken);
    lastTokenFetchTime = Date.now();
    console.log("Access token updated successfully.");
  } catch (error) {
    console.error("Error updating access token:", error);
  }
}

function generateTableId(email) {
  return `${email.replace(/[@.]/g, "_")}`.toLowerCase();
}

async function ensureTableExists(datasetId, tableId) {
  const [exists] = await bigquery.dataset(datasetId).table(tableId).exists();
  if (!exists) {
    await bigquery.dataset(datasetId).createTable(tableId, { schema });
    console.log(`Table ${tableId} created.`);
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function uploadInChunks(datasetId, tableId, rows, chunkSize = 1000) {
  await ensureTableExists(datasetId, tableId);
  const table = bigquery.dataset(datasetId).table(tableId);
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        await table.insert(chunk);
        console.log(`Inserted rows ${i} to ${i + chunk.length}`);
        break;
      } catch (error) {
        console.error(
          `Error inserting chunk ${i} to ${i + chunk.length}:`,
          error
        );
        if (error.errors) {
          console.error(
            "Detailed errors:",
            JSON.stringify(error.errors, null, 2)
          );
        }
        retries++;
        if (retries >= MAX_RETRIES) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
}

async function fetchAllData(trackUris, albumNamesSet, artistNamesSet) {
  console.log("FETCHING ALL DATA");

  if (
    lastTokenFetchTime === null ||
    Date.now() - lastTokenFetchTime > 50 * 60 * 1000
  ) {
    console.log("Refreshing access token...");
    await updateAccessToken();
  }

  const trackChunkSize = 50;
  const albumChunkSize = 20;
  const artistChunkSize = 50;

  const allData = {
    tracks: [],
    albums: [],
    artists: [],
  };

  const albumUrisSet = new Set();
  const artistUrisSet = new Set();

  for (let i = 0; i < trackUris.length; i += trackChunkSize) {
    const chunk = trackUris.slice(i, i + trackChunkSize);

    try {
      const trackData = await spotifyApi.getTracks(chunk);

      if (trackData.body.tracks) {
        trackData.body.tracks.forEach((track) => {
          allData.tracks.push(track);

          if (
            track.album &&
            track.album.name &&
            albumNamesSet.has(track.album.name)
          ) {
            const albumId = track.album.uri.split(":")[2];
            albumUrisSet.add(albumId); 
          }

          if (track.artists && Array.isArray(track.artists)) {
            track.artists.forEach((artist) => {
              if (artist.name && artistNamesSet.has(artist.name)) {
                const artistId = artist.uri.split(":")[2];
                artistUrisSet.add(artistId); 
              }
            });
          }
        });
      }
    } catch (error) {
      console.error("Error fetching track data:", error);
    }
  }

  const albumUrisToFetch = Array.from(albumUrisSet);
  for (let i = 0; i < albumUrisToFetch.length; i += albumChunkSize) {
    const chunk = albumUrisToFetch.slice(i, i + albumChunkSize);

    try {
      const albumData = await spotifyApi.getAlbums(chunk);

      if (albumData.body.albums) {
        albumData.body.albums.forEach((album) => {
          allData.albums.push(album);
        });
      }
    } catch (error) {
      console.error("Error fetching album data:", error);
    }
  }

  const artistUrisToFetch = Array.from(artistUrisSet);
  for (let i = 0; i < artistUrisToFetch.length; i += artistChunkSize) {
    const chunk = artistUrisToFetch.slice(i, i + artistChunkSize);

    try {
      const artistData = await spotifyApi.getArtists(chunk); 

      if (artistData.body.artists) {
        artistData.body.artists.forEach((artist) => {
          allData.artists.push(artist);
        });
      }
    } catch (error) {
      console.error("Error fetching artist data:", error);
    }
  }

  return allData;
}

const schema = [
  { name: "ts", type: "TIMESTAMP" },
  { name: "username", type: "STRING" },
  { name: "platform", type: "STRING" },
  { name: "ms_played", type: "INTEGER" },
  { name: "conn_country", type: "STRING" },
  { name: "ip_addr_decrypted", type: "STRING" },
  { name: "user_agent_decrypted", type: "STRING" },
  { name: "master_metadata_track_name", type: "STRING" },
  { name: "master_metadata_album_artist_name", type: "STRING" },
  { name: "master_metadata_album_album_name", type: "STRING" },
  { name: "spotify_track_uri", type: "STRING" },
  { name: "episode_name", type: "STRING" },
  { name: "episode_show_name", type: "STRING" },
  { name: "spotify_episode_uri", type: "STRING" },
  { name: "reason_start", type: "STRING" },
  { name: "reason_end", type: "STRING" },
  { name: "shuffle", type: "BOOLEAN" },
  { name: "skipped", type: "BOOLEAN" },
  { name: "offline", type: "BOOLEAN" },
  { name: "offline_timestamp", type: "TIMESTAMP" },
  { name: "incognito_mode", type: "BOOLEAN" },
];

async function storeInsights(userId, insights) {
  const filename = `${generateTableId(userId)}_insights.json`;
  const bucket = storage.bucket(storageBucket);
  const file = bucket.file(filename);
  await file.save(JSON.stringify(insights), {
    contentType: "application/json",
    metadata: {
      cacheControl: "private, max-age=0",
    },
  });
  console.log(`Insights for user ${userId} stored in ${filename}`);
}

async function getInsights(userId) {
  const filename = `${generateTableId(userId)}_insights.json`;
  const bucket = storage.bucket(storageBucket);
  const file = bucket.file(filename);
  const [exists] = await file.exists();
  if (!exists) {
    return null;
  }
  const [content] = await file.download();
  return JSON.parse(content.toString());
}

app.post("/upload", upload.array("files", 20), async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).send("User email is required.");
  }

  const tableId = generateTableId(email);

  try {
    await manageTable(tableId);

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    await uploadFilesToBigQuery(files, tableId);

    console.log("GENERATING INSIGHTS");
    const insights = await generateInsights(tableId);
    await storeInsights(email, insights);

    await bigquery.dataset(datasetId).table(tableId).delete();

    return res.status(200).send({
      message: "Session finished successfully!",
      insights,
    });
  } catch (error) {
    console.error("Error in /upload endpoint:", error);
    return res
      .status(500)
      .send("An error occurred while processing the request.");
  }
});

async function manageTable(tableId) {
  const [exists] = await bigquery.dataset(datasetId).table(tableId).exists();
  if (exists) {
    console.log(`Table ${tableId} exists. Deleting it...`);
    await bigquery.dataset(datasetId).table(tableId).delete();
  }

  console.log(`Creating table ${tableId}...`);
  await bigquery.dataset(datasetId).createTable(tableId, { schema });

  console.log(`Waiting for table ${tableId} to be ready...`);
  let [tableExists] = await bigquery.dataset(datasetId).table(tableId).exists();
  while (!tableExists) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    [tableExists] = await bigquery.dataset(datasetId).table(tableId).exists();
  }
  console.log(`Table ${tableId} is ready.`);
}

async function uploadFilesToBigQuery(files, tableId) {
  const allRows = [];

  for (const file of files) {
    try {
      const rawData = JSON.parse(file.buffer.toString());
      const rows = Array.isArray(rawData) ? rawData : [rawData];

      const formattedRows = rows.map((row) => ({
        ts: row.ts || null,
        username: row.username || "",
        platform: row.platform || "",
        ms_played: row.ms_played || 0,
        conn_country: row.conn_country || "",
        ip_addr_decrypted: row.ip_addr_decrypted || "",
        user_agent_decrypted: row.user_agent_decrypted || "",
        master_metadata_track_name: row.master_metadata_track_name || "",
        master_metadata_album_artist_name:
          row.master_metadata_album_artist_name || "",
        master_metadata_album_album_name:
          row.master_metadata_album_album_name || "",
        spotify_track_uri: row.spotify_track_uri || "",
        episode_name: row.episode_name || "",
        episode_show_name: row.episode_show_name || "",
        spotify_episode_uri: row.spotify_episode_uri || "",
        reason_start: row.reason_start || "",
        reason_end: row.reason_end || "",
        shuffle: row.shuffle === "TRUE",
        skipped: row.skipped === "TRUE",
        offline: row.offline === "TRUE",
        offline_timestamp: row.offline_timestamp
          ? new Date(row.offline_timestamp).toISOString()
          : null,
        incognito_mode: row.incognito_mode === "TRUE",
      }));

      allRows.push(...formattedRows);
    } catch (error) {
      console.error("Error parsing JSON file:", error);
      throw new Error("Invalid JSON format in uploaded files.");
    }
  }

  await uploadInChunks(datasetId, tableId, allRows);
}

async function generateInsights(tableId) {
  const queries = {
    topArtistsByPlayCount: `
      SELECT master_metadata_album_artist_name AS artist, 
      COUNT(*) AS total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_artist_name
      ORDER BY total_plays DESC
      LIMIT 100
    `,
    topAlbumsByPlayCountQuery: `
      SELECT master_metadata_album_album_name AS album,
             COUNT(*) as total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_album_name
      ORDER BY total_plays DESC
      LIMIT 20;
    `,
    topTracksByPlayCountQuery: `
      SELECT master_metadata_track_name AS track,
             COUNT(*) as total_plays,
             ARRAY_AGG(DISTINCT spotify_track_uri) AS track_uris
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_track_name
      ORDER BY total_plays DESC
      LIMIT 100;
    `,
    topArtistsByMinutesPlayedQuery: `
      SELECT master_metadata_album_artist_name AS artist,
             SUM(ms_played) / 60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_artist_name
      ORDER BY minutes_played DESC
      LIMIT 100;
    `,
    topAlbumsByMinutesPlayedQuery: `
      SELECT master_metadata_album_album_name AS album,
             SUM(ms_played) / 60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_album_name
      ORDER BY minutes_played DESC
      LIMIT 20;
    `,
    topTracksByMinutesPlayedQuery: `
      SELECT master_metadata_track_name AS track,
             SUM(ms_played) / 60000 AS minutes_played,
             ARRAY_AGG(DISTINCT spotify_track_uri) AS track_uris
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_track_name
      ORDER BY minutes_played DESC
      LIMIT 100;
    `,
    topArtistsByYearQuery: `
      SELECT master_metadata_album_artist_name AS artist, 
             EXTRACT(YEAR FROM ts) AS year,
             COUNT(*) AS total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY artist, year
      ORDER BY total_plays DESC
      LIMIT 50;
    `,
    topArtistsByYearAndMinutesPlayedQuery: `
      SELECT master_metadata_album_artist_name AS artist, 
             EXTRACT(YEAR FROM ts) AS year,
             SUM(ms_played)/60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY artist, year
      ORDER BY minutes_played DESC
      LIMIT 50;
    `,
    topTracksByYearMonthPlayCountQuery: `
      SELECT master_metadata_track_name AS track, 
             EXTRACT(YEAR FROM ts) AS year,
             EXTRACT(MONTH FROM ts) AS month,
             COUNT(*) AS total_plays,
             ARRAY_AGG(DISTINCT spotify_track_uri) AS track_uris
      FROM \`${datasetId}.${tableId}\`
      GROUP BY track, year, month
      ORDER BY total_plays DESC
      LIMIT 50;
    `,
    topTracksByYearMonthMinutesPlayedQuery: `
      SELECT master_metadata_track_name AS track, 
             EXTRACT(YEAR FROM ts) AS year,
             EXTRACT(MONTH FROM ts) AS month,
             SUM(ms_played)/60000 AS minutes_played,
             ARRAY_AGG(DISTINCT spotify_track_uri) AS track_uris
      FROM \`${datasetId}.${tableId}\`
      GROUP BY track, year, month
      ORDER BY minutes_played DESC
      LIMIT 50;
    `,
    listeningTimeByDayOfWeekQuery: `
      SELECT EXTRACT(DAYOFWEEK FROM ts) AS day_of_week, 
             SUM(ms_played)/60000 as minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY day_of_week
      ORDER BY minutes_played DESC;
    `,
    listeningTimeByHourOfDay: `
      SELECT EXTRACT(HOUR FROM ts) AS hour_of_day, SUM(ms_played) / 60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY hour_of_day
      ORDER BY minutes_played DESC
    `,
  };

  const trackUrisSet = new Set();
  const albumsUriSet = new Set();
  const artistsUriSet = new Set();

  const results = {};

  for (const [key, query] of Object.entries(queries)) {
    const [rows] = await bigquery.query(query);
    results[key] = rows;

    if (key.includes("Track")) {
      const trackUris = rows.flatMap((row) => row.track_uris || []);
      trackUris.forEach((uri) => {
        const id = uri.split(":")[2];
        if (id && id.length > 10) {
          trackUrisSet.add(id);
        }
      });
    }

    if (key.includes("Album")) {
      const albumNames = rows.flatMap((row) => row.album || []);
      albumNames.forEach((name) => albumsUriSet.add(name));
    }

    if (key.includes("Artist")) {
      const artistNames = rows.flatMap((row) => row.artist || []);
      artistNames.forEach((name) => artistsUriSet.add(name));
    }
  }
  console.log("FETCHING ALL SPOTIFY DATA");
  const allSpotifyData = await fetchAllData(
    Array.from(trackUrisSet),
    albumsUriSet,
    artistsUriSet
  );
  results.allSpotifyData = allSpotifyData;

  return results;
}

app.get("/get-insights/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const tableId = generateTableId(email);
    const insights = await getInsights(tableId);
    if (insights) {
      res.status(200).json(insights);
    } else {
      res.status(404).json({ message: "No insights found for this user" });
    }
  } catch (error) {
    console.error("Error retrieving insights:", error);
    res.status(500).json({ error: "Error retrieving insights" });
  }
});

app.listen(8080, () => {
  console.log("Server started on port 8080");
});
