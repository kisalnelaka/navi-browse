export class FallbackManager {
    static checkSupport() {
        const support = {
            webgl: !!window.WebGLRenderingContext,
            camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            tensorflow: typeof tf !== 'undefined'
        };

        if (!support.webgl) {
            throw new Error('WebGL not supported - 3D rendering unavailable');
        }

        if (!support.camera) {
            throw new Error('Camera API not supported - gesture control unavailable');
        }

        if (!support.tensorflow) {
            throw new Error('TensorFlow.js failed to load - hand detection unavailable');
        }

        return support;
    }

    static enableFallbackMode() {
        // Switch to mouse/touch controls
        document.body.classList.add('fallback-mode');
    }
}
