
import * as fal from '@fal-ai/serverless-client';

fal.config({
    credentials: '0d7a9a57-75ff-46f6-a0a0-f54825f75c0d:c908351860b12a4618f8e58fd97a0e70',
  });

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

window.addEventListener('message', function(event) {
    if (event.data) {
        const frameContainer = document.getElementById('frame-container');
        frameContainer.innerHTML = `<img src="${event.data}" style="width: 100%; border: 1px solid #ddd;">`;
    }
});

window.addEventListener('message', async function(event) {
    if (event.data) {
        const frameContainer = document.getElementById('frame-container');
        frameContainer.innerHTML = `<img src="${event.data}" style="width: 100%; border: 1px solid #ddd;">`;

        const result = await fal.subscribe("110602490-lcm", {
            input: {
              image_url: event.data,
              prompt: 'realistic sweaters'
            },
            logs: true,
            onQueueUpdate: (update) => {
              if (update.status === "IN_PROGRESS") {
                update.logs.map((log) => log.message).forEach(console.log);
              }
            },
          });
        
          console.log(result);
        
          if (!result || !result.images || result.images.length === 0) {
            console.error('No image returned from FAL API');
            return;
          }
    }
});

// window.addEventListener('message', async function(event) {
//     if (event.data) {
//         const frameContainer = document.getElementById('frame-container');
//         frameContainer.innerHTML = `<img src="${event.data}" style="width: 100%; border: 1px solid #ddd;">`;

//         try {
//             // Call your serverless function or backend route
//             // const response = await fetch('/process-image', {
//             //     method: 'POST',
//             //     headers: {
//             //         'Content-Type': 'application/json'
//             //     },
//             //     body: JSON.stringify({ imageUrl: event.data, prompt: 'Your Prompt Here' })
//             // });

//             const result = await fal.run("110602490-lcm-sd15-i2i", {
//                 input: {
//                   image_url: event.data,
//                   prompt: 'abstract water color paint'
//                 }
//               });


//             // Display the processed image
//             const processedFrame = document.getElementById('processed-frame');
//             processedFrame.src = result.processedImageUrl;
//         } catch (error) {
//             console.error('Error processing image:', error);
//         }
//     }
// });
