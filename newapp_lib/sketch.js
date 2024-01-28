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
    let canvas = createCanvas(400, 400);
    canvas.parent('p5-container'); // Ensure there's a div with id 'p5-container' in your HTML
    genP5 = new GenP5();
    genP5.connect();

    buffer = createGraphics(width, height); // Create a buffer with the same dimensions as the canvas

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
    });

    noLoop(); // Initially stop the draw loop until the start button is pressed
}

function draw() {
    if (appRunning) {
        let bgColor = 'wheat'; // default background color
        background(bgColor);
        buffer.background(bgColor); // Correctly set buffer background

        // Moving ellipse outside captureAndSave (horizontal movement)
        fill(0, 255, 0);
        ellipse((frameCount % width), 50, 80, 80); // Horizontal movement
    
        // Start block 
    
        buffer.fill(255, 0, 0);
        buffer.ellipse(200, (frameCount % buffer.height), 100, 100); // Vertical movement within buffer

        buffer.fill('purple');
        buffer.ellipse(200, (frameCount % buffer.height * 2), 100, 100); // Vertical movement within buffer
    
        // End block
    
        // Commented out the line that draws the buffer to the main canvas
        // image(buffer, 0, 0);
    
        fill('pink');
        ellipse(60, 40, 70, 80); // Static ellipse outside captureAndSave

        if (frameCount % 10 === 0) { // Example condition to stylize and process the frame
            genP5.stylize(buffer, canvas);
        }
    }
}
