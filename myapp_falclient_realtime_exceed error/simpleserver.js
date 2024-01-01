const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors()); // Enable CORS for all origins

// A simple route to check if the server is running
app.get('/test', (req, res) => {
    res.send('Server is running!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
