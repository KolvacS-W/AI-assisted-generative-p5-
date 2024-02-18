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
let buffer1, buffer2, buffer3;
let storedframes = [];
let drops = [];

function setup() {

    //don't change
    genP5 = new GenP5();
    //don't change
  
    pixelDensity(1);
    randomSeed(seed);
    background("#202020");

    //create buffers
    [buffer1, buffer2] = genP5.createstylizebuffers(2, 'black', 400);
    
    [buffer3] = genP5.createp5contentbuffers(1, 400);
  
    ranges = 50;
    color1 = random(colors1);
    color2 = random(colors2);
  
  genP5.createseparateBackgroundCanvas(100, storedframes)
  
  for (let i = 0; i < 100; i++) { // Create 100 raindrops
    drops.push({
      x: random(width), // Random x-coordinate within canvas width
      y: random(0, 400), // Random y-coordinate above the canvas
      speed: random(2, 5), // Random falling speed
      length: random(10, 20), // Random length of the raindrop
      thickness: random(0.2, 0.5) // Random thickness of the raindrop
    });
  }
  
}

let a = 2;
let boatX = 0;

function draw() {
        buffer1.clear();
        buffer1.background("#202020");
        buffer1.fill('white');
        buffer1.ellipse(200, (frameCount % buffer1.height * 2), 100, 100); // Vertical movement within buffer

        // Start block 
        seed = 100
        blendMode(DIFFERENCE);
        noFill();
        strokeWeight(5);
        a = a + .01  
        for (let i = 0; i < ranges; i++) {
            buffer2.noFill();
            buffer2.stroke(color2);
            buffer2.drawingContext.shadowColor = random(colors1);
            buffer2.drawingContext.shadowOffsetX = 1;
            buffer2.drawingContext.shadowOffsetY = 1;
            buffer2.drawingContext.shadowBlur = 0;
            buffer2.beginShape();
            for (let x = -100; x < width + 200; x += 100) {
                let n = noise(x * 0.001 + a, i * 0.01 + a, x * 0.02 + a);
                let y = map(n, 0, 1, 0, height * 1)
                buffer2.curveVertex(x, y + a * 50);
            }
            buffer2.endShape();
        }


      buffer3.clear()
      buffer3.stroke('white'); // Set the color of the raindrops
      for (let i = 0; i < drops.length; i++) {
        let drop = drops[i];
        drop.y += drop.speed; // Move the raindrop down by its speed
        if (drop.y > buffer3.height) {
            drop.y = random(-200, -100); // Reset y-coordinate above the canvas
            drop.x = random(buffer3.width); // Reset x-coordinate to a new random position within the width
        }
        buffer3.strokeWeight(drop.thickness); // Set the thickness of the raindrop
        buffer3.line(drop.x, drop.y, drop.x, drop.y + drop.length); // Draw the raindrop line                   
      }
  
        storedframes.push(buffer3.get()); // Store the current frame of buffer4
  
        promptlist =['realistic moon', 'sea waves']
        strengthlist = [0.9, 0.72]

        genP5.stylize_buffers([buffer1, buffer2], promptlist, strengthlist, 20, canvas);

}

