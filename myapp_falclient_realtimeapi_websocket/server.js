const cors = require('cors');
const express = require('express');
const WebSocket = require('ws');
const fal = require('@fal-ai/serverless-client');
const http = require('http');
const app = express();
const bodyParser = require('body-parser');

// Define WebSocket globally
global.WebSocket = WebSocket;

const corsOptions = {
    origin: '*', // Adjust as necessary for security
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const port = process.env.PORT || 3000; // Use environment port or 3000 as fallback

fal.config({
    credentials: '0d7a9a57-75ff-46f6-a0a0-f54825f75c0d:c908351860b12a4618f8e58fd97a0e70',
});

console.log('key loaded');

app.use(express.json());
app.use(bodyParser.json({ limit: '60mb' })); // Increase the payload limit


// Create an HTTP server and wrap the Express app
const server = http.createServer(app);

// Set up the WebSocket server
const wss = new WebSocket.Server({ server });

// Store active connections
const clients = new Map();

wss.on('connection', function connection(ws) {
    const id = Date.now(); // Generate a unique ID for the client
    clients.set(id, ws);

    ws.on('close', () => {
        clients.delete(id); // Remove client on disconnect
    });
});

// Establish a real-time connection
// Establish a real-time connection with FAL
const connection = fal.realtime.connect("110602490-lcm", {
    onResult: (result) => {
        console.log('Real-time result:', result);
        
        // Forward the result to all connected clients
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(result));
            }
        });
    },
    onError: (error) => {
        console.error('Real-time error:', error);
    }
});

app.post('/callfal', async (req, res, next) => {
    try {
        const { image_url, prompt } = req.body;
        if (!image_url || !prompt) {
            res.status(400).send('Bad request: Missing image URL or prompt.');
            return;
        }

        // Use the real-time connection to send the request
        connection.send({
            prompt: prompt,
            image_url: image_url
        });

        // You might need a way to send the real-time response back to the client
        // res.send({ message: "Request sent. Processing..." });
    } catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    console.error(error); // Log the error for debugging
    res.status(500).send('Server: Error processing image');
});

// app.listen(port, () => {
//     console.log(`Server: Running on port ${port}`);
// });

// Use the HTTP server to listen instead of the Express app
server.listen(port, () => {
    console.log(`WebSocket Server: Running on port ${port}`);
});