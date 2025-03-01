export class YoloV7GestureDetector {
    constructor(options = {}) {
        this.options = {
            confidence: 0.7,
            ...options
        };
        this.model = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.callbacks = {};
        this.isDetecting = false;
        this.previousLandmarks = null;
        this.lastGestureTime = 0;
        this.gestureDelay = 300; // Minimum time between gestures
    }

    async initialize(videoElement, container) {
        try {
            this.model = await handpose.load();
            console.log('Hand detection model loaded');

            this.canvas.width = videoElement.videoWidth;
            this.canvas.height = videoElement.videoHeight;
            this.canvas.className = 'gesture-detection-canvas';
            container.appendChild(this.canvas);

            this.isDetecting = true;
            this.detectFrame(videoElement);
            return true;
        } catch (error) {
            console.error('Failed to initialize hand detection:', error);
            throw error;
        }
    }

    async detectFrame(videoElement) {
        if (!this.isDetecting) return;

        try {
            const hands = await this.model.estimateHands(videoElement);
            
            if (hands.length > 0) {
                const landmarks = hands[0].landmarks;
                const gesture = this.detectGesture(landmarks);
                
                if (gesture) {
                    const now = Date.now();
                    if (now - this.lastGestureTime > this.gestureDelay) {
                        this.emit('gestureDetected', gesture);
                        this.lastGestureTime = now;
                    }
                }
                
                this.drawHand(landmarks);
                this.previousLandmarks = landmarks;
            } else {
                this.previousLandmarks = null;
            }
        } catch (error) {
            console.error('Detection error:', error);
        }

        requestAnimationFrame(() => this.detectFrame(videoElement));
    }

    detectGesture(landmarks) {
        if (!this.previousLandmarks) return null;

        const palmBase = landmarks[0];
        const prevPalmBase = this.previousLandmarks[0];
        
        // Calculate movement
        const deltaX = palmBase[0] - prevPalmBase[0];
        const deltaY = palmBase[1] - prevPalmBase[1];
        
        const MOVEMENT_THRESHOLD = 40;
        
        // Detect swipes
        if (Math.abs(deltaX) > MOVEMENT_THRESHOLD) {
            return deltaX > 0 ? 'swipeRight' : 'swipeLeft';
        }
        if (Math.abs(deltaY) > MOVEMENT_THRESHOLD) {
            return deltaY > 0 ? 'swipeDown' : 'swipeUp';
        }

        // Detect pinch
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const pinchDistance = Math.hypot(
            thumbTip[0] - indexTip[0],
            thumbTip[1] - indexTip[1]
        );

        const PINCH_THRESHOLD = 25;
        if (pinchDistance < PINCH_THRESHOLD) {
            return 'PINCH';
        }

        return null;
    }

    drawHand(landmarks) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
        ];

        // Draw lines
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        connections.forEach(([start, end]) => {
            this.ctx.beginPath();
            this.ctx.moveTo(landmarks[start][0], landmarks[start][1]);
            this.ctx.lineTo(landmarks[end][0], landmarks[end][1]);
            this.ctx.stroke();
        });

        // Draw points
        this.ctx.fillStyle = '#ffffff';
        landmarks.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point[0], point[1], 4, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    on(eventName, callback) {
        this.callbacks[eventName] = callback;
    }

    emit(eventName, data) {
        if (this.callbacks[eventName]) {
            this.callbacks[eventName](data);
        }
    }

    cleanup() {
        if (this.model) {
            this.model.dispose();
        }
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
