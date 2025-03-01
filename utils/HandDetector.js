export class HandDetector {
    constructor(options = {}) {
        this.confidenceThreshold = options.confidenceThreshold || 0.7;
        this.frameHistory = [];
        this.historySize = 5;
        this.lastGesture = null;
        this.lastGestureTime = 0;
        this.gestureTimeout = 500;
        this.lastLandmarks = null;
        this.wireframeColor = options.wireframeColor || '#00ff00';
        this.wireframeWidth = options.wireframeWidth || 3;
        this.hands = null;
        this.camera = null;
    }

    async initialize(videoElement) {
        if (!videoElement) throw new Error('Video element is required');

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: this.confidenceThreshold,
            minTrackingConfidence: this.confidenceThreshold
        });

        this.hands.onResults((results) => this.onResults(results));

        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({image: videoElement});
            },
            width: 1280,
            height: 720
        });

        await this.camera.start();
        console.log('Hand detection initialized');
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            this.lastLandmarks = landmarks;
            
            const gesture = this.detectGesture(landmarks);
            if (gesture && this.isValidGesture(gesture)) {
                this.onGestureDetected(gesture);
            }
        }
    }

    detectGesture(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const palmBase = landmarks[0];

        // Calculate vertical and horizontal movement
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Detect PINCH
        if (distance < 0.1) {
            return 'PINCH';
        }

        // Detect swipes
        if (this.lastPalmPosition) {
            const deltaX = palmBase.x - this.lastPalmPosition.x;
            const deltaY = palmBase.y - this.lastPalmPosition.y;
            
            if (Math.abs(deltaX) > 0.1) {
                return deltaX > 0 ? 'swipeRight' : 'swipeLeft';
            }
            if (Math.abs(deltaY) > 0.1) {
                return deltaY > 0 ? 'swipeDown' : 'swipeUp';
            }
        }

        this.lastPalmPosition = { x: palmBase.x, y: palmBase.y };
        return null;
    }

    isValidGesture(gesture) {
        const now = Date.now();
        if (now - this.lastGestureTime < this.gestureTimeout) {
            return false;
        }

        this.frameHistory.push(gesture);
        if (this.frameHistory.length > this.historySize) {
            this.frameHistory.shift();
        }

        const isConsistent = this.frameHistory.every(g => g === gesture);
        if (isConsistent) {
            this.lastGestureTime = now;
            this.lastGesture = gesture;
            return true;
        }

        return false;
    }

    onGestureDetected(gesture) {
        // This method should be overridden by the main script
        console.log('Gesture detected:', gesture);
    }

    cleanup() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.hands) {
            this.hands.close();
        }
    }
}
