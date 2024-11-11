import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const bigquery = new BigQuery();

const datasetId = 'user_data';

const corsOptions = {
  origin: ["http://localhost:5173"],  
};
app.use(cors(corsOptions));

function generateTableId(email) {
  return `${email.replace(/[@.]/g, '_')}_temp_table`.toLowerCase();
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

app.post('/start-session', async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).send('User email is required.');
  }

  const tableId = generateTableId(email);

  try {
    const [tableExists] = await bigquery.dataset(datasetId).table(tableId).exists();
    if (!tableExists) {
      await bigquery.dataset(datasetId).createTable(tableId, { schema });
      console.log(`Table ${tableId} created.`);
    } else {
      console.log(`Table ${tableId} already exists.`);
    }

    res.status(200).send({ message: 'Session started', tableId });
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

    // Upload data in chunks
    await uploadInChunks(datasetId, tableId, allRows);

    res.status(200).send({ 
      message: 'Files uploaded and data inserted successfully!'
    });

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
    // Basic insights
    const basicInsightsQuery = `
      SELECT
        COUNT(*) AS total_records,
        COUNT(DISTINCT username) AS unique_users,
        AVG(ms_played) AS avg_play_time,
        MIN(ts) AS first_play,
        MAX(ts) AS last_play
      FROM \`${datasetId}.${tableId}\`
    `;

    // Top tracks
    const topTracksQuery = `
      SELECT
        master_metadata_track_name,
        master_metadata_album_artist_name,
        COUNT(*) as play_count,
        SUM(ms_played) as total_ms_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_track_name, master_metadata_album_artist_name
      ORDER BY play_count DESC
      LIMIT 10
    `;

    // Top artists
    const topArtistsQuery = `
      SELECT
        master_metadata_album_artist_name,
        COUNT(*) as track_count,
        SUM(ms_played) as total_ms_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY master_metadata_album_artist_name
      ORDER BY total_ms_played DESC
      LIMIT 10
    `;

    // Listening time distribution
    const timeDistributionQuery = `
      SELECT
        EXTRACT(HOUR FROM ts) as hour_of_day,
        EXTRACT(DAYOFWEEK FROM ts) as day_of_week,
        COUNT(*) as play_count,
        SUM(ms_played) as total_ms_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY hour_of_day, day_of_week
      ORDER BY day_of_week, hour_of_day
    `;

    // Seasonal top tracks
    const seasonalTopTracksQuery = `
      WITH seasons AS (
        SELECT *,
          CASE
            WHEN EXTRACT(MONTH FROM ts) IN (12, 1, 2) THEN 'Winter'
            WHEN EXTRACT(MONTH FROM ts) IN (3, 4, 5) THEN 'Spring'
            WHEN EXTRACT(MONTH FROM ts) IN (6, 7, 8) THEN 'Summer'
            ELSE 'Fall'
          END AS season
        FROM \`${datasetId}.${tableId}\`
      ),
      ranked_tracks AS (
        SELECT
          season,
          master_metadata_track_name,
          master_metadata_album_artist_name,
          COUNT(*) as play_count,
          ROW_NUMBER() OVER (PARTITION BY season ORDER BY COUNT(*) DESC) as rank
        FROM seasons
        GROUP BY season, master_metadata_track_name, master_metadata_album_artist_name
      )
      SELECT
        season,
        master_metadata_track_name,
        master_metadata_album_artist_name,
        play_count
      FROM ranked_tracks
      WHERE rank <= 5
      ORDER BY season, play_count DESC
    `;

    // Platform usage
    const platformUsageQuery = `
      SELECT
        platform,
        COUNT(*) as use_count,
        SUM(ms_played) as total_ms_played
      FROM \`${datasetId}.${tableId}\`
      GROUP BY platform
      ORDER BY use_count DESC
    `;

    // Execute all queries
    const [basicInsights] = await bigquery.query(basicInsightsQuery);
    const [topTracks] = await bigquery.query(topTracksQuery);
    const [topArtists] = await bigquery.query(topArtistsQuery);
    const [timeDistribution] = await bigquery.query(timeDistributionQuery);
    const [seasonalTopTracks] = await bigquery.query(seasonalTopTracksQuery);
    const [platformUsage] = await bigquery.query(platformUsageQuery);

    // Delete the table after getting insights
    await bigquery.dataset(datasetId).table(tableId).delete();
    console.log(`Table ${tableId} deleted.`);
    console.log(basicInsights);
    console.log(topTracks);
    console.log(topArtists);
    console.log(timeDistribution);
    console.log(seasonalTopTracks);
    console.log(platformUsage);

    res.status(200).send({ 
      message: 'Session finished successfully!',
      insights: {
        basicInsights: basicInsights[0],
        topTracks,
        topArtists,
        timeDistribution,
        seasonalTopTracks,
        platformUsage
      }
    });
  } catch (error) {
    console.error('Error finishing session:', error);
    res.status(500).send('Error finishing session.');
  }
});

app.listen(8080, () => {
  console.log("Server started on port 8080");
});