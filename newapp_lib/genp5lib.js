class GenP5 {
    constructor(resize = 448) {
        this.screenshotCounter = 0;
        this.blockImageCounter = 0;
        this.processedImageCounter = 0;
        this.finalImageCounter = 0;
        this.currentStrength = 0.75;
        this.currentPrompt = "watercolor paint drops";
        this.resize = resize;

        this.screenshotImageUrls = [];
        this.blockImageUrls = [];
        this.processedImageUrls = [];
        this.finalImageUrls = [];

        this.displayQueue = [];
        this.currentlyDisplaying = false;

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
        this.screenshotImageUrls.push(outBlockImage);
        this.queueDisplayImage(outBlockImage, 'screenshot', ++this.screenshotCounter, this.currentStrength, this.currentPrompt);

        const blockImage = this.getBlockImage(buffer);
        this.blockImageUrls.push(blockImage);
        this.queueDisplayImage(blockImage, 'block', ++this.blockImageCounter, this.currentStrength, this.currentPrompt);

        this.sendImageToServer(blockImage);
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
            const processedImageUrl = data.images[0].url;
            this.processedImageUrls.push(processedImageUrl);
            this.queueDisplayImage(processedImageUrl, 'processed', ++this.processedImageCounter, this.currentStrength, this.currentPrompt);

            this.queueCreateAndDisplayFinalImage(this.screenshotImageUrls[this.screenshotCounter - 1], processedImageUrl, ++this.finalImageCounter);
            this.processDisplayQueue();
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

    queueDisplayImage(imageSrc, containerId, count, strength, prompt) {
        this.displayQueue.push(() => this.compressAndDisplayImage(imageSrc, containerId, count, strength, prompt));
    }

    compressAndDisplayImage(imageSrc, containerId, count, strength, prompt) {
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
            } catch (error) {
                console.error('Error converting canvas to DataURL:', error);
            }
        };
        img.onerror = (error) => {
            console.error('Error loading image:', error);
        };
        img.src = imageSrc;
    }

    displayImage(imageUrl, containerId, count, strength, prompt) {
        const container = document.getElementById(`${containerId}-container`);
        let img = container.querySelector('img');
        let overlay = container.querySelector('.overlay');

        if (!img) {
            img = document.createElement('img');
            img.style.width = '100%';
            img.style.height = 'auto';
            container.appendChild(img);
        }
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'overlay';
            container.appendChild(overlay);
        }

        img.onload = () => {
            // Move the processDisplayQueue call inside img.onload
            // This ensures the next image is not processed until the current one has finished loading
            this.currentlyDisplaying = false; // Set to false when the current image is fully loaded
            this.processDisplayQueue(); // Trigger processing the next item in the queue
        };

        img.src = imageUrl; // Set src after defining onload to ensure the event is captured
        overlay.innerHTML = `Frame: ${count} | Strength: ${strength.toFixed(2)} | Prompt: ${prompt}`;
    }

    processDisplayQueue() {
        if (this.displayQueue.length > 0 && !this.currentlyDisplaying) {
            this.currentlyDisplaying = true; // Set to true when starting to display an image
            const displayTask = this.displayQueue.shift(); // Get the next task from the queue
            displayTask(); // Execute the task
        }
    }

    queueCreateAndDisplayFinalImage(screenshotUrl, processedUrl, count) {
        this.displayQueue.push(() => this.createAndDisplayFinalImage(screenshotUrl, processedUrl, count));
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
                    let distance = Math.sqrt((r - backgroundColor.r) ** 2 + (g - backgroundColor.g) ** 2 + (b - backgroundColor.b) ** 2);

                    if (distance <= colorThreshold) {
                        imageData.data[i + 3] = 0;
                    }
                }

                processedCtx.putImageData(imageData, 0, 0);
                ctx.drawImage(processedCanvas, 0, 0, this.resize, this.resize);

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
