import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const bigquery = new BigQuery();
const storage = new Storage();

const datasetId = 'user_data';
const storageBucket = 'my-common-bucket';

const corsOptions = {
  origin: ["http://localhost:5173"],
};
app.use(cors(corsOptions));

function generateTableId(email) {
  return `${email.replace(/[@.]/g, '_')}`.toLowerCase();
}

async function uploadInChunks(datasetId, tableId, rows, chunkSize = 1000) {
  const table = bigquery.dataset(datasetId).table(tableId);
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    try {
      await table.insert(chunk);
      console.log(`Inserted rows ${i} to ${i + chunk.length}`);
    } catch (error) {
      console.error(`Error inserting chunk ${i} to ${i + chunk.length}:`, error);
    }
  }
}

const schema = [
  { name: 'ts', type: 'TIMESTAMP' },
  { name: 'username', type: 'STRING' },
  { name: 'platform', type: 'STRING' },
  { name: 'ms_played', type: 'INTEGER' },
  { name: 'conn_country', type: 'STRING' },
  { name: 'ip_addr_decrypted', type: 'STRING' },
  { name: 'user_agent_decrypted', type: 'STRING' },
  { name: 'master_metadata_track_name', type: 'STRING' },
  { name: 'master_metadata_album_artist_name', type: 'STRING' },
  { name: 'master_metadata_album_album_name', type: 'STRING' },
  { name: 'spotify_track_uri', type: 'STRING' },
  { name: 'episode_name', type: 'STRING' },
  { name: 'episode_show_name', type: 'STRING' },
  { name: 'spotify_episode_uri', type: 'STRING' },
  { name: 'reason_start', type: 'STRING' },
  { name: 'reason_end', type: 'STRING' },
  { name: 'shuffle', type: 'BOOLEAN' },
  { name: 'skipped', type: 'BOOLEAN' },
  { name: 'offline', type: 'BOOLEAN' },
  { name: 'offline_timestamp', type: 'TIMESTAMP' },
  { name: 'incognito_mode', type: 'BOOLEAN' },
];

async function storeInsights(userId, insights) {
  const filename = `${generateTableId(userId)}_insights.json`;
  const bucket = storage.bucket(storageBucket);
  const file = bucket.file(filename);
  await file.save(JSON.stringify(insights), {
    contentType: 'application/json',
    metadata: {
      cacheControl: 'private, max-age=0',
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

app.post('/start-session', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).send('User email is required.');
  }
  const tableId = generateTableId(email);
  try {
    const [tableExists] = await bigquery.dataset(datasetId).table(tableId).exists();
    if (tableExists) {     
      await bigquery.dataset(datasetId).table(tableId).delete();
      console.log(`Existing table ${tableId} deleted.`);
      await bigquery.dataset(datasetId).createTable(tableId, { schema });
      console.log(`New table ${tableId} created.`);
      res.status(200).send({ message: 'Session started with new table', tableId });
    } else {
      await bigquery.dataset(datasetId).createTable(tableId, { schema });
      console.log(`Table ${tableId} created.`);
      res.status(200).send({ message: 'Session started with new table', tableId });
    }
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).send('Error starting session.');
  }
});

