const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const socket = io();
let drawing = false;
let brushSize = 5;
let brushColor = '#000000';
let shape = 'line';
let eraserMode = false;
let bucketFillMode = false;

// Set canvas dimensions to match the viewport size
canvas.width = window.innerWidth; // Full width
canvas.height = window.innerHeight; // Full height

// Event listeners for controls
document.getElementById('brushSize').addEventListener('input', (event) => {
    brushSize = event.target.value;
});

document.getElementById('colorPicker').addEventListener('input', (event) => {
    brushColor = event.target.value;
    eraserMode = false; // Disable eraser when color is changed
});

document.getElementById('shape').addEventListener('change', (event) => {
    shape = event.target.value;
});

document.getElementById('clearCanvas').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clearCanvas');
});

document.getElementById('saveCanvas').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
});

document.getElementById('eraser').addEventListener('click', () => {
    eraserMode = !eraserMode;
    brushColor = eraserMode ? '#FFFFFF' : document.getElementById('colorPicker').value; // Set to white for eraser
});

// Bucket fill tool
document.getElementById('bucketFill').addEventListener('click', () => {
    bucketFillMode = !bucketFillMode;
});

// Mouse events for drawing
canvas.addEventListener('mousedown', (event) => {
    drawing = true;
    if (bucketFillMode) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        bucketFill(x, y);
    }
});

canvas.addEventListener('mouseup', () => {
    drawing = false;
    ctx.beginPath();
});

canvas.addEventListener('mousemove', draw);

function draw(event) {
    if (!drawing) return;

    const rect = canvas.getBoundingClientRect(); // Get canvas position
    const x = event.clientX - rect.left; // Adjust for canvas position
    const y = event.clientY - rect.top; // Adjust for canvas position

    const data = { x, y, brushSize, brushColor, shape, eraserMode };
    socket.emit('draw', data);

    if (eraserMode) {
        ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize); // Erase
    } else {
        if (shape === 'line') {
            drawLine(x, y);
        } else if (shape === 'circle') {
            drawCircle(x, y);
        } else if (shape === 'square') {
            drawSquare(x, y);
        } else if (shape === 'triangle') {
            drawTriangle(x, y);
        } else if (shape === 'rectangle') {
            drawRect(x, y);
        } else if (shape === 'ellipse') {
            drawEllipse(x, y);
        }
    }
}

// Bucket fill function
function bucketFill(x, y) {
    const targetColor = ctx.getImageData(x, y, 1, 1).data; // Get the color of the clicked pixel
    const newColor = hexToRgb(brushColor); // Convert brush color to RGB

    if (colorsMatch(targetColor, newColor)) return; // If the color is the same, do nothing

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const stack = [[x, y]]; // Stack for pixels to check
    while (stack.length) {
        const [px, py] = stack.pop();
        const index = (py * imageData.width + px) * 4;

        if (colorsMatch(pixels[index], targetColor)) {
            pixels[index] = newColor.r; // Red
            pixels[index + 1] = newColor.g; // Green
            pixels[index + 2] = newColor.b; // Blue
            pixels[index + 3] = 255; // Alpha

            // Add neighboring pixels to the stack
            stack.push([px + 1, py]);
            stack.push([px - 1, py]);
            stack.push([px, py + 1]);
            stack.push([px, py - 1]);
        }
    }

    ctx.putImageData(imageData, 0, 0); // Update the canvas
}

// Helper functions
function colorsMatch(color1, color2) {
    return color1[0] === color2.r && color1[1] === color2.g && color1[2] === color2.b;
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

// Drawing functions (same as before)
function drawLine(x, y) {
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath(); // Start a new path
    ctx.moveTo(x, y); // Move to the current position
}

function drawCircle(x, y) {
    ctx.fillStyle = brushColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawSquare(x, y) {
    ctx.fillStyle = brushColor;
    ctx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
}

function drawTriangle(x, y) {
    ctx.fillStyle = brushColor;
    ctx.beginPath();
    ctx.moveTo(x, y - brushSize / 2);
    ctx.lineTo(x - brushSize / 2, y + brushSize / 2);
    ctx.lineTo(x + brushSize / 2, y + brushSize / 2);
    ctx.closePath();
    ctx.fill();
}

function drawRect(x, y) {
    ctx.fillStyle = brushColor;
    ctx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize / 2);
}

function drawEllipse(x, y) {
    ctx.fillStyle = brushColor;
    ctx.beginPath();
    ctx.ellipse(x, y, brushSize / 2, brushSize / 4, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Listen for drawing data from the server
socket.on('draw', (data) => {
    brushSize = data.brushSize;
    brushColor = data.brushColor;
    shape = data.shape;
    eraserMode = data.eraserMode;

    if (eraserMode) {
        ctx.clearRect(data.x - brushSize / 2, data.y - brushSize / 2, brushSize, brushSize); // Erase
    } else {
        if (data.shape === 'line') {
            drawLine(data.x, data.y);
        } else if (data.shape === 'circle') {
            drawCircle(data.x, data.y);
        } else if (data.shape === 'square') {
            drawSquare(data.x, data.y);
        } else if (data.shape === 'triangle') {
            drawTriangle(data.x, data.y);
        } else if (data.shape === 'rectangle') {
            drawRect(data.x, data.y);
        } else if (data.shape === 'ellipse') {
            drawEllipse(data.x, data.y);
        }
    }
});

// Listen for drawing history from the server
socket.on('drawingHistory', (history) => {
    history.forEach((data) => {
        brushSize = data.brushSize;
        brushColor = data.brushColor;
        shape = data.shape;
        eraserMode = data.eraserMode;

        if (eraserMode) {
            ctx.clearRect(data.x - brushSize / 2, data.y - brushSize / 2, brushSize, brushSize); // Erase
        } else {
            if (data.shape === 'line') {
                drawLine(data.x, data.y);
            } else if (data.shape === 'circle') {
                drawCircle(data.x, data.y);
            } else if (data.shape === 'square') {
                drawSquare(data.x, data.y);
            } else if (data.shape === 'triangle') {
                drawTriangle(data.x, data.y);
            } else if (data.shape === 'rectangle') {
                drawRect(data.x, data.y);
            } else if (data.shape === 'ellipse') {
                drawEllipse(data.x, data.y);
            }
        }
    });
});

// Listen for clear canvas event
socket.on('clearCanvas', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});