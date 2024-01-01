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
                    const captureInterval = 100; // Capture every 1000 milliseconds

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

async function compressImage(imageSrc, size) {
    const options = {
        maxSizeMB: 1, // Max file size in MB
        maxWidthOrHeight: size, // Resize to 64x64 pixels
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
        // Display the screenshot image
        const screenshotContainer = document.getElementById('screenshot-container');
        // Compress and resize the image
        const compressedImageSrc = await compressImage(event.data, 448);

        screenshotContainer.innerHTML = `<img src="${compressedImageSrc}" style="width: 100%; border: 1px solid #ddd;">`;

        // event.data.style.width = '400px';
        // event.data.style.height = '400px';
        // screenshotContainer.appendChild(event.data)

        // Send the image to the WebSocket server
        // Compress and resize the image before sending to the server
        // const compressedImageSrc = await compressImage(event.data);
        sendImageToServer(compressedImageSrc);
        console.log('called server')
    }
});
function sendImageToServer(imageSrc) {
    console.log('img size:', imageSrc)
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
    }
}

// function displayNextImage() {
//     if (imageQueue.length > 0) {
//         isImageBeingProcessed = true;
//         let processedFrame = document.getElementById('processed-frame');

//         if (!processedFrame) {
//             processedFrame = document.createElement('img');
//             processedFrame.id = 'processed-frame';
//             processedFrame.style.width = '400px';
//             processedFrame.style.height = '400px';
//             processedContainer.appendChild(processedFrame);
//         }

//         processedFrame.onload = function () {
//             isImageBeingProcessed = false;
//             imageQueue.shift();
//             if (imageQueue.length > 0) {
//                 displayNextImage(); // Display the next image in the queue
//             }
//         };

//         processedFrame.src = imageQueue[0];
//     }
// }