app.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    const tableId = req.query.tableId;
    if (!tableId) {
      return res.status(400).send('Table ID is required.');
    }
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }
    let allRows = [];
    for (const file of files) {
      try {
        const rawData = JSON.parse(file.buffer.toString());
        const rows = Array.isArray(rawData) ? rawData : [rawData];
        const formattedRows = rows.map((row) => ({
          ts: row.ts || null,
          username: row.username || '',
          platform: row.platform || '',
          ms_played: row.ms_played || 0,
          conn_country: row.conn_country || '',
          ip_addr_decrypted: row.ip_addr_decrypted || '',
          user_agent_decrypted: row.user_agent_decrypted || '',
          master_metadata_track_name: row.master_metadata_track_name || '',
          master_metadata_album_artist_name: row.master_metadata_album_artist_name || '',
          master_metadata_album_album_name: row.master_metadata_album_album_name || '',
          spotify_track_uri: row.spotify_track_uri || '',
          episode_name: row.episode_name || '',
          episode_show_name: row.episode_show_name || '',
          spotify_episode_uri: row.spotify_episode_uri || '',
          reason_start: row.reason_start || '',
          reason_end: row.reason_end || '',
          shuffle: row.shuffle === "TRUE",
          skipped: row.skipped === "TRUE",
          offline: row.offline === "TRUE",
          offline_timestamp: row.offline_timestamp ? new Date(row.offline_timestamp).toISOString() : null,
          incognito_mode: row.incognito_mode === "TRUE",
        }));
        allRows = allRows.concat(formattedRows);
      } catch (jsonError) {
        console.error('Invalid JSON format:', jsonError);
        return res.status(400).send('Invalid JSON file format.');
      }
    }
    await uploadInChunks(datasetId, tableId, allRows);
    res.status(200).send({ message: 'Files uploaded and data inserted successfully!' });
  } catch (error) {
    console.error('Error during upload or BigQuery operation:', error);
    res.status(500).send('Error during upload or data processing.');
  }
});

