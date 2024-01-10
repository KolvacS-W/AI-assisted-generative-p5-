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
                    const captureInterval = 500; // Capture every 100 milliseconds

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

        let screenshotFrame = document.getElementById('screenshot-frame');
        const screenshotContainer = document.getElementById('screenshot-container');
        const compressedImageSrc = await compressImage(event.data, 448);

        if (!screenshotFrame) {
            screenshotFrame = document.createElement('img');
            screenshotFrame.id = 'screenshot-frame';
            screenshotFrame.style.width = '400px';
            screenshotFrame.style.height = '400px';
            screenshotContainer.appendChild(screenshotFrame);
        }

        // Update the src of the existing image element
        screenshotFrame.src = compressedImageSrc;

        // Update the screenshot image counter
        let counterDiv = document.getElementById('screenshot-counter');
        if (!counterDiv) {
            counterDiv = document.createElement('div');
            counterDiv.id = 'screenshot-counter';
            screenshotContainer.insertBefore(counterDiv, screenshotContainer.firstChild);
        }
        counterDiv.innerHTML = `Frame: ${screenshotCounter}`;

        sendImageToServer(compressedImageSrc);
    }
});

// Variables to store the current strength and prompt values
let currentStrength = 0.6; // Default value
let currentPrompt = "digital cyberpunk tree"; // Default value

// Create UI elements for strength slider, prompt input, and update button
const controlsContainer = document.getElementById('controls-container');

// Strength slider
const strengthSlider = document.createElement('input');
strengthSlider.type = 'range';
strengthSlider.min = '0';
strengthSlider.max = '1';
strengthSlider.step = '0.1';
strengthSlider.value = currentStrength;
controlsContainer.appendChild(strengthSlider);

// Prompt input
const promptInput = document.createElement('input');
promptInput.type = 'text';
promptInput.value = currentPrompt;
controlsContainer.appendChild(promptInput);

// Update button
const updateButton = document.createElement('button');
updateButton.textContent = 'Update';
controlsContainer.appendChild(updateButton);

// Update button event listener
updateButton.addEventListener('click', function() {
    currentStrength = parseFloat(strengthSlider.value);
    currentPrompt = promptInput.value;
});

window.onload = function() {
    // Reset state when page is loaded or refreshed
    isProcessedFrameAvailable = false;
    screenshotCounter = 0;
    processedImageCounter = 0;
    imageQueue = [];
    isImageBeingProcessed = false;

    // Clear existing content in screenshot and processed containers
    const screenshotContainer = document.getElementById('screenshot-container');
    const processedContainer = document.getElementById('processed-container');
    if (screenshotContainer) {
        screenshotContainer.innerHTML = '';
    }
    if (processedContainer) {
        processedContainer.innerHTML = '';
    }
};

// Array to store details for each processed image
let processedImageDetails = [];

function sendImageToServer(imageSrc) {
    if (ws.readyState === WebSocket.OPEN) {
        // Store details for the processed image
        processedImageDetails.push({
            strength: currentStrength,
            prompt: currentPrompt
        });

        ws.send(JSON.stringify({ image_url: imageSrc, prompt: currentPrompt, strength: currentStrength }));
    } else {
        console.error('WebSocket is not open. Current state:', ws.readyState);
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
            if (imageQueue.length > 0) {
                displayNextImage(); // Continue displaying next image in the queue
            }
        };

        // Update the src of the existing image element instead of creating a new one
        processedFrame.src = imageQueue[0];
        imageQueue.shift();

        // Update the processed image counter and details
        processedImageCounter++;
        let details = processedImageDetails.shift();
        let counterDiv = document.getElementById('processed-counter');
        if (!counterDiv) {
            counterDiv = document.createElement('div');
            counterDiv.id = 'processed-counter';
            processedContainer.insertBefore(counterDiv, processedContainer.firstChild);
        }
        counterDiv.innerHTML = `Processed Frame: ${processedImageCounter}<br>Strength: ${details.strength}<br>Prompt: ${details.prompt}`;
    }
}
