const video = document.getElementById("video");
const debug = document.getElementById("debug");
const sections = document.querySelectorAll(".section");

let currentSection = 0;
let currentPage = [0, 0, 0];

// Load TensorFlow.js HandPose model
async function loadHandPose() {
    const model = await handpose.load();
    debug.innerText = "HandPose model loaded.";
    detectHands(model);
}

// Start camera
async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => (video.onloadedmetadata = resolve));
}

// Detect hand and interpret gestures
async function detectHands(model) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    setInterval(async () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const predictions = await model.estimateHands(video);
        
        if (predictions.length > 0) {
            debug.innerText = "Hand detected!";
            processGesture(predictions[0].landmarks);
        } else {
            debug.innerText = "No hand detected.";
        }
    }, 300);
}

// Process hand gesture based on index finger movement
function processGesture(landmarks) {
    const [thumb, indexFinger, middleFinger] = landmarks;
    
    const xDiff = indexFinger[0] - thumb[0];
    const yDiff = indexFinger[1] - middleFinger[1];

    if (xDiff > 50) {
        switchPage("right");
        debug.innerText += " | Swipe Right";
    } else if (xDiff < -50) {
        switchPage("left");
        debug.innerText += " | Swipe Left";
    } else if (yDiff > 50) {
        switchSection("down");
        debug.innerText += " | Swipe Down";
    } else if (yDiff < -50) {
        switchSection("up");
        debug.innerText += " | Swipe Up";
    }
}

// Section navigation
function switchSection(direction) {
    sections[currentSection].classList.remove("active");
    if (direction === "down" && currentSection < sections.length - 1) {
        currentSection++;
    } else if (direction === "up" && currentSection > 0) {
        currentSection--;
    }
    sections[currentSection].classList.add("active");
    debug.innerText += ` | Section: ${currentSection + 1}`;
}

// Page navigation
function switchPage(direction) {
    const pages = document.getElementById(`pages${currentSection + 1}`);
    if (direction === "left" && currentPage[currentSection] < 2) {
        currentPage[currentSection]++;
    } else if (direction === "right" && currentPage[currentSection] > 0) {
        currentPage[currentSection]--;
    }
    pages.style.transform = `translateX(-${currentPage[currentSection] * 100}vw)`;
    debug.innerText += ` | Page: ${currentPage[currentSection] + 1}`;
}

// Initialize everything
setupCamera().then(loadHandPose);
