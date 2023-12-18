let isProcessedFrameAvailable = false; // Flag to track if a new processed image is available

document.getElementById('execute-btn').addEventListener('click', function() {
    const userCode = document.getElementById('p5-code').value;
    const iframe = document.getElementById('p5-iframe');

    const iframeContent = `
        <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js"></script>
        </head>
        <body>
            <script>
                (function() {
                    const userSketch = (function() {
                        ${userCode}
                        return { setup, draw };
                    })();

                    window.setup = function() {
                        userSketch.setup();
                        frameRate(10); // Adjusted for optimal performance
                    };

                    let lastCaptureTime = 0;
                    const captureInterval = 1000; // Capture every 1000 milliseconds

                    window.draw = function() {
                        userSketch.draw();
                        let currentTime = millis();
                        if (currentTime - lastCaptureTime > captureInterval) {
                            lastCaptureTime = currentTime;
                            sendFrame();
                        }
                    };

                    function sendFrame() {
                        let canvas = document.querySelector('canvas');
                        window.parent.postMessage(canvas.toDataURL('image/jpeg', 0.5), '*'); // JPEG format with lower quality
                    }
                })();
            </script>
        </body>
        </html>`;

    const blob = new Blob([iframeContent], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);        
});

async function compressImage(imageSrc) {
    const options = {
        maxSizeMB: 1, // Max file size in MB
        maxWidthOrHeight: 1920, // Max width or height in pixels
        useWebWorker: true
    };

    try {
        const img = new Image();
        img.src = imageSrc;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        const compressedFile = await imageCompression(blob, options);
        return await imageCompression.getDataUrlFromFile(compressedFile);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to compress image');
    }
}

const frameContainer = document.getElementById('frame-container');
let imageQueue = [];
let isImageBeingProcessed = false;


window.addEventListener('message', async function(event) {
    if (event.data) {
        const frameContainer = document.getElementById('frame-container');
        frameContainer.innerHTML = `<img src="${event.data}" style="width: 100%; border: 1px solid #ddd;">`;

        try {
            const serverUrl = 'http://localhost:3000/callfal';
            const headers = {
                'Content-Type': 'application/json'
            };

            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ image_url: event.data, prompt: 'water color paint' }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();

            // Log the result for debugging
            console.log('result', result);

            if (result && result.images && result.images.length > 0) {
                imageQueue.push(result.images[0].url); // Add the image URL to the queue

                if (!isImageBeingProcessed) {
                    displayNextImage();
                }
            } else {
                console.error('Invalid format of response:', result);
            }
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }
});

function displayNextImage() {
    if (imageQueue.length > 0) {
        isImageBeingProcessed = true;
        let processedFrame = document.getElementById('processed-frame');
        let processedContainer = document.getElementById('processed-container');

        if (!processedFrame) {
            processedFrame = document.createElement('img');
            processedFrame.id = 'processed-frame';
            processedFrame.style.width = '400px'; // Match the size of the p5.js canvas
            processedFrame.style.height = '400px';
            processedContainer.appendChild(processedFrame); // Append to processed-container
        }

        processedFrame.onload = function() {
            isImageBeingProcessed = false;
            imageQueue.shift();
            displayNextImage();
        };

        processedFrame.src = imageQueue[0];
    }
}


