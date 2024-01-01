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
const processedContainer = document.getElementById('processed-container');
let imageQueue = [];
let isImageBeingProcessed = false;

const ws = new WebSocket('ws://localhost:3002');

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


// window.addEventListener('message', async function(event) {
//     if (event.data) {
//         //screenshot images
//         const screenshotContainer = document.getElementById('frame-container');
//         screenshotContainer.innerHTML = `<img src="${event.data}" style="width: 100%; border: 1px solid #ddd;">`;

//         try {
//             const serverUrl = 'http://localhost:3001/callfal';
//             const headers = {
//                 'Content-Type': 'application/json'
//             };

//             const response = await fetch(serverUrl, {
//                 method: 'POST',
//                 headers: headers,
//                 body: JSON.stringify({ image_url: event.data, prompt: 'water color paint' }),
//             });

//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }

//             // try {
//             //     const result = JSON.parse(responseText);
//             //     // Handle the valid JSON response here.
//             // } catch (error) {
//             //     console.error("Error parsing JSON response:", error);
//             //     // Handle the JSON parsing error, e.g., show an error message to the user.
//             // }
            
//             // const processedContainer = document.getElementById('processed-container');
//             // console.log('result:', result)
//             // console.log('result:', result.images)
//             // if (result.images[0].url) {
//             //     // Display the image only if imageUrl is available
//             //     processedContainer.innerHTML = `<img src="${result.images[0].url}" style="width: 100%; border: 1px solid #ddd;">`;
//             // } else {
//             //     // Handle the case when imageUrl is undefined
//             //     console.error("Received undefined imageUrl");
//             //     processedContainer.innerHTML = `<p>Error: Image URL not received.</p>`;
//             // }

//             // // If request is accepted, start polling for the result
//             // if (result.requestId) {
//             //     pollForResult(result.requestId);
//             // }
//         } catch (error) {
//             console.error('Error sending image:', error);
//         }

        
//     }
// });

window.addEventListener('message', async function(event) {
    if (event.data) {
        // Display the screenshot image
        const screenshotContainer = document.getElementById('frame-container');
        screenshotContainer.innerHTML = `<img src="${event.data}" style="width: 100%; border: 1px solid #ddd;">`;

        // Send the image to the WebSocket server
        console.log('called server')
        sendImageToServer(event.data);
    }
});
function sendImageToServer(imageSrc) {
    const prompt = "watercolor paintings"; // Ensure this is the prompt you want to send
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ image_url: imageSrc, prompt: prompt }));
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
        setTimeout(connectWebSocket, 3002); // Try to reconnect after 3 seconds
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



