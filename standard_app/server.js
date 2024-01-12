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

const port = process.env.PORT || 3003; // Use environment port or 3003 as fallback

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

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);


const imageSavePath = '/Users/wujiaqi/Downloads/saved_images'; // Set your image save path
let savedImages = [];
var imagenum = 0;//number of each saved image

//clear saved images when refresh
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

        // Ensure the savedImages array does not exceed 20 images
        if (savedImages.length >= 20) {
            // Remove the oldest image
            let removedImage = savedImages.shift();
            fs.unlink(removedImage, (err) => {
                if (err) console.error("Error deleting old image:", err);
            });
        }

        // Save the new image
        imagenum +=1;
        const imageIndex = imagenum; 
        const imageName = `image_${imageIndex}.jpg`;
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


// Establish a real-time connection with FAL
const falConnection = fal.realtime.connect("110602490-lcm", {
    onResult: (result) => {
        console.log('Real-time result:', result);
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

wss.on('connection', function connection(ws) {
    const id = Date.now();
    clients.set(id, ws);

    ws.on('message', function incoming(message) {
        console.log(`Received message from client ${id}:`, message);

        try {
            const data = JSON.parse(message);

            if (!data.prompt || !data.image_url) {
                console.error('Bad request: Missing prompt or image URL.');
                return;
            }

            // Send data to FAL using the real-time connection
            try {
                falConnection.send({
                    prompt: data.prompt,
                    image_url: data.image_url,
                    strength: data.strength,
                    // image_size: {
                    //     "width": 512,
                    //     "height": 512
                    // },
                });
            } catch (error) {
                console.error('Error sending data to FAL:', error);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        clients.delete(id);
    });
});

app.use((error, req, res, next) => {
    console.error(error); // Log the error for debugging
    res.status(500).send('Server: Error processing image');
});

server.listen(port, () => {
    console.log(`WebSocket Server: Running on port ${port}`);
});