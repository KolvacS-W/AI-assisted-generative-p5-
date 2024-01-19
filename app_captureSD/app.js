let isProcessedFrameAvailable = false; // Flag to track if a new processed image is available
let screenshotCounter = 0; // Counter for screenshot frames
let processedImageCounter = 0; // Counter for processed images
let blendindex = 1;
let firstservercall = true;

document.getElementById('execute-btn').addEventListener('click', function() {
    // // Clear the imageQueue when the execute button is clicked
    // imageQueue = [];
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
                        return { setup, draw, getBlockImage };
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
                        // Send both the screenshot and block image
                        window.parent.postMessage({
                            screenshot: canvas.toDataURL('image/jpeg', 0.5),
                            blockImage: userSketch.getBlockImage() // This will get the block image from p5.js
                        }, '*');
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

// Control flags
let isCapturing = true;
let isProcessing = true;

const switchContainer = document.getElementById('switch-container');

// Create Stop and Continue buttons
const stopButton = document.createElement('button');
stopButton.textContent = 'Stop';
switchContainer.appendChild(stopButton);

const continueButton = document.createElement('button');
continueButton.textContent = 'Continue';
switchContainer.appendChild(continueButton);

// Event listener for Stop button
stopButton.addEventListener('click', function() {
    console.log('stopped')
    isCapturing = false;
    isProcessing = false;
});

// Event listener for Continue button
continueButton.addEventListener('click', function() {
    console.log('continues')
    isCapturing = true;
    isProcessing = true;
});

// Arrays to store image URLs
let screenshotImageUrls = [];
let processedImageUrls = [];
let blockImageUrls = [];

window.addEventListener('message', async function(event) {
    if (event.data && isCapturing) {
        screenshotCounter++;
        let screenshotFrame = document.getElementById('screenshot-frame');
        const screenshotContainer = document.getElementById('screenshot-container');
        const compressedImageSrc = await compressImage(event.data.screenshot, 448);
    
        if (!screenshotFrame) {
            screenshotFrame = document.createElement('img');
            screenshotFrame.id = 'screenshot-frame';
            screenshotFrame.style.width = '400px';
            screenshotFrame.style.height = '400px';
            screenshotContainer.appendChild(screenshotFrame);
        }
        screenshotFrame.src = compressedImageSrc;
        screenshotImageUrls.push(compressedImageSrc); // Store the screenshot URL

    
        // Update screenshot overlay content
        let screenshotOverlay = document.getElementById('screenshot-overlay');
        if (!screenshotOverlay) {
            screenshotOverlay = document.createElement('div');
            screenshotOverlay.id = 'screenshot-overlay';
            screenshotOverlay.className = 'overlay';
            screenshotContainer.insertBefore(screenshotOverlay, screenshotContainer.firstChild);
        }
        screenshotOverlay.textContent = `Frame: ${screenshotCounter}`;

        // Handle and display the block image
        if (event.data.blockImage) {
            const blockImageSrc = await compressImage(event.data.blockImage, 448);
            blockImageUrls.push(blockImageSrc);
            displayBlockImage(blockImageSrc, screenshotCounter);
        }

        //first call
        if (firstservercall) {
            console.log('first call')
            sendImageToServer(compressedImageSrc, blockImageUrls[0]);
            firstservercall = false;
        }
        // sendImageToServer(compressedImageSrc);


    }
    
});

function displayBlockImage(imageSrc, frameNumber) {
    const blockContainer = document.getElementById('block-container');
    let blockFrame = document.getElementById('block-frame');
    if (!blockFrame) {
        blockFrame = document.createElement('img');
        blockFrame.id = 'block-frame';
        blockFrame.style.width = '400px';
        blockFrame.style.height = '400px';
        blockContainer.appendChild(blockFrame);
    }
    blockFrame.src = imageSrc;

    // Update block overlay content
    let blockOverlay = document.getElementById('block-overlay');
    if (!blockOverlay) {
        blockOverlay = document.createElement('div');
        blockOverlay.id = 'block-overlay';
        blockOverlay.className = 'overlay';
        blockContainer.insertBefore(blockOverlay, blockContainer.firstChild);
    }
    blockOverlay.textContent = `Frame: ${frameNumber}`;
}

// Variables to store the current strength and prompt values
let currentStrength = 0.8; // Default value
let currentPrompt = "watercolor paint drops"; // Default value

// Create UI elements for strength slider, prompt input, and update button
const controlsContainer = document.getElementById('controls-container');

const strengthLabel = document.createElement('label');
strengthLabel.textContent = 'Strength';
controlsContainer.appendChild(strengthLabel);

// Strength slider
const strengthSlider = document.createElement('input');
strengthSlider.type = 'range';
strengthSlider.min = '0';
strengthSlider.max = '1';
strengthSlider.step = '0.01';
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

// Add a slider to view saved images
// const viewSavedImagesContainer = document.createElement('div');
// document.body.appendChild(viewSavedImagesContainer);

// const savedImageSlider = document.createElement('input');
// savedImageSlider.type = 'range';
// savedImageSlider.min = '1';
// savedImageSlider.max = '20';
// savedImageSlider.step = '1';
// savedImageSlider.value = '1'; // Default to the first image
// viewSavedImagesContainer.appendChild(savedImageSlider);

// const savedImageView = document.createElement('img');
// savedImageView.style.width = '400px';
// savedImageView.style.height = '400px';
// savedImageView.style.border = '2px solid #ddd';
// viewSavedImagesContainer.appendChild(savedImageView);

// savedImageSlider.addEventListener('input', function() {
//     const imageIndex = savedImageSlider.value;
//     fetch(`http://localhost:3003/get-saved-image?index=${imageIndex}`)
//         .then(response => response.blob())
//         .then(blob => {
//             const imageUrl = URL.createObjectURL(blob);
//             savedImageView.src = imageUrl;
//         })
//         .catch(error => console.error('Error fetching saved image:', error));
// });


window.onload = function() {

    // // Clear the imageQueue when the page loads or refreshes
    // imageQueue = [];
    // Call to clear the images on the server
    fetch('http://localhost:3003/clear-images')
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));

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

function sendImageToServer(imageSrc, maskUrl) {
    // Print out the URL and size of the mask image
    if (maskUrl) {
        const img = new Image();
        img.onload = function() {
            // console.log(`Mask URL: ${maskUrl}`);
            console.log(`Mask Size: ${img.width}x${img.height}`);
        };
        img.src = maskUrl;
    }

    if (ws.readyState === WebSocket.OPEN) {
        // Store details for the processed image
        processedImageDetails.push({
            strength: currentStrength,
            prompt: currentPrompt,
            mask_url: maskUrl // Adding mask URL as a parameter
        });

        ws.send(JSON.stringify({ image_url: imageSrc, prompt: currentPrompt, strength: currentStrength, mask_url: maskUrl }));
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
                    //save images as they come
                    let imageUrl = imageQueue[0];
                    saveProcessedImage(imageUrl);
                    //prepare for blending
                    processedImageUrls.push(imageUrl); // Store the processed image URL            
                    logImagePairs(blendindex); // Call the function to log image pairs
                    blendindex+=1;
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


// let overlayTransparency = 0.7; // Default transparency

// Function to create a concatenated image and update the blend-container
function createAndDisplayConcatenatedImage(screenshotUrl, processedUrl, transparency, blendindex) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img1 = new Image();
    const img2 = new Image();

    // Set crossOrigin to anonymous to request CORS-safe images
    img1.crossOrigin = "anonymous";
    img2.crossOrigin = "anonymous";

    img1.src = screenshotUrl;
    img2.src = processedUrl;

    img1.onload = () => {
        canvas.width = img1.width;
        canvas.height = img1.height;

        // Draw the first image (screenshot) with full opacity
        ctx.globalAlpha = 1;
        ctx.drawImage(img1, 0, 0);

        img2.onload = () => {
            // Draw the second image (processed) with specified transparency
            ctx.globalAlpha = 0;
            ctx.drawImage(img2, 0, 0, img1.width, img1.height);  // Resize to match the first image

            try {
                updateBlendContainer(canvas.toDataURL('image/jpeg'));
                if (isCapturing){
                    sendImageToServer(canvas.toDataURL('image/jpeg'), blockImageUrls[blendindex]);
                }
            } catch (e) {
                console.error("Error creating data URL:", e);
            }
        };
        img2.onerror = () => console.error('Error loading the processed image');
    };
    img1.onerror = () => console.error('Error loading the screenshot image');
}


// Function to update the blend-container with the new concatenated image
function updateBlendContainer(concatenatedImageUrl) {
    const blendContainer = document.getElementById('blend-container');
    blendContainer.innerHTML = `<img src="${concatenatedImageUrl}" style="width: 400px; height: auto;">`;  // Set size to match screenshot
}

// Function to log image pairs and create a concatenated image
function logImagePairs(blendindex) {
    if (processedImageUrls[blendindex - 1]) {
        console.log(`Frame ${blendindex}:`);

        // Create and display concatenated image
        createAndDisplayConcatenatedImage(screenshotImageUrls[blendindex], processedImageUrls[blendindex - 1], 0.3, blendindex);
    } else {
        console.log('Blend image error');
    }
}

// Initial WebSocket connection
connectWebSocket();

function saveProcessedImage(imageUrl) {
    fetch('http://localhost:3003/save-image', {  // Use the correct server URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
    }).then(response => response.json())
      .then(data => console.log(data))
      .catch(error => console.error('Error:', error));
}

// let savedImageQueue = [];

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

        processedFrame.src = imageQueue[0];
        imageQueue.shift();

        processedImageCounter++;
        let details = processedImageDetails.shift();
        
        // Check if processedOverlay exists before updating its content
        // Update processed overlay content
        let processedOverlay = document.getElementById('processed-overlay');
        if (!processedOverlay) {
            processedOverlay = document.createElement('div');
            processedOverlay.id = 'processed-overlay';
            processedOverlay.className = 'overlay';
            processedContainer.insertBefore(processedOverlay, processedContainer.firstChild);
        }
        processedOverlay.innerHTML = `Processed Frame: ${processedImageCounter}<br>Strength: ${details.strength}<br>Prompt: ${details.prompt}`;
    }
}



