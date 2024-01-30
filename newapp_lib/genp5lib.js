class GenP5 {
    constructor(resize = 448) {
        this.resize = resize;
        this.currentStrength = 0.75;
        this.currentPrompt = "watercolor paint drops";

        this.imageDisplayQueue = [];
        this.screenshotImageUrls = [];
        this.blockImageUrls = [];
        this.processedImageUrls = [];
        this.finalImageUrls = [];

        this.ws = null;
        this.connect();
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:3003');
        this.ws.onopen = () => console.log("Connected to WebSocket server");
        this.ws.onmessage = (event) => this.handleServerMessage(event);
        this.ws.onclose = () => console.log("WebSocket connection closed");
        this.ws.onerror = (error) => console.error("WebSocket error:", error);
    }

    stylize(buffer, canvas) {
        const outBlockImage = this.getOutBlockImage(canvas);
        this.enqueueImageDisplay(outBlockImage, 'screenshot', this.screenshotImageUrls.length + 1, this.currentStrength, this.currentPrompt);

        const blockImage = this.getBlockImage(buffer);
        this.enqueueImageDisplay(blockImage, 'block', this.blockImageUrls.length + 1, this.currentStrength, this.currentPrompt);

        this.sendImageToServer(blockImage);
    }

    getBlockImage(buffer) {
        buffer.loadPixels();
        return buffer.canvas.toDataURL('image/jpeg', 0.5);
    }

    getOutBlockImage(canvas) {
        return canvas.toDataURL('image/jpeg', 0.5);
    }

    handleServerMessage(event) {
        const data = JSON.parse(event.data);
        if (data && data.images && data.images.length > 0) {
            const processedImageUrl = data.images[0].url;
            this.enqueueImageDisplay(processedImageUrl, 'processed', this.processedImageUrls.length + 1, this.currentStrength, this.currentPrompt);
        }
    }

    sendImageToServer(imageUrl) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                image_url: imageUrl,
                strength: this.currentStrength,
                prompt: this.currentPrompt
            }));
        }
    }

    enqueueImageDisplay(imageSrc, containerId, count, strength, prompt) {
        this.imageDisplayQueue.push({ imageSrc, containerId, count, strength, prompt });

        if (this.imageDisplayQueue.length === 1) {
            this.processNextImageInQueue();
        }
    }

    processNextImageInQueue() {
        if (this.imageDisplayQueue.length === 0) return;

        const { imageSrc, containerId, count, strength, prompt } = this.imageDisplayQueue[0];

        this.compressAndDisplayImage(imageSrc, containerId, count, strength, prompt, () => {
            this.imageDisplayQueue.shift();
            this.processNextImageInQueue();
        });
    }

    compressAndDisplayImage(imageSrc, containerId, count, strength, prompt, callback) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.resize;
            canvas.height = this.resize;
            ctx.drawImage(img, 0, 0, this.resize, this.resize);

            try {
                const dataUrl = canvas.toDataURL('image/jpeg');
                this.displayImage(dataUrl, containerId, count, strength, prompt);
                this.storeImageUrl(dataUrl, containerId, count);
                callback();
            } catch (error) {
                console.error('Error converting canvas to DataURL:', error);
                callback();
            }
        };
        img.onerror = (error) => {
            console.error('Error loading image:', error);
            callback();
        };
        img.src = imageSrc;
    }

    displayImage(imageUrl, containerId, count, strength, prompt) {
        const container = document.getElementById(`${containerId}-container`);
        container.innerHTML = `<img src="${imageUrl}" style="width:100%; height:auto;">
                               <div class="overlay">Frame: ${count} | Strength: ${strength} | Prompt: ${prompt}</div>`;
    }

    storeImageUrl(imageUrl, containerId, count) {
        switch (containerId) {
            case 'screenshot':
                this.screenshotImageUrls[count - 1] = imageUrl;
                break;
            case 'block':
                this.blockImageUrls[count - 1] = imageUrl;
                break;
            case 'processed':
                this.processedImageUrls[count - 1] = imageUrl;
                this.createAndDisplayFinalImage(this.screenshotImageUrls[count - 1], imageUrl, count);
                break;
            default:
                break;
        }
    }



    createAndDisplayFinalImage(screenshotUrl, processedUrl, count) {
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const screenshotImg = new Image();
        const processedImg = new Image();
    
        // Set crossOrigin to "anonymous" to request CORS-safe images
        screenshotImg.crossOrigin = "anonymous";
        processedImg.crossOrigin = "anonymous";
    
        screenshotImg.onload = () => {
            finalCanvas.width = this.resize; // Set canvas size
            finalCanvas.height = this.resize; // Set canvas size
    
            // Draw screenshot image on canvas
            ctx.drawImage(screenshotImg, 0, 0, this.resize, this.resize);
    
            processedImg.onload = () => {
                // Create a separate canvas for the processed image to manipulate it
                const processedCanvas = document.createElement('canvas');
                const processedCtx = processedCanvas.getContext('2d');
                processedCanvas.width = this.resize; // Match size with the final canvas
                processedCanvas.height = this.resize; // Match size with the final canvas
    
                // Draw processed image on its canvas
                processedCtx.drawImage(processedImg, 0, 0, this.resize, this.resize);
    
                // Get image data for pixel manipulation
                const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
                const backgroundColor = this.findMostFrequentColor(imageData);
    
                // Set a color threshold for segmentation
                const colorThreshold = 30;
    
                // Iterate over all pixels to make the background transparent
                for (let i = 0; i < imageData.data.length; i += 4) {
                    let r = imageData.data[i];
                    let g = imageData.data[i + 1];
                    let b = imageData.data[i + 2];
                    let distance = Math.sqrt(
                        Math.pow(r - backgroundColor.r, 2) +
                        Math.pow(g - backgroundColor.g, 2) +
                        Math.pow(b - backgroundColor.b, 2)
                    );
    
                    // If the pixel color is within the threshold, make it transparent
                    if (distance <= colorThreshold) {
                        imageData.data[i + 3] = 0;
                    }
                }
    
                // Put the manipulated image data back onto the processed canvas
                processedCtx.putImageData(imageData, 0, 0);
    
                // Draw the processed image on top of the screenshot on the final canvas
                ctx.drawImage(processedCanvas, 0, 0, this.resize, this.resize);
    
                // Convert the final canvas to a data URL and display it
                const finalImageUrl = finalCanvas.toDataURL('image/jpeg');
                this.finalImageUrls.push(finalImageUrl);
                this.displayImage(finalImageUrl, 'final', count, this.currentStrength, this.currentPrompt);
            };
    
            processedImg.src = processedUrl;
        };
    
        screenshotImg.src = screenshotUrl;
    }
    
    findMostFrequentColor(imageData) {
        let colorCount = {};
        let maxCount = 0;
        let dominantColor = { r: 0, g: 0, b: 0 };
    
        for (let i = 0; i < imageData.data.length; i += 4) {
            let r = imageData.data[i];
            let g = imageData.data[i + 1];
            let b = imageData.data[i + 2];
            let rgbString = `${r},${g},${b}`;
    
            colorCount[rgbString] = (colorCount[rgbString] || 0) + 1;
    
            if (colorCount[rgbString] > maxCount) {
                maxCount = colorCount[rgbString];
                dominantColor = { r, g, b };
            }
        }
    
        return dominantColor;
    }
}
