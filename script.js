const MODE = {
    AUTO: 'AUTO',
    SELECTION: 'SELECTION',
    INSPECTION: 'INSPECTION'
};

import { products, getProduct } from './config/products.js';
import { GestureDetector } from './utils/gestureDetector.js';
import { ProductModel } from './models/ProductModel.js';
import { YoloV7GestureDetector } from './utils/YoloV7GestureDetector.js';

const video = document.getElementById("video");
const debug = document.getElementById("debug");
const productShowcase = document.querySelector(".product-showcase");
const gestureIndicator = document.getElementById("gestureIndicator");
const gestureEmojis = {
    'swipeLeft': '👈',
    'swipeRight': '👉',
    'swipeUp': '☝️',
    'swipeDown': '👇',
    'PINCH': '✌️',
    'rotate': '🔄'
};

let currentPage = 0;
let lastPositions = [];
const bufferSize = 5;
let gestureCooldown = false;
let isHandPresent = false;
let productRotation = 0;

const TIMEOUT_DURATION = 30000; // 30 seconds of inactivity to return to auto mode
const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds per product in auto mode

let mode = MODE.SELECTION; // Start in selection mode instead of auto
let autoScrollInterval = null;
let lastInteractionTime = Date.now();
let selectedProduct = null;
let wireframe = null;

// Update detection parameters
const GESTURE_THRESHOLD = 40;  // Reduced from 50
const SPEED_THRESHOLD = 0.08;  // Reduced from 0.1
const PINCH_THRESHOLD = 50;    // Reduced from 60
const DETECTION_INTERVAL = 100; // Increased for stability

// Add new gesture tracking variables
let gestureStart = null;
let gestureTimeout = null;

// Replace both gesture detector declarations with a single one
let gestureDetector;

const productModel = new ProductModel(products[0]);

// Add these product control functions
let currentProductModel = null;

function rotateProduct(angle) {
    if (currentProductModel) {
        currentProductModel.rotate(angle);
    }
}

function zoomProduct(factor) {
    if (currentProductModel) {
        currentProductModel.zoom(factor);
    }
}

function enterInspectionMode() {
    console.log("Entering inspection mode");
    mode = MODE.INSPECTION;
    selectedProduct = currentPage;
    document.querySelector('.mode-indicator').textContent = 'Inspection Mode';
    debug.innerText = "Inspection Mode - Rotate and Zoom";
    document.body.classList.add('inspection-mode');
    
    // Reset product view
    if (currentProductModel) {
        currentProductModel.resetView();
    }
}

function exitInspectionMode() {
    console.log("Exiting inspection mode");
    mode = MODE.SELECTION;
    selectedProduct = null;
    document.querySelector('.mode-indicator').textContent = 'Selection Mode';
    debug.innerText = "Selection Mode";
    document.body.classList.remove('inspection-mode');
}

async function loadHandPose() {
    try {
        console.log('Initializing hand detection...');
        await initializeHandDetection();
        debug.innerText = "Ready for interaction!";
        startAutoMode();
    } catch (error) {
        console.error('Hand detection initialization failed:', error);
        debug.innerText = "Failed to initialize hand detection";
        throw error;
    }
}

async function setupCamera() {
    try {
        // Check if navigator.mediaDevices exists
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not supported');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user",
                frameRate: { ideal: 60 }
            }
        });

        video.srcObject = stream;
        
        // Ensure video plays
        try {
            await video.play();
        } catch (err) {
            console.error('Video autoplay failed:', err);
        }

        return stream;
    } catch (error) {
        console.error('Camera setup failed:', error);
        debug.innerText = `Camera Error: ${error.message}`;
        throw error;
    }
}

async function initializeHandDetection() {
    try {
        const container = document.querySelector('.camera-container');
        if (!container) {
            throw new Error('Camera container not found');
        }

        console.log('Initializing YOLOv7 gesture detection...');
        gestureDetector = new YoloV7GestureDetector({
            confidence: 0.7,
            modelUrl: 'path/to/your/yolov7-model.json' // Update with actual path
        });

        await gestureDetector.initialize(video, container);
        console.log('YOLOv7 detection initialized successfully');

        gestureDetector.on('gestureDetected', (gesture) => {
            if (gesture) {
                processGesture(gesture);
            }
        });

        return gestureDetector;
    } catch (error) {
        console.error('Failed to initialize gesture detection:', error);
        throw error;
    }
}

function resetGestureState() {
    isHandPresent = false;
    lastPositions = [];
    gestureStart = null;
    if (gestureTimeout) {
        clearTimeout(gestureTimeout);
    }
}

const INTERACTION_TIMEOUT = 120000; // 2 minutes in milliseconds
let interactionMode = false;
let interactionTimer = null;
let lastGesture = null;
let gestureStartTime = null;

