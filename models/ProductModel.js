export class ProductModel {
    constructor(config) {
        if (typeof THREE === 'undefined') {
            throw new Error('THREE.js is not loaded. Please ensure it is included in your HTML file.');
        }
        this.config = config;
        this.model = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInteracting = false;
        
        // Define model creators after methods are defined
        this.initModelCreators();
    }

    initModelCreators() {
        // Initialize after methods are defined
        this.modelCreators = {
            'phone': () => this.createPhoneModel(),
            'shoe': () => this.createShoeModel(),
            'default': () => this.createDefaultModel()
        };
    }

    async initialize(containerId) {
        try {
            console.log('Initializing 3D view...');
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }
            
            this.renderer.setSize(container.offsetWidth, container.offsetHeight);
            container.appendChild(this.renderer.domElement);

            await this.setupLighting();
            await this.loadModel();
            this.setupCamera();
            this.animate();

            window.addEventListener('resize', () => this.handleResize(container));
            console.log('3D view initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize 3D view:', error);
            throw error;
        }
    }

    async setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
        backLight.position.set(-5, 5, -5);
        this.scene.add(backLight);
    }

    createPhoneModel() {
        console.log('Creating phone model');
        const phone = new THREE.Group();
        
        // Phone body
        const bodyGeometry = new THREE.BoxGeometry(2.5, 5, 0.3);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        phone.add(body);

        // Screen
        const screenGeometry = new THREE.BoxGeometry(2.3, 4.8, 0.01);
        const screenMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x222222
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.z = 0.16;
        phone.add(screen);

        return phone;
    }

    createDefaultModel() {
        const geometry = new THREE.BoxGeometry(2, 4, 0.5);
        const material = new THREE.MeshStandardMaterial({
            color: 0x2196F3,
            metalness: 0.5,
            roughness: 0.3
        });
        return new THREE.Mesh(geometry, material);
    }

    async loadModel() {
        try {
            console.log('Loading model:', this.config.modelType);
            const creator = this.modelCreators[this.config.modelType] || this.modelCreators.default;
            if (!creator) {
                throw new Error(`No creator found for model type: ${this.config.modelType}`);
            }
            this.model = creator();
            if (!this.model) {
                throw new Error('Model creation failed');
            }
            this.scene.add(this.model);
            console.log('Model loaded successfully');
        } catch (error) {
            console.error('Failed to load model:', error);
            // Create default model as fallback
            this.model = this.createDefaultModel();
            this.scene.add(this.model);
        }
    }

    setupCamera() {
        const pos = this.config.modelConfig.cameraPosition;
        this.camera.position.set(pos[0], pos[1], pos[2]);
        this.camera.lookAt(this.scene.position);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isInteracting && this.model) {
            this.model.rotation.y += 0.005;
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    handleResize(container) {
        if (this.camera && this.renderer) {
            this.camera.aspect = container.offsetWidth / container.offsetHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        }
    }

    resetView() {
        if (this.model) {
            this.model.rotation.set(0, 0, 0);
            const pos = this.config.modelConfig.cameraPosition;
            this.camera.position.set(pos[0], pos[1], pos[2]);
            this.camera.lookAt(this.scene.position);
        }
    }

    rotate(angle) {
        if (this.model) {
            this.isInteracting = true;
            // Constrain rotation to reasonable bounds
            const boundedAngle = Math.max(-180, Math.min(180, angle));
            this.model.rotation.y = boundedAngle * (Math.PI / 180);
            
            clearTimeout(this.interactionTimeout);
            this.interactionTimeout = setTimeout(() => {
                this.isInteracting = false;
            }, 1000);
        }
    }

    zoom(factor) {
        const MIN_ZOOM = 2;
        const MAX_ZOOM = 15;
        const newZ = this.camera.position.z * factor;
        
        if (newZ >= MIN_ZOOM && newZ <= MAX_ZOOM) {
            this.camera.position.z = newZ;
        }
    }
}
