const cors = require('cors');
const express = require('express');
const fal = require('@fal-ai/serverless-client');
const app = express();
const bodyParser = require('body-parser'); // Import body-parser
const path = require('path');
const axios = require('axios'); // Add axios for downloading the image
const fs = require('fs');

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
// Set the limit to a higher value, for example, '50mb'
app.use(bodyParser.json({ limit: '60mb' })); // Increase the payload limit

app.post('/callfal', async (req, res, next) => {
    try {
        const { image_url, prompt } = req.body;
        if (!image_url || !prompt) {
            res.status(400).send('Bad request: Missing image URL or prompt.');
            return;
        }

        const result = await fal.subscribe("110602490-lcm", {
            input: {
                image_url,
                prompt
            },
        });

        if (!result || !result.images || result.images.length === 0) {
            throw new Error('No image returned from FAL API');
        }

        console.log('result from server:', result)

          // Download and save the resulting image
        // const imageUrl = result.images[0].url;
        // const outputImagePath = path.join(__dirname, 'images', './output-image-name'+Math.random().toString()+'.jpg'); // Replace with your desired output filename

        // const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        // fs.writeFileSync(outputImagePath, response.data);

        // console.log('Image processing complete. Check the images folder for the result.');

        res.send(result);
    } catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    console.error(error); // Log the error for debugging
    res.status(500).send('Server: Error processing image');
});

app.listen(port, () => {
    console.log(`Server: Running on port ${port}`);
});
