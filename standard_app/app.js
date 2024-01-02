let isProcessedFrameAvailable = false; // Flag to track if a new processed image is available
let screenshotCounter = 0; // Counter for screenshot frames
let processedImageCounter = 0; // Counter for processed images

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
                    const captureInterval = 100; // Capture every 100 milliseconds

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

    screenshotCounter = 0; // Reset counter when execution starts
    processedImageCounter = 0; // Reset processed image counter
});

async function compressImage(imageSrc, size) {
    const options = {
        maxSizeMB: 1, // Max file size in MB
        maxWidthOrHeight: size, // Resize to size pixels
        useWebWorker: true
    };

    try {
        const img = new Image();
        img.src = imageSrc;
        await img.decode();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size; // Set new width
        canvas.height = size; // Set new height
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        const compressedFile = await imageCompression(blob, options);
        return await imageCompression.getDataUrlFromFile(compressedFile);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to compress and resize image');
    }
}

const processedContainer = document.getElementById('processed-container');
let imageQueue = [];
let isImageBeingProcessed = false;

const ws = new WebSocket('ws://localhost:3003');

ws.onopen = function(event) {
    console.log("Connected to WebSocket server");
};

ws.onclose = function(event) {
    console.log("WebSocket connection closed:", event);
    // Implement your reconnection logic here
};

ws.onerror = function(error) {
    console.error("WebSocket error:", error);
    // Handle the error, maybe try to reconnect
};

window.addEventListener('message', async function(event) {
    if (event.data) {
        screenshotCounter++; // Increment screenshot counter
        const screenshotContainer = document.getElementById('screenshot-container');
        const compressedImageSrc = await compressImage(event.data, 448);

        // Display the screenshot image with counter
        screenshotContainer.innerHTML = `<div>Frame: ${screenshotCounter}</div><img src="${compressedImageSrc}" style="width: 100%; border: 1px solid #ddd;">`;

        sendImageToServer(compressedImageSrc);
    }
});

function sendImageToServer(imageSrc) {
    const prompt = "digital cyberpunk tree"; // Ensure this is the prompt you want to send
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ image_url: imageSrc, prompt: prompt, strength: 0.6 }));
    } else {
        console.error('WebSocket is not open. Current state:', ws.readyState);
        // Optionally, you can implement a retry mechanism here
    }
}

function connectWebSocket() {
    ws.onopen = function(event) {
        console.log("Connected to WebSocket server");
    };

    ws.onclose = function(event) {
        console.log("WebSocket connection closed:", event);
        setTimeout(connectWebSocket, 3003); // Try to reconnect after 3 seconds
    };

    ws.onerror = function(error) {
        console.error("WebSocket error:", error);
    };

    ws.onmessage = function(event) {
        console.log("Received data from WebSocket server:", event.data);
        const result = JSON.parse(event.data);
    
        if (result && result.images && result.images.length > 0) {
            result.images.forEach(image => {
                if (image.url) {
                    imageQueue.push(image.url);
                }
            });
    
            if (!isImageBeingProcessed) {
                displayNextImage();
            }
        } else {
            console.error("Received data without image URLs");
        }
    };
}

// Initial WebSocket connection
connectWebSocket();

function displayNextImage() {
    if (imageQueue.length > 0) {
        isImageBeingProcessed = true;
        let processedFrame = document.getElementById('processed-frame');

        if (!processedFrame) {
            processedFrame = document.createElement('img');
            processedFrame.id = 'processed-frame';
            processedFrame.style.width = '400px';
            processedFrame.style.height = '400px';
            processedContainer.appendChild(processedFrame);
        }

        processedFrame.onload = function () {
            isImageBeingProcessed = false;
            imageQueue.shift();
            if (imageQueue.length > 0) {
                displayNextImage(); // Continue displaying next image in the queue
            }
        };

        processedFrame.src = imageQueue[0];
        processedImageCounter++; // Increment processed image counter
        // Display processed image counter
        processedContainer.innerHTML = `<div>Processed Frame: ${processedImageCounter}</div>`;
        processedContainer.appendChild(processedFrame);
    }
}
