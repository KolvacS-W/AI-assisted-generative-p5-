class GenP5 {
    constructor(resize = 448) {
        this.screenshotImageCounter = 0;
        this.blockImageCounter = 0;
        this.processedImageCounter = 0;
        this.finalImageCounter = 0;
        this.Strengthlist = [];
        this.Promptlist = [];
        this.resize = resize;
        this.imagedisplaytime = 100;

        this.screenshotQueue = [];
        this.fullscreenshotQueue = [];
        this.blockQueue = [];
        this.processedQueue = [];
        this.finalQueue = [];

        this.displayingScreenshot = false;
        this.displayingBlock = false;
        this.displayingProcessed = false;
        this.displayingFinal = false;

        this.ws = null;
      
        // Close the WebSocket connection when the window is unloaded or closed
        window.addEventListener('beforeunload', () => {
            this.closeWebSocket();
        });
      
        this.connect();
        this.clearsavedimages();
        // Initialize slider event listener
        this.initSliderListener();

    }

    connect() {
        this.ws = new WebSocket('ws://localhost:3001');
        this.ws.onopen = () => console.log("Connected to WebSocket server");
        this.ws.onmessage = (event) => this.handleServerMessage(event);
        this.ws.onclose = () => console.log("WebSocket connection closed");
        this.ws.onerror = (error) => console.error("WebSocket error:", error);
    }
  
      closeWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close();
        }
    }
  
    initSliderListener() {
        const slider = document.getElementById('image-slider');
        if (slider) {
            slider.addEventListener('input', () => this.displayImageBasedOnSlider());
        }
    }

    stylize(prompt, strength, buffer, canvas) {
        this.Strengthlist.push(strength)
        this.Promptlist.push(prompt)
        const outBlockImage = this.getOutBlockImage(canvas);
        this.fullscreenshotQueue.push(outBlockImage);
        this.queueDisplayImage(outBlockImage, 'screenshot', this.screenshotImageCounter);

        const blockImage = this.getBlockImage(buffer);
        this.queueDisplayImage(blockImage, 'block', this.blockImageCounter);
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
            // console.log('server data:')
            console.log(data)
            if (data && data.result.images && data.result.images.length > 0) {
                const processedImageUrl = data.result.images[0].url;
                this.queueDisplayImage(processedImageUrl, 'processed', data.count);

                this.createAndDisplayFinalImage(processedImageUrl, data.count);
            }
        
    }

    sendImageToServer(imageUrl, count) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                image_url: imageUrl,
                strength: this.Strengthlist[0],
                prompt: this.Promptlist[0],
                count: count,
                request_id:count.toString()
            }));
        }
    }

    queueDisplayImage(imageSrc, type, count) {
        const queue = this[`${type}Queue`];
        queue.push({ imageSrc, count });
        this.processDisplayQueue(type);
    }

    processDisplayQueue(type) {
        const queue = this[`${type}Queue`];
        const currentlyDisplayingFlag = `displaying${type.charAt(0).toUpperCase() + type.slice(1)}`;

        if (queue.length > 0 && !this[currentlyDisplayingFlag]) {
            this[currentlyDisplayingFlag] = true;
            const { imageSrc, count } = queue.shift();
            this.compressAndDisplayImage(imageSrc, type, count);
        }
    }


    compressAndDisplayImage(imageSrc, type, count) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.resize;
            canvas.height = this.resize;
            ctx.drawImage(img, 0, 0, this.resize, this.resize);

            const dataUrl = canvas.toDataURL('image/jpeg');
            this.displayImage(dataUrl, type, count);
        };
        img.onerror = (error) => console.error('Error loading image:', error);
        img.src = imageSrc;
    }

    displayImage(imageUrl, type, count) {
        const container = document.getElementById(`${type}-container`);
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

            // Set a timeout to ensure the image is displayed for at least 3 seconds
            setTimeout(() => {
                const currentlyDisplayingFlag = `displaying${type.charAt(0).toUpperCase() + type.slice(1)}`;
                this[currentlyDisplayingFlag] = false;
                this.processDisplayQueue(type);
                if (type == 'block') {
                    this[`${type}ImageCounter`] += 1;
                    // console.log('sent,', this.blockImageCounter)
                    this.sendImageToServer(imageUrl, this.blockImageCounter);
                    count = this[`${type}ImageCounter`];
                } else if (type == 'screenshot') {
                    this[`${type}ImageCounter`] += 1;
                    count = this[`${type}ImageCounter`];
                }
                        
                overlay.innerHTML = `Frame: ${count} | Strength: ${this.Strengthlist[0].toFixed(2)} | Prompt: ${this.Promptlist[0]}`;
                
            }, this.imagedisplaytime); // Change 3000 to your desired minimum display time in milliseconds

          
        };

        img.onerror = (error) => console.error('Error loading image:', error);
        img.src = imageUrl;
    }


      createAndDisplayFinalImage(processedUrl, count) {
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
                this.queueDisplayImage(finalImageUrl, 'final', count);
                this.saveProcessedImage(finalImageUrl, count);
                // this.displayImageBasedOnSlider();
            };

            processedImg.onerror = () => {
                console.error('Error loading processed image');
                this.displayingFinal = false;
                this.processDisplayQueue('final');
            };

            processedImg.src = processedUrl;
        };

        screenshotImg.onerror = () => {
            console.error('Error loading screenshot image');
            this.displayingFinal = false;
            this.processDisplayQueue('final');
        };
      
        // console.log('check queue', this.fullscreenshotQueue.length)
        // console.log('check count', count)

        screenshotImg.src = this.fullscreenshotQueue[count];
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
  
    saveProcessedImage(imageUrl, count) {
      fetch('http://localhost:3001/save-image', {  // Use the correct server URL
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl, count: count })
      }).then(response => response.json())
        .then(data => console.log(data))
        .catch(error => console.error('Error:', error));
  }
  
  clearsavedimages() {
    // Call to clear the images on the server
    fetch('http://localhost:3001/clear-images')
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
  }
  
  displayImageBasedOnSlider() {
    const slider = document.getElementById('image-slider');
    const imageDisplayContainer = document.getElementById('image-display-container');

    fetch('http://localhost:3001/get-smallest-image-number')
        .then(response => response.json())
        .then(data => {
            const smallestImageNumber = data.minNumber;
            const adjustedImageIndex = parseInt(slider.value) + smallestImageNumber;

            const imageUrl = `http://localhost:3001/saved_images/image_${adjustedImageIndex}.jpg`;
            imageDisplayContainer.innerHTML = `<img src="${imageUrl}" alt="Saved Image" style="width: 100%; height: auto;">`;
        })
        .catch(error => {
            console.error('Error:', error);
            imageDisplayContainer.innerHTML = `<p>Error loading image.</p>`;
        });
  }
}
