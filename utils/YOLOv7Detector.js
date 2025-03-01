export class YOLOv7Detector {
    constructor(options = {}) {
        this.options = {
            modelPath: 'https://raw.githubusercontent.com/WongKinYiu/yolov7/main/models/yolov7-tiny.pt',
            confidence: 0.5,
            ...options
        };
        this.model = null;
        this.isReady = false;
        this.callbacks = {};
    }

    async initialize(videoElement, container) {
        try {
            // Load YOLO model
            this.model = await tf.loadGraphModel('https://cdn.jsdelivr.net/npm/@tensorflow-models/yolov7@0.0.1/model.json');
            
            // Setup video processing canvas
            this.videoWidth = videoElement.videoWidth;
            this.videoHeight = videoElement.videoHeight;
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.videoWidth;
            this.canvas.height = this.videoHeight;
            this.ctx = this.canvas.getContext('2d');
            container.appendChild(this.canvas);

            // Start detection loop
            this.isReady = true;
            this.detectFrame(videoElement);
            return true;
        } catch (error) {
            console.error('Failed to initialize YOLO:', error);
            throw error;
        }
    }

    async detectFrame(videoElement) {
        if (!this.isReady) return;

        const detectFrame = async () => {
            try {
                // Convert video frame to tensor
                const tensor = tf.tidy(() => {
                    const img = tf.browser.fromPixels(videoElement);
                    const normalized = tf.div(tf.expandDims(img), 255.0);
                    return normalized;
                });

                // Run detection
                const predictions = await this.model.executeAsync(tensor);
                const boxes = await predictions[0].array();
                const scores = await predictions[1].array();
                
                // Process predictions
                const gestures = this.processDetections(boxes[0], scores[0]);
                
                // Draw detections
                this.drawDetections(gestures);

                // Emit detected gestures
                if (gestures.length > 0) {
                    this.emit('gestureDetected', gestures[0]);
                }

                // Cleanup
                tf.dispose([tensor, ...predictions]);
            } catch (error) {
                console.error('Detection error:', error);
            }

            // Continue detection loop
            requestAnimationFrame(() => this.detectFrame(videoElement));
        };

        detectFrame();
    }

    processDetections(boxes, scores) {
        const gestures = [];
        const threshold = this.options.confidence;

        boxes.forEach((box, i) => {
            if (scores[i] > threshold) {
                const [y1, x1, y2, x2] = box;
                const gesture = this.classifyGesture(x2 - x1, y2 - y1);
                if (gesture) {
                    gestures.push({
                        gesture,
                        confidence: scores[i],
                        box: { x1, y1, x2, y2 }
                    });
                }
            }
        });

        return gestures;
    }

    classifyGesture(width, height) {
        // Simple gesture classification based on bounding box dimensions
        const ratio = width / height;
        if (ratio > 1.5) return 'swipeLeft';
        if (ratio < 0.5) return 'swipeUp';
        return 'point';
    }

    drawDetections(gestures) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        gestures.forEach(({ box, gesture, confidence }) => {
            const { x1, y1, x2, y2 } = box;
            
            // Draw bounding box
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                x1 * this.videoWidth, 
                y1 * this.videoHeight,
                (x2 - x1) * this.videoWidth,
                (y2 - y1) * this.videoHeight
            );

            // Draw label
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(
                `${gesture} ${Math.round(confidence * 100)}%`,
                x1 * this.videoWidth,
                y1 * this.videoHeight - 5
            );
        });
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event](data);
        }
    }

    cleanup() {
        this.isReady = false;
        if (this.model) {
            this.model.dispose();
        }
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}
