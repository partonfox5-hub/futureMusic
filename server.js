const express = require('express');
const app = express();
const path = require('path');

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory (images, css, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// SAFELY Load song data to prevent crash on deploy if file is missing
let songsData = [];
try {
    // Try to load the merged songs data
    songsData = require('./merged_songs.json');
} catch (error) {
    console.error('CRITICAL: merged_songs.json not found! The app will start but music data is empty.');
    // Keep songsData as empty array [] so the app doesn't crash
}

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

// Dynamic Song Detail Route
app.get('/song/:id', (req, res) => {
    const songId = req.params.id;
    
    // Find the song in the array
    const song = songsData.find(s => {
        // Check YouTube ID
        if (s.youtube_info && s.youtube_info.video_id === songId) return true;
        // Check Spotify ID
        if (s.spotify_id === songId) return true;
        return false;
    });

    if (song) {
        res.render('song', { song: song });
    } else {
        res.status(404).send('Song not found');
    }
});

// Music Page Route
app.get('/music', (req, res) => {
    res.render('music', { 
        songs: songsData // <--- This 'songs' key must match the EJS variable
    });
});

app.get('/projects', (req, res) => {
    res.render('projects', { title: 'Projects' });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About' });
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact' });
});

// Cloud Run requires the app to listen on the environment variable PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});