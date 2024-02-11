//don't change
let genP5;
// let buffer; // Declare the buffer
//don't change

let circleX = 50;
let circleY = 200;
let circleSpeedX = 2;
let rectX = 200;
let rectY = 100;
let rectSpeedY = 1;
var ranges;
let seed = Math.random() * 12;
let colors1 = "fef9fb-fafdff-ffffff-fcfbf4-f9f8f6".split("-").map((a) => "#" + a);
let colors2 = "8c75ff-c553d2-2dfd60-2788f5-23054f-f21252-8834f1-c4dd92-184fd3-f9fee2-2E294E-541388-F1E9DA-FFD400-D90368-e9baaa-ffa07a-164555-ffe1d0-acd9e7-4596c7-6d8370-e45240-21d3a4-3303f9-cd2220-173df6-244ca8-a00360-b31016".split("-").map((a) => "#" + a);
let color1, color2;


function setup() {

    //don't change
    genP5 = new GenP5();
    //don't change
  
    pixelDensity(1);
    randomSeed(seed);
    background("#202020");
    buffer = createGraphics(400,400);
    buffer.background("#202020"); // Set the buffer background color

    buffer2 = createGraphics(400,400);
    buffer2.background("#202020"); // Set the buffer background color

    buffer3 = createGraphics(400,400);
    buffer3.background("#202020"); // Set the buffer background color

    ranges = 50;
    color1 = random(colors1);
    color2 = random(colors2);

    for (let y = 0; y < height/1.5; y++) {
        stroke(random(colors2));   
        line(0, y, width, y)
    }
  
}

let a = 0;
let boatX = 0;

function draw() {
        buffer2.clear();
        buffer2.background("#202020");
        buffer2.fill('white');
        buffer2.ellipse(200, (frameCount % buffer.height * 2), 100, 100); // Vertical movement within buffer

        // Start block 
        seed = 100
        blendMode(DIFFERENCE);
        noFill();
        strokeWeight(5);
        a = a + .01  
        for (let i = 0; i < ranges; i++) {
            buffer.noFill();
            buffer.stroke(color2);
            buffer.drawingContext.shadowColor = random(colors1);
            buffer.drawingContext.shadowOffsetX = 1;
            buffer.drawingContext.shadowOffsetY = 1;
            buffer.drawingContext.shadowBlur = 0;
            buffer.beginShape();
            for (let x = -100; x < width + 200; x += 100) {
                let n = noise(x * 0.001 + a, i * 0.01 + a, x * 0.02 + a);
                let y = map(n, 0, 1, 0, height * 1)
                buffer.curveVertex(x, y + a * 50);
            }
            buffer.endShape();
        }

        // Draw boat
        buffer3.clear();
        buffer3.background("#202020");
        buffer3.fill("yellow"); // White color for boat
        buffer3.strokeWeight(2);
        buffer3.stroke("#000000"); // Black color for boat outline
        buffer3.beginShape();
        buffer3.vertex(boatX, 150); // Bottom-left corner
        buffer3.vertex(boatX + 50, 150); // Bottom-right corner
        buffer3.vertex(boatX + 25, 100); // Top-middle corner
        buffer3.endShape(CLOSE); // Close the shape

        boatX += 1; // Move boat horizontally

        if (boatX > buffer3.width) { // If boat goes out of buffer, reset its position
            boatX = -50;
        }


        // End block

    
        if (frameCount % 20 === 0) {
            
            genP5.stylize('boat on the ocean', 0.75, buffer3,canvas, 0);

            genP5.stylize('sea waves', 0.72, buffer,canvas, 1);

            genP5.stylize('moon', 0.8, buffer2,canvas, 2);
        }
}