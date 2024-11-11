import React from 'react';
import { useLocation } from 'react-router-dom';

interface InsightsData {
  basicInsights: {
    total_records: number;
    unique_users: number;
    avg_play_time: number;
    first_play: string;
    last_play: string;
  };
  topTracks: Array<{
    master_metadata_track_name: string;
    master_metadata_album_artist_name: string;  
    play_count: number;
    total_ms_played: number;
  }>;
  topArtists: Array<{
    master_metadata_album_artist_name: string;
    track_count: number;
    total_ms_played: number;
  }>;
  timeDistribution: Array<{
    hour_of_day: number;
    day_of_week: number;
    play_count: number;
    total_ms_played: number;
  }>;
  seasonalTopTracks: Array<{
    season: string;
    master_metadata_track_name: string;
    master_metadata_album_artist_name: string;
    play_count: number;
  }>;
  platformUsage: Array<{
    platform: string;
    use_count: number;
    total_ms_played: number;
  }>;
}

const InsightsPage: React.FC = () => {
  const location = useLocation();
  const insights: InsightsData = location.state?.insights;

  if (!insights) {
    return <div>No insights data available. Please upload your data first.</div>;
  }

  return (
    <div>
      <h1>Your Music Insights</h1>

      <h2>Basic Insights</h2>
      <table>
        <tbody>
          <tr>
            <td>Total Records</td>
            <td>{insights.basicInsights.total_records}</td>
          </tr>
          <tr>
            <td>Unique Users</td>
            <td>{insights.basicInsights.unique_users}</td>
          </tr>
          <tr>
            <td>Average Play Time</td>
            <td>{(insights.basicInsights.avg_play_time / 1000).toFixed(2)} seconds</td>
          </tr>
          <tr>
            <td>First Play</td>
            <td>{new Date(insights.basicInsights.first_play).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Last Play</td>
            <td>{new Date(insights.basicInsights.last_play).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <h2>Top Tracks</h2>
      <table>
        <thead>
          <tr>
            <th>Track Name</th>
            <th>Artist</th>
            <th>Play Count</th>
            <th>Total Time Played</th>
          </tr>
        </thead>
        <tbody>
          {insights.topTracks.slice(0, 10).map((track, index) => (
            <tr key={index}>
              <td>{track.master_metadata_track_name}</td>
              <td>{track.master_metadata_album_artist_name}</td>
              <td>{track.play_count}</td>
              <td>{(track.total_ms_played / 60000).toFixed(2)} minutes</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Top Artists</h2>
      <table>
        <thead>
          <tr>
            <th>Artist</th>
            <th>Track Count</th>
            <th>Total Time Played</th>
          </tr>
        </thead>
        <tbody>
          {insights.topArtists.slice(0, 10).map((artist, index) => (
            <tr key={index}>
              <td>{artist.master_metadata_album_artist_name}</td>
              <td>{artist.track_count}</td>
              <td>{(artist.total_ms_played / 3600000).toFixed(2)} hours</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Platform Usage</h2>
      <table>
        <thead>
          <tr>
            <th>Platform</th>
            <th>Use Count</th>
            <th>Total Time Used</th>
          </tr>
        </thead>
        <tbody>
          {insights.platformUsage.map((platform, index) => (
            <tr key={index}>
              <td>{platform.platform}</td>
              <td>{platform.use_count}</td>
              <td>{(platform.total_ms_played / 3600000).toFixed(2)} hours</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InsightsPage;