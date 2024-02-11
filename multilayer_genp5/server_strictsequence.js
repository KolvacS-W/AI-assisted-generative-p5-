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

const port = process.env.PORT || 3001; // Use environment port or 3001 as fallback

fal.config({
    credentials: '3365ef87-0b51-4ad8-8854-c32278746da6:c2c75dd966d2de66dae4700905b8a1d4',
});

console.log('key loaded');

app.use(express.json());
app.use(bodyParser.json({ limit: '60mb' })); // Increase the payload limit

// Create an HTTP server and wrap the Express app
const server = http.createServer(app);

// Set up the WebSocket server
const wss = new WebSocket.Server({ server });

// Store client requests
const clientRequests = new Map();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);

const imageSavePath = '/Users/wujiaqi/Downloads/saved_images'; // Set your image save path
let savedImages = [];
var imagenum = 0; // Number of each saved image
let workedidlist = [];
const requestQueue = []; // Initialize the request queue

// Clear saved images when refresh
app.get('/clear-images', async (req, res) => {
    try {
        const files = await readdir(imageSavePath);
        await Promise.all(files.map(file => unlink(path.join(imageSavePath, file))));
        savedImages = []; // Clear the saved images array
        res.send('All images cleared');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error clearing images');
    }
});

app.post('/save-image', async (req, res) => {
    const { imageUrl } = req.body;

    try {
        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'stream'
        });

        if (savedImages.length >= 20) {
            let removedImage = savedImages.shift();
            fs.unlink(removedImage, (err) => {
                if (err) console.error("Error deleting old image:", err);
            });
        }

        imagenum += 1;
        const imageName = `image_${imagenum}.jpg`;
        const imagePath = path.join(imageSavePath, imageName);
        response.data.pipe(fs.createWriteStream(imagePath));

        savedImages.push(imagePath);

        console.log('Image saved successfully', imageName)
        res.json({ message: 'Image saved successfully', imageName });
    } catch (error) {
        console.error('Error saving image:', error);
        res.status(500).send('Error saving image');
    }
});

app.use('/saved_images', express.static(imageSavePath));

app.get('/get-smallest-image-number', (req, res) => {
    fs.readdir(imageSavePath, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading image directory');
        }

        let minNumber = files
            .map(file => parseInt(file.match(/\d+/)[0], 10))
            .filter(num => !isNaN(num))
            .reduce((min, num) => num < min ? num : min, Number.MAX_VALUE);

        if (minNumber === Number.MAX_VALUE) minNumber = 0;

        res.json({ minNumber });
    });
});

// Establish a real-time connection with FAL
const falConnection = fal.realtime.connect("110602490-lcm", {
    onResult: (result) => {
        console.log('get result from fal', result.request_id)
        const requestInfo = clientRequests.get(result.request_id);
        if (requestInfo) {
            const response = {
                result: result,
                count: requestInfo.count,
                request_id: result.request_id
            };
            console.log('solved:', result.request_id)
            workedidlist.push(parseInt(result.request_id))
            requestInfo.ws.send(JSON.stringify(response));
            console.log('sent', requestInfo.request_id)
            // Remove the client request from the list after sending the response
            clientRequests.delete(result.request_id);
        }
    },
    onError: (error) => {
        console.error('Real-time error:', error);
    }
});

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {

        try {
            const data = JSON.parse(message);

            if (!data.prompt || !data.image_url || !data.request_id) {
                console.error('Bad request: Missing prompt, image URL, or requestId.');
                return;
            }

            // Store client request data
            clientRequests.set(data.request_id, { ws, count: data.count, request_id: data.request_id });
            // console.log('push:',workedidlist)
            // console.log('push:',parseInt(data.request_id)-1)
            requestQueue.push(data);

            // Check if the condition is met to send the request to FAL
            // if (parseInt(data.request_id) === 1 || workedidlist.includes(parseInt(data.request_id) - 1)) {
            //     // Add the request to the queue
            //     processRequestQueue(); // Start processing the queue
            // }

        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        // Remove all requests from this client
        clientRequests.forEach((value, key) => {
            if (value.ws === ws) {
                clientRequests.delete(key);
            }
        });
    });
});


// Function to process the request queue
function processRequestQueue() {
    if (requestQueue.length > 0) {
        const nextRequest = requestQueue[0]; // Peek at the first request in the queue

        // Check if the condition is met to send the request to FAL
        if (parseInt(nextRequest.request_id) === 1 || workedidlist.includes(parseInt(nextRequest.request_id) - 1)) {
            const data = requestQueue.shift(); // Remove the first request from the queue
            try {
                // Send data to FAL using the real-time connection
                falConnection.send({
                    prompt: data.prompt,
                    image_url: data.image_url,
                    strength: data.strength,
                    enable_safety_checks: false,
                    seed: 12248,
                    num_images: 1,
                    request_id: data.request_id // Pass the requestId to FAL
                });
                console.log('sent to fal:', data.request_id);
            } catch (error) {
                console.error('Error sending data to FAL:', error);
            }
        }
    }
}

// Periodically check and process the request queue
setInterval(processRequestQueue, 1000); // Check the queue every 1 second


app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).send('Server: Error processing image');
});

server.listen(port, () => {
    console.log(`WebSocket Server: Running on port ${port}`);
});