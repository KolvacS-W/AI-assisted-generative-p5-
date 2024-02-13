class GenP5 {
    constructor(resize = 448) {
        this.buffers = [];
        this.setupCanvas();
        this.resize = resize;
        this.imagedisplaytime = 1000;
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
  
    setupCanvas() {
        // This function is called within the constructor to set up the p5.js canvas
        const canvas = createCanvas(400, 400); // Create a p5.js canvas of 400x400 pixels
        canvas.parent('p5-container'); // Set the parent of the canvas to the HTML element with id 'p5-container'

        // Additional canvas setup code can go here if needed
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:3001');
        this.ws.onopen = () => console.log("Connected to WebSocket server");
        this.ws.onmessage = (event) => this.handleServerMessage(event);
        this.ws.onclose = () => console.log("WebSocket connection closed");
        this.ws.onerror = (error) => console.error("WebSocket error:", error);
    }
  
      closeWebSocket() {
        console.log('close connection to server')
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

  
    stylize(prompt, strength, buffer, canvas, bufferIndex) {
        this.ensureBuffer(bufferIndex, buffer, prompt, strength);
        // console.log('stylize1')
        // console.log(this.buffers[0])

        // console.log('stylize')
        // console.log(this.buffers[0])

        const blockImage = this.buffers[bufferIndex].buffer.canvas.toDataURL('image/jpeg', 0.5);
        this.queueDisplayImage(blockImage, 'block', this.buffers[bufferIndex].blockImageCounter, bufferIndex);

        const outBlockImage = canvas.toDataURL('image/jpeg', 0.5);
        this.queueDisplayImage(outBlockImage, 'screenshot', this.buffers[bufferIndex].screenshotImageCounter, bufferIndex);
        
        this.buffers[bufferIndex].fullscreenshotQueue.push(outBlockImage);
        
    }
  
      ensureBuffer(bufferIndex, buffer,prompt, strength) {
        if (!this.buffers[bufferIndex]) {
            this.buffers[bufferIndex] = {
            buffer:buffer,
            screenshotImageCounter:  0,
            blockImageCounter : 0,
            processedImageCounter : 0,
            finalImageCounter:  0,
            Strengthlist : [strength],
            Promptlist:  [prompt],

            screenshotQueue:  [],
            fullscreenshotQueue:  [],
            blockQueue:  [],
            processedQueue:  [],
            finalQueue:  [],
            fullprocessedQueue: [],

            displayingScreenshot:  false,
            displayingBlock : false,
            displayingProcessed : false,
            displayingFinal : false,
            };
        }
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
            console.log('server data:')
            // console.log(data.result)
            if (data && data.result.images && data.result.images.length > 0) {
                const processedImageUrl = data.result.images[0].url;
                const bufferIndex = parseInt(data.result.request_id.split('_')[0]);
                this.queueDisplayImage(processedImageUrl, 'processed', data.count, bufferIndex);

                this.buffers[bufferIndex].fullprocessedQueue.push(processedImageUrl);

                this.createAndDisplayFinalImage(processedImageUrl, data.count, bufferIndex);
            }
        
    }

    sendImageToServer(imageUrl, count, bufferIndex) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                image_url: imageUrl,
                strength: this.buffers[bufferIndex].Strengthlist[0],
                prompt: this.buffers[bufferIndex].Promptlist[0],
                count: count,
                request_id:bufferIndex.toString()+'_'+count.toString()
            }));
        }
    }

    queueDisplayImage(imageSrc, type, count, bufferIndex) {
        const bufferData = this.buffers[bufferIndex];
        const queue = bufferData[`${type}Queue`];
        queue.push({ imageSrc, count });
        this.processDisplayQueue(type, bufferIndex);
    }

    processDisplayQueue(type, bufferIndex) {
        const bufferData = this.buffers[bufferIndex];
        const queue = bufferData[`${type}Queue`];
        const currentlyDisplayingFlag = `displaying${type.charAt(0).toUpperCase() + type.slice(1)}`;

        if (queue.length > 0 && !this.buffers[bufferIndex][currentlyDisplayingFlag]) {
            this.buffers[bufferIndex][currentlyDisplayingFlag] = true;
            const { imageSrc, count } = queue.shift();
            this.compressAndDisplayImage(imageSrc, type, count, bufferIndex);
        }
    }


    compressAndDisplayImage(imageSrc, type, count, bufferIndex) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.resize;
            canvas.height = this.resize;
            ctx.drawImage(img, 0, 0, this.resize, this.resize);

            const dataUrl = canvas.toDataURL('image/jpeg');
            this.displayImage(dataUrl, type, count, bufferIndex);
        };
        img.onerror = (error) => console.error('Error loading image:', error);
        img.src = imageSrc;
    }

    displayImage(imageUrl, type, count, bufferIndex) {
        const container = document.getElementById(`${type}-container-${bufferIndex}`);
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
            const bufferData = this.buffers[bufferIndex];
            // Set a timeout to ensure the image is displayed for at least 3 seconds
            setTimeout(() => {
                bufferData[`displaying${type.charAt(0).toUpperCase() + type.slice(1)}`]= false;
                
                this.processDisplayQueue(type, bufferIndex);
                if (type == 'block') {
                    this.buffers[bufferIndex][`${type}ImageCounter`] += 1;
                    // console.log('sent,', this.blockImageCounter)
                    this.sendImageToServer(imageUrl, this.buffers[bufferIndex].blockImageCounter, bufferIndex);
                    count = this.buffers[bufferIndex][`${type}ImageCounter`];
                } else if (type == 'screenshot') {
                    this.buffers[bufferIndex][`${type}ImageCounter`] += 1;
                    count = this.buffers[bufferIndex][`${type}ImageCounter`];
                }
                        
                overlay.innerHTML = `Frame: ${count} | Strength: ${this.buffers[bufferIndex].Strengthlist[0].toFixed(2)} | Prompt: ${this.buffers[bufferIndex].Promptlist[0]}`;
                
            }, this.imagedisplaytime); // Change 3000 to your desired minimum display time in milliseconds

          
        };

        img.onerror = (error) => console.error('Error loading image:', error);
        img.src = imageUrl;
    }

    createAndDisplayFinalImage(processedUrl, count, bufferIndex) {
        // Check if all processedQueue in this.buffers have the image with bufferIndex
        // console.log('---')
        for (const buffer of this.buffers) {
            // console.log('iterate:', buffer.fullprocessedQueue.length)
            if (!buffer.fullprocessedQueue[bufferIndex]) {
                // If any processedQueue doesn't have an image at bufferIndex, return directly
                console.error('Not all buffers contain an image at the specified bufferIndex');
                // console.log('img:', bufferIndex, count)
                return;
            }
        }
    
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        const screenshotImg = new Image();
    
        screenshotImg.crossOrigin = "anonymous";
    
        screenshotImg.onload = () => {
            finalCanvas.width = this.resize;
            finalCanvas.height = this.resize;
            ctx.drawImage(screenshotImg, 0, 0, this.resize, this.resize);
    
            // Function to process and overlay each processed image
            const overlayProcessedImages = (index) => {
                if (index >= this.buffers.length) {
                    const finalImageUrl = finalCanvas.toDataURL('image/jpeg');
                    
                    //always put the finalimages in the queue of the first buffer, because we need to fix the list
                    this.queueDisplayImage(finalImageUrl, 'final', count, bufferIndex=0);
                    this.saveProcessedImage(finalImageUrl, count);
                    return;
                }
    
                const processedImg = new Image();
                processedImg.crossOrigin = "anonymous";
                processedImg.onload = () => {
                    const processedCanvas = document.createElement('canvas');
                    const processedCtx = processedCanvas.getContext('2d');
                    processedCanvas.width = this.resize;
                    processedCanvas.height = this.resize;
    
                    processedCtx.drawImage(processedImg, 0, 0, this.resize, this.resize);
                    const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
                    const backgroundColor = this.findMostFrequentColor(imageData);
    
                    const colorThreshold = 30; // Adjust as needed
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        let r = imageData.data[i];
                        let g = imageData.data[i + 1];
                        let b = imageData.data[i + 2];
                        let distance = Math.sqrt((r - backgroundColor.r) ** 2 + (g - backgroundColor.g) ** 2 + (b - backgroundColor.b) ** 2);
    
                        if (distance <= colorThreshold) {
                            imageData.data[i + 3] = 0; // Make this pixel transparent
                        }
                    }
    
                    processedCtx.putImageData(imageData, 0, 0);
                    ctx.drawImage(processedCanvas, 0, 0, this.resize, this.resize);
                    overlayProcessedImages(index + 1); // Proceed to next image
                };
                processedImg.onerror = () => {
                    console.error(`Error loading processed image from buffer ${index}`);
                    console.log(count)
                    console.log(this.buffers[index].fullprocessedQueue.length)
                };
                processedImg.src = this.buffers[index].fullprocessedQueue[count-1];
            };
    
            // Start overlaying processed images
            overlayProcessedImages(0);
        };
    
        screenshotImg.onerror = () => {
            console.error('Error loading screenshot image');
            this.displayingFinal = false;
            this.processDisplayQueue('final');
        };
    
        screenshotImg.src = this.buffers[bufferIndex].fullscreenshotQueue[count-1];
    }

    //   createAndDisplayFinalImage(processedUrl, count, bufferIndex) {
    //     const finalCanvas = document.createElement('canvas');
    //     const ctx = finalCanvas.getContext('2d');
    //     const screenshotImg = new Image();
    //     const processedImg = new Image();

    //     screenshotImg.crossOrigin = "anonymous";
    //     processedImg.crossOrigin = "anonymous";

    //     screenshotImg.onload = () => {
    //         finalCanvas.width = this.resize;
    //         finalCanvas.height = this.resize;
    //         ctx.drawImage(screenshotImg, 0, 0, this.resize, this.resize);

    //         processedImg.onload = () => {
    //             const processedCanvas = document.createElement('canvas');
    //             const processedCtx = processedCanvas.getContext('2d');
    //             processedCanvas.width = this.resize;
    //             processedCanvas.height = this.resize;

    //             processedCtx.drawImage(processedImg, 0, 0, this.resize, this.resize);

    //             const imageData = processedCtx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
    //             const backgroundColor = this.findMostFrequentColor(imageData);

    //             const colorThreshold = 30;
    //             for (let i = 0; i < imageData.data.length; i += 4) {
    //                 let r = imageData.data[i];
    //                 let g = imageData.data[i + 1];
    //                 let b = imageData.data[i + 2];
    //                 let distance = Math.sqrt((r - backgroundColor.r) ** 2 + (g - backgroundColor.g) ** 2 + (b - backgroundColor.b) ** 2);

    //                 if (distance <= colorThreshold) {
    //                     imageData.data[i + 3] = 0;
    //                 }
    //             }

    //             processedCtx.putImageData(imageData, 0, 0);
    //             ctx.drawImage(processedCanvas, 0, 0, this.resize, this.resize);

    //             const finalImageUrl = finalCanvas.toDataURL('image/jpeg');
    //             this.queueDisplayImage(finalImageUrl, 'final', count);
    //             this.saveProcessedImage(finalImageUrl, count);
    //             // this.displayImageBasedOnSlider();
    //         };

    //         processedImg.onerror = () => {
    //             console.error('Error loading processed image');
    //             this.displayingFinal = false;
    //             this.processDisplayQueue('final');
    //         };

    //         processedImg.src = processedUrl;
    //     };

    //     screenshotImg.onerror = () => {
    //         console.error('Error loading screenshot image');
    //         this.displayingFinal = false;
    //         this.processDisplayQueue('final');
    //     };
      
    //     // console.log('check queue', this.fullscreenshotQueue.length)
    //     // console.log('check count', count)

    //     screenshotImg.src = this.buffers[bufferIndex].fullscreenshotQueue[count];
    // }
  
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
