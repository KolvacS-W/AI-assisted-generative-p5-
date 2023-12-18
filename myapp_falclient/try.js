const fal = require('@fal-ai/serverless-client');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Add axios for downloading the image

fal.config({
  credentials: '0d7a9a57-75ff-46f6-a0a0-f54825f75c0d:c908351860b12a4618f8e58fd97a0e70',
});

console.log('key loaded');

async function processImage() {
  const imagePath = path.join(__dirname, 'images', './download.jpg'); // Replace with your image filename

  const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });
  const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

  const result = await fal.subscribe("110602490-lcm", {
    input: {
      image_url: imageDataUri,
      prompt: 'realistic sweaters'
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });

  console.log(result);

  if (!result || !result.images || result.images.length === 0) {
    console.error('No image returned from FAL API');
    return;
  }

  // Download and save the resulting image
  const imageUrl = result.images[0].url;
  const outputImagePath = path.join(__dirname, 'images', './output-image-name.jpg'); // Replace with your desired output filename

  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(outputImagePath, response.data);

  console.log('Image processing complete. Check the images folder for the result.');
}

processImage().catch(error => {
  console.error('An error occurred:', error);
});
