import React from 'react';
import { useLocation } from 'react-router-dom';

interface InsightsData {
  topArtistsByPlayCount: Array<{
    artist: string;
    total_plays: number;
  }>;
  topAlbumsByPlayCount: Array<{
    album: string;
    total_plays: number;
  }>;
  topTracksByPlayCount: Array<{
    track: string;
    total_plays: number;
  }>;
  topArtistsByMinutesPlayed: Array<{
    artist: string;
    minutes_played: number;
  }>;
  topAlbumsByMinutesPlayed: Array<{
    album: string;
    minutes_played: number;
  }>;
  topTracksByMinutesPlayed: Array<{
    track: string;
    minutes_played: number;
  }>;
  topArtistsByYear: Array<{
    artist: string;
    year: number;
    total_plays: number;
  }>;
  topArtistsByYearAndMinutesPlayed: Array<{
    artist: string;
    year: number;
    minutes_played: number;
  }>;
  topTracksByYearMonthPlayCount: Array<{
    track: string;
    year: number;
    month: number;
    total_plays: number;
  }>;
  topTracksByYearMonthMinutesPlayed: Array<{
    track: string;
    year: number;
    month: number;
    minutes_played: number;
  }>;
  listeningTimeByDayOfWeek: Array<{
    day_of_week: number;
    minutes_played: number;
  }>;
  listeningTimeByHourOfDay: Array<{
    hour_of_day: number;
    minutes_played: number;
  }>;
}

const InsightsPage: React.FC = () => {
  const location = useLocation();
  const insights: InsightsData = location.state?.insights;

  if (!insights) {
    return <div>No insights data available. Please upload your data first.</div>;
  }

  const renderTable = (data: any[], columns: string[], title: string) => (
    <div>
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((item, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col}>{item[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <h1>Your Music Insights</h1>

      {renderTable(insights.topArtistsByPlayCount, ['artist', 'total_plays'], 'Top Artists by Play Count')}
      {renderTable(insights.topAlbumsByPlayCount, ['album', 'total_plays'], 'Top Albums by Play Count')}
      {renderTable(insights.topTracksByPlayCount, ['track', 'total_plays'], 'Top Tracks by Play Count')}
      {renderTable(insights.topArtistsByMinutesPlayed, ['artist', 'minutes_played'], 'Top Artists by Minutes Played')}
      {renderTable(insights.topAlbumsByMinutesPlayed, ['album', 'minutes_played'], 'Top Albums by Minutes Played')}
      {renderTable(insights.topTracksByMinutesPlayed, ['track', 'minutes_played'], 'Top Tracks by Minutes Played')}
      {renderTable(insights.topArtistsByYear, ['artist', 'year', 'total_plays'], 'Top Artists by Year')}
      {renderTable(insights.topArtistsByYearAndMinutesPlayed, ['artist', 'year', 'minutes_played'], 'Top Artists by Year and Minutes Played')}
      {renderTable(insights.topTracksByYearMonthPlayCount, ['track', 'year', 'month', 'total_plays'], 'Top Tracks by Year, Month, and Play Count')}
      {renderTable(insights.topTracksByYearMonthMinutesPlayed, ['track', 'year', 'month', 'minutes_played'], 'Top Tracks by Year, Month, and Minutes Played')}

      <section>
        <h2>Listening Time by Day of Week</h2>
        {insights.listeningTimeByDayOfWeek.map((day) => (
          <p key={day.day_of_week}>
            Day {day.day_of_week}: {day.minutes_played.toFixed(2)} minutes
          </p>
        ))}
      </section>

      <section>
        <h2>Listening Time by Hour of Day</h2>
        {insights.listeningTimeByHourOfDay.map((hour) => (
          <p key={hour.hour_of_day}>
            Hour {hour.hour_of_day}: {hour.minutes_played.toFixed(2)} minutes
          </p>
        ))}
      </section>
    </div>
  );
};

export default InsightsPage;