function startAutoMode() {
    if (mode === MODE.AUTO) return; // Already in auto mode
    
    console.log("Entering auto mode");
    mode = MODE.AUTO;
    document.querySelector('.mode-indicator').textContent = 'Auto Mode';
    debug.innerText = "Auto Showcase Mode";
    document.body.classList.remove('inspection-mode');
    currentPage = 0;
    updateProductDisplay();
    
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
    }
    
    autoScrollInterval = setInterval(() => {
        if (mode === MODE.AUTO) {
            currentPage = (currentPage + 1) % 3;
            updateProductDisplay();
        }
    }, AUTO_SCROLL_INTERVAL);
}

function handleUserInteraction() {
    lastInteractionTime = Date.now();
    if (mode === MODE.AUTO) {
        console.log("Exiting auto mode");
        clearInterval(autoScrollInterval);
        mode = MODE.SELECTION;
        document.querySelector('.mode-indicator').textContent = 'Selection Mode';
        debug.innerText = "Selection Mode - Swipe to browse products";
    }
}

function checkTimeout() {
    if (mode !== 'AUTO' && Date.now() - lastInteractionTime > TIMEOUT_DURATION) {
        exitInspectionMode();
        startAutoMode();
    }
}

// Update processGesture function
function processGesture(gesture) {
    if (!gestureCooldown && gesture) {
        console.log('Processing gesture:', gesture);
        showGestureIndicator(gesture);
        
        try {
            handleGesture(gesture);
        } catch (error) {
            console.error('Error handling gesture:', error);
        }
        
        gestureCooldown = true;
        setTimeout(() => {
            gestureCooldown = false;
        }, 500);
    }
}

function showGestureIndicator(gesture) {
    if (!gesture) return;
    
    gestureIndicator.textContent = gestureEmojis[gesture] || '';
    gestureIndicator.classList.remove('active');
    
    // Trigger reflow
    void gestureIndicator.offsetWidth;
    
    gestureIndicator.classList.add('active');
}

function handleGesture(gesture) {
    if (!gesture) return;

    console.log("Handling gesture:", gesture, "in mode:", mode);
    lastInteractionTime = Date.now();

    switch(mode) {
        case MODE.AUTO:
            if (gesture) {
                clearInterval(autoScrollInterval);
                mode = MODE.SELECTION;
                document.querySelector('.mode-indicator').textContent = 'Selection Mode';
            }
            break;
            
        case MODE.SELECTION:
            switch(gesture) {
                case 'swipeLeft':
                    if (currentPage < 2) {
                        currentPage++;
                        updateProductDisplay();
                    }
                    break;
                case 'swipeRight':
                    if (currentPage > 0) {
                        currentPage--;
                        updateProductDisplay();
                    }
                    break;
                case 'swipeUp':
                case 'PINCH':
                    enterInspectionMode();
                    break;
            }
            break;
            
        case MODE.INSPECTION:
            switch(gesture) {
                case 'swipeLeft':
                case 'swipeRight':
                    const normalizedX = gesture === 'swipeRight' ? 0.75 : 0.25;
                    rotateProduct(normalizedX * 360);
                    break;
                case 'swipeUp':
                    zoomProduct(1.1);
                    break;
                case 'swipeDown':
                    zoomProduct(0.9);
                    break;
                case 'PINCH':
                    exitInspectionMode();
                    break;
            }
            break;
    }
}

function handleNavigationGesture(gesture) {
    switch (gesture) {
        case "swipeLeft":
            if (currentPage < 2) switchPage("left");
            break;
        case "swipeRight":
            if (currentPage > 0) switchPage("right");
            break;
        case "swipeUp":
            enterInteractionMode();
            break;
    }
}

function handleInteractionMode(gesture, landmarks) {
    if (gesture === "swipeDown") {
        exitInteractionMode();
        return;
    }

    // Update 3D model rotation based on hand position
    const handX = landmarks[0][0];
    const rotation = ((handX / video.width) * 360) % 360;
    rotateProduct(rotation);
}

function enterInteractionMode() {
    interactionMode = true;
    debug.innerText = "Interaction Mode: Active";
    
    // Set timeout to exit interaction mode
    interactionTimer = setTimeout(() => {
        exitInteractionMode();
    }, INTERACTION_TIMEOUT);
}

function exitInteractionMode() {
    interactionMode = false;
    debug.innerText = "Navigation Mode";
    if (interactionTimer) {
        clearTimeout(interactionTimer);
        interactionTimer = null;
    }
}

function checkProductInteraction(hand) {
    const palmPosition = hand.landmarks[0];
    const product360 = document.querySelector('.product-360');
    
    if (currentPage === 2 && product360) {
        // Rotate product based on hand position
        const rotation = Math.floor((palmPosition[0] / video.width) * 360);
        product360.style.transform = `rotateY(${rotation}deg)`;
        productRotation = rotation;
    }
}

