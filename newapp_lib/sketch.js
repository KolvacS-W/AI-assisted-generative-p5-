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
        background('wheat');

        fill(255, 0, 0); // Red circle
        ellipse(circleX, circleY, 50, 50);

        buffer.background('wheat');
        buffer.fill(128, 0, 128); // Purple rectangle
        buffer.rect(rectX, rectY, 80, 40);


        circleX += circleSpeedX;
        rectY += rectSpeedY;

        if (circleX > width || circleX < 0) {
            circleSpeedX *= -1;
        }

        if (rectY > height || rectY < 0) {
            rectSpeedY *= -1;
        }

        if (frameCount % 20 === 0) { // Example condition to stylize and process the frame
            genP5.stylize(buffer, canvas);
        }
    }
}
