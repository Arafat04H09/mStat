import axios from "axios";

class SpotifyDataService {

    async aggregateUniqueItems(insights: any) {
        const uniqueTrackIds = new Set<string>();
        const uniqueAlbumIds = new Set<string>();
        const uniqueArtistIds = new Set<string>();
    
        insights.topTracks.forEach((track: any) => {
          if (track.spotify_track_uri) {
            uniqueTrackIds.add(track.spotify_track_uri.split(':')[2]);
          }
        });
        
        insights.topTracks.forEach((track: any) => {
            if (track.spotify_track_uri) {
              uniqueTrackIds.add(track.spotify_track_uri.split(':')[2]);
            }
          });
    
        return {
          trackIds: Array.from(uniqueTrackIds),
          albumIds: Array.from(uniqueAlbumIds),
          artistIds: Array.from(uniqueArtistIds),
        };
      }
    
}