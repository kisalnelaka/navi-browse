export class HandTracker {
    constructor(options = {}) {
        this.options = {
            maxHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.8,
            minTrackingConfidence: 0.8,
            ...options
        };

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'hand-tracking-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Landmark colors for visualization
        this.colors = {
            thumb: '#FF0000',
            indexFinger: '#00FF00',
            middleFinger: '#0000FF',
            ringFinger: '#FFFF00',
            pinkyFinger: '#FF00FF',
            palm: '#00FFFF'
        };

        this.fingerIndices = {
            thumb: [1, 2, 3, 4],
            indexFinger: [5, 6, 7, 8],
            middleFinger: [9, 10, 11, 12],
            ringFinger: [13, 14, 15, 16],
            pinkyFinger: [17, 18, 19, 20]
        };

        this.callbacks = {
            onHandFound: null,
            onHandLost: null,
            onGestureDetected: null
        };

        this.previousLandmarks = null;
        this.handPresent = false;
        this.gestureHistory = [];
        this.gestureBufferSize = 5;
    }

    async initialize(videoElement, container) {
        // Set up canvas
        this.canvas.width = videoElement.videoWidth || 640;
        this.canvas.height = videoElement.videoHeight || 480;
        container.appendChild(this.canvas);

        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions(this.options);
        this.hands.onResults((results) => this.processResults(results));

        // Initialize camera
        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: videoElement });
            },
            width: this.canvas.width,
            height: this.canvas.height
        });

        await this.camera.start();
        console.log('HandTracker initialized');
    }

    processResults(results) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            if (!this.handPresent) {
                this.handPresent = true;
                if (this.callbacks.onHandFound) this.callbacks.onHandFound();
            }

            this.drawHand(landmarks);
            this.detectGesture(landmarks);
            this.previousLandmarks = landmarks;

        } else if (this.handPresent) {
            this.handPresent = false;
            this.previousLandmarks = null;
            if (this.callbacks.onHandLost) this.callbacks.onHandLost();
        }
    }

    drawHand(landmarks) {
        // Draw palm connections
        this.ctx.strokeStyle = this.colors.palm;
        this.ctx.lineWidth = 3;
        this.drawConnections([[0,5], [5,9], [9,13], [13,17], [0,17]], landmarks);

        // Draw fingers
        Object.entries(this.fingerIndices).forEach(([finger, indices]) => {
            this.ctx.strokeStyle = this.colors[finger];
            this.drawConnections(indices.map((i, idx) => idx > 0 ? [indices[idx-1], i] : [0, i]), landmarks);
        });

        // Draw landmarks
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fillStyle = 'white';
            this.ctx.fill();
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    drawConnections(connections, landmarks) {
        this.ctx.beginPath();
        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            this.ctx.moveTo(startPoint.x * this.canvas.width, startPoint.y * this.canvas.height);
            this.ctx.lineTo(endPoint.x * this.canvas.width, endPoint.y * this.canvas.height);
        });
        this.ctx.stroke();
    }

    detectGesture(landmarks) {
        const gesture = this.analyzeGesture(landmarks);
        if (gesture) {
            this.gestureHistory.push(gesture);
            if (this.gestureHistory.length > this.gestureBufferSize) {
                this.gestureHistory.shift();
            }

            // Check if gesture is consistent
            const isConsistent = this.gestureHistory.every(g => g === gesture);
            if (isConsistent && this.callbacks.onGestureDetected) {
                this.callbacks.onGestureDetected(gesture);
            }
        }
    }

    analyzeGesture(landmarks) {
        // Helper function to calculate distance
        const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const palmBase = landmarks[0];
        const middle = landmarks[12];

        // Detect pinch
        if (distance(thumbTip, indexTip) < 0.05) {
            return 'PINCH';
        }

        // Detect swipes by comparing with previous landmarks
        if (this.previousLandmarks) {
            const deltaX = palmBase.x - this.previousLandmarks[0].x;
            const deltaY = palmBase.y - this.previousLandmarks[0].y;
            const moveThreshold = 0.05;

            if (Math.abs(deltaX) > moveThreshold) {
                return deltaX > 0 ? 'swipeRight' : 'swipeLeft';
            }
            if (Math.abs(deltaY) > moveThreshold) {
                return deltaY > 0 ? 'swipeDown' : 'swipeUp';
            }
        }

        return null;
    }

    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        }
    }

    cleanup() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.hands) {
            this.hands.close();
        }
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
