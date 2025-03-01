export class GestureDetector {
    constructor(options = {}) {
        this.threshold = options.threshold || 40;
        this.speedThreshold = options.speedThreshold || 0.08;
        this.pinchThreshold = options.pinchThreshold || 50;
        this.gestureStart = null;
        this.lastPositions = [];
        this.bufferSize = 5;
    }

    calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1[0] - point2[0], 2) + 
            Math.pow(point1[1] - point2[1], 2)
        );
    }

    detectGesture(landmarks) {
        const indexFinger = landmarks[8];
        const currentTime = Date.now();
        
        if (!this.gestureStart) {
            this.gestureStart = {
                position: indexFinger,
                time: currentTime
            };
            return null;
        }

        const xDiff = indexFinger[0] - this.gestureStart.position[0];
        const yDiff = indexFinger[1] - this.gestureStart.position[1];
        const timeDiff = currentTime - this.gestureStart.time;

        if (timeDiff > 1000) {
            this.gestureStart = {
                position: indexFinger,
                time: currentTime
            };
            return null;
        }

        const speed = Math.sqrt(xDiff * xDiff + yDiff * yDiff) / timeDiff;
        
        if (speed < this.speedThreshold) return null;

        // Check pinch
        const thumbTip = landmarks[4];
        const pinchDistance = this.calculateDistance(
            [indexFinger[0], indexFinger[1]], 
            [thumbTip[0], thumbTip[1]]
        );
        
        if (pinchDistance < this.pinchThreshold) {
            this.gestureStart = null;
            return 'PINCH';
        }

        // Detect swipes
        if (Math.abs(xDiff) > this.threshold || Math.abs(yDiff) > this.threshold) {
            const gesture = Math.abs(xDiff) > Math.abs(yDiff)
                ? (xDiff > 0 ? "swipeRight" : "swipeLeft")
                : (yDiff > 0 ? "swipeDown" : "swipeUp");
            
            this.gestureStart = null;
            return gesture;
        }

        return null;
    }
}