function switchPage(direction) {
    if (direction === "left" && currentPage < 2) {
        currentPage++;
    } else if (direction === "right" && currentPage > 0) {
        currentPage--;
    }
    
    productShowcase.style.transform = `translateX(-${currentPage * 100}vw)`;
    debug.innerText = `Viewing ${currentPage + 1} of 3`;
}

function createWireframe(landmarks) {
    cleanupWireframe(); // Clean up any existing wireframe
    const wireframeEl = document.createElement('div');
    wireframeEl.className = 'wireframe';
    document.body.appendChild(wireframeEl);
    return wireframeEl;
}

function updateWireframe(landmarks) {
    if (!wireframe || !landmarks) return;

    // Convert landmarks to screen coordinates and ensure they're valid numbers
    const normalizedLandmarks = landmarks.map(point => ({
        x: Math.round(point[0]),
        y: Math.round(point[1])
    }));

    // Hand connections
    const connections = [
        [0,1],[1,2],[2,3],[3,4], // thumb
        [0,5],[5,6],[6,7],[7,8], // index
        [0,9],[9,10],[10,11],[11,12], // middle
        [0,13],[13,14],[14,15],[15,16], // ring
        [0,17],[17,18],[18,19],[19,20] // pinky
    ];
    
    const paths = connections.map(([i, j]) => {
        const start = normalizedLandmarks[i];
        const end = normalizedLandmarks[j];
        
        if (!start || !end) return '';
        
        return `M${start.x},${start.y} L${end.x},${end.y}`;
    }).filter(path => path !== '');

    if (paths.length > 0) {
        wireframe.innerHTML = `
            <svg width="100%" height="100%" style="position:absolute;top:0;left:0;pointer-events:none">
                <path d="${paths.join(' ')}" stroke="cyan" stroke-width="3" fill="none"/>
            </svg>
        `;
    } else {
        wireframe.innerHTML = '';
    }
}

function cleanupWireframe() {
    if (wireframe && wireframe.parentNode) {
        wireframe.parentNode.removeChild(wireframe);
        wireframe = null;
    }
}

function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point1[0] - point2[0], 2) + 
        Math.pow(point1[1] - point2[1], 2)
    );
}

function isHandInFrame(landmarks) {
    const width = video.width;
    const height = video.height;
    
    for (let point of landmarks) {
        if (point[0] < 0 || point[0] > width || point[1] < 0 || point[1] > height) {
            return false;
        }
    }
    return true;
}

function updateProductDisplay() {
    productShowcase.style.transform = `translateX(-${currentPage * 100}vw)`;
    debug.innerText = `Viewing ${currentPage + 1} of 3`;
    document.querySelector('.mode-indicator').textContent = 
        `${mode} Mode - Product ${currentPage + 1}`;
}

setInterval(checkTimeout, 1000);

async function init() {
    try {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = loadingOverlay.querySelector('.loading-text');
        
        // Wait for DOM to be fully loaded
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve));
        }

        // Initialize components one by one
        loadingText.textContent = "Setting up camera...";
        await setupCamera();
        
        loadingText.textContent = "Loading hand detection...";
        await loadHandPose();
        
        loadingText.textContent = "Loading 3D models...";
        await initializeProduct();
        
        loadingText.textContent = "Ready! Wave your hand to interact.";
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            debug.innerText = "Wave your hand to interact!";
            handleUserInteraction(); // Start in selection mode
        }, 1000);

    } catch (err) {
        console.error('Initialization error:', err);
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.innerHTML = `
            <div class="error-message">
                Error: ${err.message}
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

async function initializeProduct() {
    try {
        console.log('Initializing product...');
        const product = getProduct('smartphone');
        if (!product) {
            throw new Error('Product configuration not found');
        }
        
        currentProductModel = new ProductModel(product);
        await currentProductModel.initialize('product3d');
        console.log('Product initialized successfully');
        return currentProductModel;
    } catch (err) {
        console.error('Failed to initialize product:', err);
        throw err;
    }
}

// Remove duplicate initialization
document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        console.error('Failed to initialize:', error);
        document.getElementById('debug').innerText = `Error: ${error.message}`;
    });
});

// Add these debug functions at the end
function logMode() {
    console.log({
        mode,
        currentPage,
        isHandPresent
    });
}

// Call this every few seconds to monitor state
setInterval(logMode, 2000);

// Update cleanup
function cleanup() {
    if (gestureDetector) {
        gestureDetector.cleanup();
    }
}

// Add event listener for page unload
window.addEventListener('unload', cleanup);

// Add keyboard shortcut to download logs
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        console.log('Download logs');
    }
});
