const fs = require('fs');
const SpotifyWebApi = require('spotify-web-api-node');

// Credentials from your index.js
const clientId = '70d3b5af064d44509c86a971db2d4ff2';
const clientSecret = '4f7975a3ecda4049b93f4f0ba800241b';

const spotifyApi = new SpotifyWebApi({ clientId, clientSecret });

async function getToken() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Spotify Access Token retrieved.');
    } catch (err) {
        console.error('Error getting access token:', err);
        process.exit(1);
    }
}

async function updateSongsWithImages() {
    await getToken();

    // 1. Read existing songs.json
    let songs = [];
    try {
        const rawData = fs.readFileSync('songs.json', 'utf8');
        songs = JSON.parse(rawData);
    } catch (err) {
        console.error('Error reading songs.json:', err.message);
        return;
    }

    // 2. Collect all valid Spotify IDs that need images
    // We batch them because Spotify API allows fetching up to 50 tracks at once
    const tracksToFetch = [];
    const idToSongMap = new Map(); // Helper to map ID back to song object(s)

    songs.forEach(song => {
        if (song.spotify_id) {
            tracksToFetch.push(song.spotify_id);
            
            // Handle duplicate IDs (unlikely but safe) by storing array of refs
            if (!idToSongMap.has(song.spotify_id)) {
                idToSongMap.set(song.spotify_id, []);
            }
            idToSongMap.get(song.spotify_id).push(song);
        }
    });

    // Remove duplicates from fetch list for efficiency
    const uniqueIds = [...new Set(tracksToFetch)];
    console.log(`Found ${uniqueIds.length} Spotify IDs to process.`);

    // 3. Fetch in batches of 50
    const batchSize = 50;
    for (let i = 0; i < uniqueIds.length; i += batchSize) {
        const batch = uniqueIds.slice(i, i + batchSize);
        
        try {
            const data = await spotifyApi.getTracks(batch);
            
            data.body.tracks.forEach(track => {
                if (track && track.album && track.album.images.length > 0) {
                    // Get the first image (usually the largest)
                    const imageUrl = track.album.images[0].url;
                    
                    // Update all song objects in our local JSON that match this ID
                    const songsToUpdate = idToSongMap.get(track.id);
                    if (songsToUpdate) {
                        songsToUpdate.forEach(s => {
                            s.spotify_image = imageUrl;
                        });
                    }
                }
            });
            console.log(`Processed batch ${i / batchSize + 1}`);
        } catch (err) {
            console.error('Error fetching batch:', err);
        }
    }

    // 4. Save back to songs.json
    fs.writeFileSync('songs.json', JSON.stringify(songs, null, 2));
    console.log('Success! songs.json has been updated with Spotify images.');
}

updateSongsWithImages();