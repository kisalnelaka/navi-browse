export class YoloGestureDetector {
    constructor(options = {}) {
        this.model = null;
        this.options = {
            modelUrl: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/yolov5@1.0.0/model.json',
            confidence: 0.7,
            ...options
        };
        this.gestureClasses = [
            'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
            'pinch', 'rotate', 'point', 'grab'
        ];
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.callbacks = {};
    }

    async initialize(videoElement, container) {
        try {
            // Load YOLOv5 model
            this.model = await tf.loadGraphModel(this.options.modelUrl);
            console.log('YOLO model loaded');

            // Setup canvas
            this.canvas.width = videoElement.videoWidth;
            this.canvas.height = videoElement.videoHeight;
            this.canvas.className = 'gesture-detection-canvas';
            container.appendChild(this.canvas);

            // Start detection loop
            this.detect(videoElement);

            return true;
        } catch (error) {
            console.error('Failed to initialize YOLO:', error);
            throw error;
        }
    }

    async detect(videoElement) {
        const detectFrame = async () => {
            // Convert video frame to tensor
            const tensor = tf.browser.fromPixels(videoElement)
                .expandDims(0)
                .div(255.0);

            // Run detection
            const predictions = await this.model.predict(tensor);
            
            // Process predictions
            const gestures = this.processPredictions(predictions);
            
            // Draw detections
            this.drawDetections(gestures);

            // Emit detected gestures
            if (gestures.length > 0) {
                this.emit('gestureDetected', gestures[0]);
            }

            // Cleanup
            tensor.dispose();
            predictions.dispose();

            // Continue detection loop
            requestAnimationFrame(() => detectFrame());
        };

        detectFrame();
    }

    processPredictions(predictions) {
        const detections = [];
        const scores = predictions[0].dataSync();
        const boxes = predictions[1].dataSync();

        for (let i = 0; i < scores.length; i++) {
            if (scores[i] > this.options.confidence) {
                const gesture = this.gestureClasses[i];
                const box = {
                    x: boxes[i * 4],
                    y: boxes[i * 4 + 1],
                    width: boxes[i * 4 + 2],
                    height: boxes[i * 4 + 3]
                };
                detections.push({ gesture, box, confidence: scores[i] });
            }
        }

        return detections;
    }

    drawDetections(detections) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        detections.forEach(detection => {
            const { box, gesture, confidence } = detection;

            // Draw bounding box
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                box.x * this.canvas.width,
                box.y * this.canvas.height,
                box.width * this.canvas.width,
                box.height * this.canvas.height
            );

            // Draw label
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(
                `${gesture} ${Math.round(confidence * 100)}%`,
                box.x * this.canvas.width,
                box.y * this.canvas.height - 5
            );
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