//result image gallery
// Fetch and display the image based on the slider's position
// document.getElementById('show-image-button').addEventListener('click', function() {
//     const slider = document.getElementById('image-slider');
//     const imageDisplayContainer = document.getElementById('image-display-container');

//     fetch('http://localhost:3003/get-smallest-image-number')
//         .then(response => response.json())
//         .then(data => {
//             const smallestImageNumber = data.minNumber;
//             const adjustedImageIndex = parseInt(slider.value) + smallestImageNumber+1;

//             const imageUrl = `http://localhost:3003/saved_images/image_${adjustedImageIndex}.jpg`;
//             imageDisplayContainer.innerHTML = `<img src="${imageUrl}" alt="Saved Image" style="width: 100%; height: auto;">`;
//         })
//         .catch(error => {
//             console.error('Error:', error);
//             imageDisplayContainer.innerHTML = `<p>Error loading image.</p>`;
//         });
// });

// Add event listener for the image slider
document.getElementById('image-slider').addEventListener('input', function() {
    displayImageBasedOnSlider();
});

function displayImageBasedOnSlider() {
    const slider = document.getElementById('image-slider');
    const imageDisplayContainer = document.getElementById('image-display-container');

    fetch('http://localhost:3003/get-smallest-image-number')
        .then(response => response.json())
        .then(data => {
            const smallestImageNumber = data.minNumber;
            const adjustedImageIndex = parseInt(slider.value) + smallestImageNumber;

            const imageUrl = `http://localhost:3003/saved_images/image_${adjustedImageIndex}.jpg`;
            imageDisplayContainer.innerHTML = `<img src="${imageUrl}" alt="Saved Image" style="width: 100%; height: auto;">`;
        })
        .catch(error => {
            console.error('Error:', error);
            imageDisplayContainer.innerHTML = `<p>Error loading image.</p>`;
        });
}