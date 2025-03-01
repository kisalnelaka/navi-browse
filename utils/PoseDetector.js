export class PoseDetector {
    constructor(options = {}) {
        this.options = {
            architecture: 'MobileNetV1',
            outputStride: 16,
            inputResolution: { width: 640, height: 480 },
            multiplier: 0.75,
            minPoseConfidence: 0.2,  // Lower threshold for detection
            minPartConfidence: 0.5,  // Lower threshold for parts
            ...options
        };
        
        this.net = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.callbacks = {};
    }

    async initialize(videoElement, container) {
        try {
            this.net = await posenet.load(this.options);
            console.log('PoseNet model loaded');

            this.canvas.width = videoElement.videoWidth;
            this.canvas.height = videoElement.videoHeight;
            this.canvas.className = 'pose-detection-canvas';
            container.appendChild(this.canvas);

            this.detectPose(videoElement);
            return true;
        } catch (error) {
            console.error('Failed to initialize PoseNet:', error);
            throw error;
        }
    }

    async detectPose(videoElement) {
        const detectFrame = async () => {
            if (this.net && videoElement.readyState === 4) {
                const pose = await this.net.estimateSinglePose(videoElement);
                
                if (pose.score > 0.2) {
                    // Convert pose keypoints to gesture
                    const gesture = this.analyzeGesture(pose.keypoints);
                    if (gesture) {
                        this.emit('gestureDetected', gesture);
                    }
                }

                this.drawPose(pose);
            }
            requestAnimationFrame(() => detectFrame());
        };

        detectFrame();
    }

    analyzeGesture(keypoints) {
        const leftWrist = keypoints.find(k => k.part === 'leftWrist');
        const rightWrist = keypoints.find(k => k.part === 'rightWrist');
        
        if (!leftWrist || !rightWrist) return null;

        // More sensitive movement detection
        if (this.previousWrist) {
            const deltaX = leftWrist.position.x - this.previousWrist.x;
            const deltaY = leftWrist.position.y - this.previousWrist.y;
            
            const MOVEMENT_THRESHOLD = 20; // Reduced from 30
            
            if (Math.abs(deltaX) > MOVEMENT_THRESHOLD) {
                return deltaX > 0 ? 'swipeRight' : 'swipeLeft';
            }
            if (Math.abs(deltaY) > MOVEMENT_THRESHOLD) {
                return deltaY > 0 ? 'swipeDown' : 'swipeUp';
            }
        }

        this.previousWrist = {
            x: leftWrist.position.x,
            y: leftWrist.position.y
        };

        return null;
    }

    drawPose(pose) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (pose.score > 0.2) {
            // Draw keypoints
            pose.keypoints.forEach(keypoint => {
                if (keypoint.score > 0.5) {
                    this.ctx.beginPath();
                    this.ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
                    this.ctx.fillStyle = 'aqua';
                    this.ctx.fill();
                }
            });
        }
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
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
