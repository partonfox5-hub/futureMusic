const express = require('express');
const app = express();
const path = require('path');

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// 1. Load the data (assuming the file is in your root folder)
const songsData = require('./songs.json'); 

// Serve static files from the public directory (images, css, etc.)
app.use(express.static(path.join(__dirname, 'public')));


// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

// 2. Create the route
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