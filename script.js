const video = document.getElementById("video");
const debug = document.getElementById("debug");
const sections = document.querySelectorAll(".section");

let currentSection = 0;
let currentPage = [0, 0, 0];

let lastPositions = [];
const bufferSize = 5;

let gestureCooldown = false; // Prevents repeated actions

async function loadHandPose() {
    const model = await handpose.load();
    debug.innerText = "HandPose model loaded.";
    detectHands(model);
}

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => (video.onloadedmetadata = resolve));
}

async function detectHands(model) {
    setInterval(async () => {
        if (gestureCooldown) return;

        const predictions = await model.estimateHands(video);
        if (predictions.length > 0) {
            debug.innerText = "Hand detected!";
            processGesture(predictions[0].landmarks);
        } else {
            debug.innerText = "No hand detected.";
        }
    }, 200);
}

function processGesture(landmarks) {
    if (gestureCooldown) return;

    const indexFinger = landmarks[8];
    lastPositions.push({ x: indexFinger[0], y: indexFinger[1] });

    if (lastPositions.length > bufferSize) lastPositions.shift();
    if (lastPositions.length < bufferSize) return;

    const start = lastPositions[0];
    const end = lastPositions[lastPositions.length - 1];
    const xDiff = end.x - start.x;
    const yDiff = end.y - start.y;
    const threshold = 60;

    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > threshold) switchPage("right");
        else if (xDiff < -threshold) switchPage("left");
    } else {
        if (yDiff > threshold) switchSection("down");
        else if (yDiff < -threshold) switchSection("up");
    }

    gestureCooldown = true;
    setTimeout(() => (gestureCooldown = false), 1000);
}

function switchSection(direction) {
    sections[currentSection].classList.remove("active");
    if (direction === "down" && currentSection < sections.length - 1) currentSection++;
    else if (direction === "up" && currentSection > 0) currentSection--;
    sections[currentSection].classList.add("active");
}

function switchPage(direction) {
    const pages = document.getElementById(`pages${currentSection + 1}`);
    if (direction === "left" && currentPage[currentSection] < 2) currentPage[currentSection]++;
    else if (direction === "right" && currentPage[currentSection] > 0) currentPage[currentSection]--;
    pages.style.transform = `translateX(-${currentPage[currentSection] * 100}vw)`;
}

setupCamera().then(loadHandPose);