app.post('/finish-session', async (req, res) => {
  const tableId = req.query.tableId;
  if (!tableId) {
    return res.status(400).send('Table ID is required.');
  }
  try {
    // Top Artists by Play Count
    const topArtistsByPlayCountQuery = `
      SELECT master_metadata_album_artist_name AS artist, 
             COUNT(*) AS total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_artist_name
      ORDER BY total_plays DESC
      LIMIT 100;
    `;

    // Top Albums by Play Count
    const topAlbumsByPlayCountQuery = `
      SELECT master_metadata_album_album_name AS album,
             COUNT(*) as total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_album_name
      ORDER BY total_plays DESC
      LIMIT 100;
    `;

    // Top Tracks by Play Count
    const topTracksByPlayCountQuery = `
      SELECT master_metadata_track_name AS track,
             COUNT(*) as total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_track_name
      ORDER BY total_plays DESC
      LIMIT 100;
    `;

    // Top Artists by Minutes Played
    const topArtistsByMinutesPlayedQuery = `
      SELECT master_metadata_album_artist_name AS artist,
             SUM(ms_played) / 60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_artist_name
      ORDER BY minutes_played DESC
      LIMIT 100;
    `;

    // Top Albums by Minutes Played
    const topAlbumsByMinutesPlayedQuery = `
      SELECT master_metadata_album_album_name AS album,
             SUM(ms_played) / 60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_album_name
      ORDER BY minutes_played DESC
      LIMIT 100;
    `;

    // Top Tracks by Minutes Played
    const topTracksByMinutesPlayedQuery = `
      SELECT master_metadata_track_name AS track,
             SUM(ms_played) / 60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_track_name
      ORDER BY minutes_played DESC
      LIMIT 100;
    `;

    // Top Artists by Year
    const topArtistsByYearQuery = `
      SELECT master_metadata_album_artist_name AS artist, 
             EXTRACT(YEAR FROM ts) AS year,
             COUNT(*) AS total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY artist, year
      ORDER BY total_plays DESC
      LIMIT 50;
    `;

    // Top Artists by Year and Minutes Played
    const topArtistsByYearAndMinutesPlayedQuery = `
      SELECT master_metadata_album_artist_name AS artist, 
             EXTRACT(YEAR FROM ts) AS year,
             SUM(ms_played)/60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY artist, year
      ORDER BY minutes_played DESC
      LIMIT 50;
    `;

    // Top Tracks by Year, Month, and Play Count
    const topTracksByYearMonthPlayCountQuery = `
      SELECT master_metadata_track_name AS track, 
             EXTRACT(YEAR FROM ts) AS year,
             EXTRACT(MONTH FROM ts) AS month,
             COUNT(*) AS total_plays
      FROM \`${datasetId}.${tableId}\`
      GROUP BY track, year, month
      ORDER BY total_plays DESC
      LIMIT 50;
    `;

    // Top Tracks by Year, Month, and Minutes Played
    const topTracksByYearMonthMinutesPlayedQuery = `
      SELECT master_metadata_track_name AS track, 
             EXTRACT(YEAR FROM ts) AS year,
             EXTRACT(MONTH FROM ts) AS month,
             SUM(ms_played)/60000 AS minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY track, year, month
      ORDER BY minutes_played DESC
      LIMIT 50;
    `;

    // Listening Time by Day of Week
    const listeningTimeByDayOfWeekQuery = `
      SELECT EXTRACT(DAYOFWEEK FROM ts) AS day_of_week, 
             SUM(ms_played)/60000 as minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY day_of_week
      ORDER BY minutes_played DESC;
    `;

    // Listening Time by Hour of Day
    const listeningTimeByHourOfDayQuery = `
      SELECT EXTRACT(HOUR FROM ts) AS hour_of_day, 
             SUM(ms_played)/60000 as minutes_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY hour_of_day
      ORDER BY minutes_played DESC;
    `;

    // Execute all queries
    const [topArtistsByPlayCount] = await bigquery.query(topArtistsByPlayCountQuery);
    const [topAlbumsByPlayCount] = await bigquery.query(topAlbumsByPlayCountQuery);
    const [topTracksByPlayCount] = await bigquery.query(topTracksByPlayCountQuery);
    const [topArtistsByMinutesPlayed] = await bigquery.query(topArtistsByMinutesPlayedQuery);
    const [topAlbumsByMinutesPlayed] = await bigquery.query(topAlbumsByMinutesPlayedQuery);
    const [topTracksByMinutesPlayed] = await bigquery.query(topTracksByMinutesPlayedQuery);
    const [topArtistsByYear] = await bigquery.query(topArtistsByYearQuery);
    const [topArtistsByYearAndMinutesPlayed] = await bigquery.query(topArtistsByYearAndMinutesPlayedQuery);
    const [topTracksByYearMonthPlayCount] = await bigquery.query(topTracksByYearMonthPlayCountQuery);
    const [topTracksByYearMonthMinutesPlayed] = await bigquery.query(topTracksByYearMonthMinutesPlayedQuery);
    const [listeningTimeByDayOfWeek] = await bigquery.query(listeningTimeByDayOfWeekQuery);
    const [listeningTimeByHourOfDay] = await bigquery.query(listeningTimeByHourOfDayQuery);

    const insights = {
      topArtistsByPlayCount,
      topAlbumsByPlayCount,
      topTracksByPlayCount,
      topArtistsByMinutesPlayed,
      topAlbumsByMinutesPlayed,
      topTracksByMinutesPlayed,
      topArtistsByYear,
      topArtistsByYearAndMinutesPlayed,
      topTracksByYearMonthPlayCount,
      topTracksByYearMonthMinutesPlayed,
      listeningTimeByDayOfWeek,
      listeningTimeByHourOfDay
    };

    await storeInsights(tableId, insights);
    await bigquery.dataset(datasetId).table(tableId).delete();
    console.log(`Table ${tableId} deleted.`);

    res.status(200).send({
      message: 'Session finished successfully!',
      insights: insights
    });
  } catch (error) {
    console.error('Error finishing session:', error);
    res.status(500).send('Error finishing session.');
  }
});

app.get('/get-insights/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const insights = await getInsights(userId);
    if (insights) {
      res.status(200).json(insights);
    } else {
      res.status(404).json({ message: 'No insights found for this user' });
    }
  } catch (error) {
    console.error('Error retrieving insights:', error);
    res.status(500).json({ error: 'Error retrieving insights' });
  }
});

app.listen(8080, () => {
  console.log("Server started on port 8080");
});