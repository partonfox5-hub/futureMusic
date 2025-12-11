const express = require('express');
const app = express();
const path = require('path');

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory (images, css, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

app.get('/music', (req, res) => {
    res.render('music', { title: 'Music' });
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