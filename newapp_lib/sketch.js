let appRunning = false; // Flag to track the state of the application
let genP5;
let circleX = 50;
let circleY = 200;
let circleSpeedX = 2;

let rectX = 200;
let rectY = 100;
let rectSpeedY = 1;

let buffer; // Declare the buffer

function setup() {
  createCanvas(400, 400);
  genP5 = new GenP5();
  genP5.connect();
  
  // Create a buffer with the same dimensions as the canvas
  buffer = createGraphics(width, height);

      // Get the start/stop button and add a click event listener to it
      const startStopBtn = document.getElementById('start-stop-btn');
      startStopBtn.addEventListener('click', function() {
          appRunning = !appRunning; // Toggle the app running state
  
          if (appRunning) {
              startStopBtn.textContent = 'Stop'; // Change button text to 'Stop'
              loop(); // Start the draw loop if it was previously stopped
          } else {
              startStopBtn.textContent = 'Start'; // Change button text to 'Start'
              noLoop(); // Stop the draw loop to pause the application
          }
  
          // If you have a function in genP5lib.js to start/stop the application logic, call it here
          // For example: genP5.toggleAppRunningState(appRunning);
      });
  
      noLoop(); // Initially stop the draw loop until the start button is pressed
}

function draw() {
    if (appRunning) {
        // Application logic goes here
        // Your drawing code here
        background('wheat');

        // Moving red circle in the background
        fill(255, 0, 0);
        ellipse(circleX, circleY, 50, 50);

        // Draw the purple rectangle on the buffer
        buffer.background('wheat'); // Clear the buffer
        buffer.fill(128, 0, 128);
        buffer.rect(rectX, rectY, 80, 40);

        // Draw the buffer on the main canvas
        //   image(buffer, 0, 0);

        // Update circle and rectangle positions
        circleX += circleSpeedX;
        rectY += rectSpeedY;

        // Check for boundaries and reverse direction
        if (circleX > width || circleX < 0) {
            circleSpeedX *= -1;
        }

        if (rectY > height || rectY < 0) {
            rectSpeedY *= -1;
        }

        // Example condition to stylize and process the frame
        if (frameCount % 20 === 0) { // For example, every 60 frames
            genP5.stylize(getOutBlockImage, getBlockImage);
        }
    }

}

// Function to capture buffer content as an image
function getBlockImage() {
  // Capture only the buffer content (rectangle)
  let blockImage = createImage(buffer.width, buffer.height);
  blockImage.copy(buffer, 0, 0, buffer.width, buffer.height, 0, 0, buffer.width, buffer.height);
  return blockImage.canvas.toDataURL('image/jpeg', 0.5);
}

// Function to capture the main canvas content as an image (excluding buffer)
function getOutBlockImage() {
  buffer.hide();
  let outBlockImage = canvas.toDataURL('image/jpeg', 0.5);
  buffer.show();
  return outBlockImage;
}
