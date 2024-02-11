class GenP5 {
    constructor(resize = 448) {
        // Initialize counters for each image type
        this.screenshotCounter = 0;
        this.blockImageCounter = 0;
        this.processedImageCounter = 0;
        this.finalImageCounter = 0;

        // Current settings
        this.currentStrength = 0.75;
        this.currentPrompt = "watercolor paint drops";
        this.resize = resize;

        // Separate queues for each image type
        this.screenshotQueue = [];
        this.fullscreenshotQueue = [];
        this.blockQueue = [];
        this.processedQueue = [];
        this.finalQueue = [];

        // WebSocket connection
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
        // Get and queue screenshot image for display
        const outBlockImage = this.getOutBlockImage(canvas);
        this.screenshotQueue.push(() => this.displayImage(outBlockImage, 'screenshot', ++this.screenshotCounter));
        this.fullscreenshotQueue.push(outBlockImage);

        // Get and queue block image for display
        const blockImage = this.getBlockImage(buffer);
        this.blockQueue.push(() => this.displayImage(blockImage, 'block', ++this.blockImageCounter));

        // Send block image to server for processing
        this.sendImageToServer(blockImage);

        // Process display queues
        this.processDisplayQueue();
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
            // Queue processed image for display
            const processedImageUrl = data.images[0].url;
            this.processedQueue.push(() => this.displayImage(processedImageUrl, 'processed', ++this.processedImageCounter));

            // Queue final image creation and display
            this.finalQueue.push(() => this.createAndDisplayFinalImage(this.fullscreenshotQueue[this.finalImageCounter-1], processedImageUrl, ++this.finalImageCounter));
        }

        // Continue processing display queues
        this.processDisplayQueue();
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

    displayImage(imageSrc, containerId, count) {
        const img = new Image();
        img.onload = () => {
            const container = document.getElementById(`${containerId}-container`);
            container.innerHTML = ''; // Clear previous content
            img.style.width = '100%';
            img.style.height = 'auto';
            container.appendChild(img);

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.innerHTML = `Frame: ${count} | Strength: ${this.currentStrength.toFixed(2)} | Prompt: ${this.currentPrompt}`;
            container.appendChild(overlay);

            // Continue processing next item in the queue
            this.processDisplayQueue();
        };
        img.onerror = () => console.error('Error loading image:', imageSrc);
        img.src = imageSrc;
    }

    createAndDisplayFinalImage(screenshotUrl, processedUrl, count) {
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const screenshotImg = new Image();
        const processedImg = new Image();

        screenshotImg.crossOrigin = "anonymous";
        processedImg.crossOrigin = "anonymous";

        screenshotImg.onload = () => {
            finalCanvas.width = this.resize;
            finalCanvas.height = this.resize;

            ctx.drawImage(screenshotImg, 0, 0, this.resize, this.resize);

            processedImg.onload = () => {
                const processedCanvas = document.createElement('canvas');
                const processedCtx = processedCanvas.getContext('2d');
                processedCanvas.width = this.resize;
                processedCanvas.height = this.resize;

                processedCtx.drawImage(processedImg, 0, 0, this.resize, this.resize);

                const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
                const backgroundColor = this.findMostFrequentColor(imageData);

                const colorThreshold = 30;

                for (let i = 0; i < imageData.data.length; i += 4) {
                    let r = imageData.data[i];
                    let g = imageData.data[i + 1];
                    let b = imageData.data[i + 2];
                    let distance = Math.sqrt(
                        (r - backgroundColor.r) ** 2 +
                        (g - backgroundColor.g) ** 2 +
                        (b - backgroundColor.b) ** 2
                    );

                    if (distance <= colorThreshold) {
                        imageData.data[i + 3] = 0;
                    }
                }

                processedCtx.putImageData(imageData, 0, 0);

                ctx.drawImage(processedCanvas, 0, 0, this.resize, this.resize);

                const finalImageUrl = finalCanvas.toDataURL('image/jpeg');
                this.finalQueue.push(finalImageUrl);
                this.displayImage(finalImageUrl, 'final', count);
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

    processDisplayQueue() {
        // Process screenshot queue first
        if (this.screenshotQueue.length > 0) {
            const task = this.screenshotQueue.shift();
            task();
        // Then process block queue
        } else if (this.blockQueue.length > 0) {
            const task = this.blockQueue.shift();
            task();
        // Then processed queue
        } else if (this.processedQueue.length > 0) {
            const task = this.processedQueue.shift();
            task();
        // Finally, process final queue
        } else if (this.finalQueue.length > 0) {
            const task = this.finalQueue.shift();
            task();
        }
    }
}
