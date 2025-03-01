let scene, camera, renderer, currentProduct;
const products = {};

function createShoeModel() {
    const shoe = new THREE.Group();

    // Shoe sole
    const soleGeometry = new THREE.BoxGeometry(3, 0.3, 8);
    const soleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.7,
        metalness: 0.2
    });
    const sole = new THREE.Mesh(soleGeometry, soleMaterial);
    sole.position.y = -0.5;
    shoe.add(sole);

    // Shoe body
    const bodyGeometry = new THREE.BoxGeometry(2.8, 1.5, 7.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2196F3,
        roughness: 0.5,
        metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.4;
    shoe.add(body);

    // Shoe laces
    for (let i = 0; i < 5; i++) {
        const laceGeometry = new THREE.BoxGeometry(2, 0.1, 0.2);
        const laceMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            roughness: 0.3,
            metalness: 0.1
        });
        const lace = new THREE.Mesh(laceGeometry, laceMaterial);
        lace.position.set(0, 0.8, -1.5 + i);
        shoe.add(lace);
    }

    return shoe;
}

function createPhoneModel() {
    const phone = new THREE.Group();

    // Phone body
    const bodyGeometry = new THREE.BoxGeometry(2.5, 5, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x111111,
        roughness: 0.2,
        metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    phone.add(body);

    // Screen
    const screenGeometry = new THREE.BoxGeometry(2.3, 4.8, 0.01);
    const screenMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        emissive: 0x222222,
        roughness: 0.05,
        metalness: 0.9
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.16;
    phone.add(screen);

    // Camera bump
    const cameraBumpGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
    const cameraBumpMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.7
    });
    const cameraBump = new THREE.Mesh(cameraBumpGeometry, cameraBumpMaterial);
    cameraBump.rotation.x = Math.PI / 2;
    cameraBump.position.set(0.5, 1.8, -0.2);
    phone.add(cameraBump);

    return phone;
}

function createSampleProduct() {
    const product = new THREE.Group();

    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(2, 2, 0.2, 32);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -2;
    product.add(base);

    // Main object - can be changed to phone, shoe, etc.
    const mainGeometry = new THREE.BoxGeometry(2, 4, 0.5);
    const mainMaterial = new THREE.MeshStandardMaterial({
        color: 0x2196F3,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9
    });
    const mainObject = new THREE.Mesh(mainGeometry, mainMaterial);
    product.add(mainObject);

    // Add details
    const detailsGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
    const detailsMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2
    });
    
    for (let i = 0; i < 3; i++) {
        const detail = new THREE.Mesh(detailsGeometry, detailsMaterial);
        detail.position.set(0, -1 + i, 0.3);
        detail.rotation.x = Math.PI / 2;
        product.add(detail);
    }

    // Add shine effect
    const light = new THREE.PointLight(0xffffff, 0.5);
    light.position.set(0, 2, 2);
    product.add(light);

    return product;
}

function init3DView(containerId, productType = 'sample') {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    const container = document.getElementById(containerId);
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    // Enhanced lighting for PBR materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased intensity
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Add environment map for reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = new THREE.CubeTextureLoader().load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ]);
    const envMap = pmremGenerator.fromCubemap(envTexture).texture;
    scene.environment = envMap;

    // Create products if they don't exist
    if (!products.phone) products.phone = createPhoneModel();
    if (!products.shoe) products.shoe = createShoeModel();
    if (!products.sample) products.sample = createSampleProduct();

    // Set current product
    currentProduct = products[productType].clone();
    scene.add(currentProduct);

    // Position camera based on product type
    if (productType === 'shoe') {
        camera.position.set(5, 3, 10);
    } else {
        camera.position.set(0, 0, 8);
    }

    camera.lookAt(scene.position);

    // Add orbit controls for testing
    if (window.THREE.OrbitControls) {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    }

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    // Add subtle auto-rotation when not interacting
    if (!isInteracting && currentProduct) {
        currentProduct.rotation.y += 0.005;
        currentProduct.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
    }
    renderer.render(scene, camera);
}

let isInteracting = false;

function rotateProduct(angle) {
    if (currentProduct) {
        isInteracting = true;
        currentProduct.rotation.y = angle * (Math.PI / 180);
        // Reset interaction flag after a delay
        clearTimeout(window.interactionTimeout);
        window.interactionTimeout = setTimeout(() => {
            isInteracting = false;
        }, 1000);
    }
}

function zoomProduct(factor) {
    if (camera.position.z > 2 && factor < 1) {
        camera.position.z *= factor;
    } else if (camera.position.z < 15 && factor > 1) {
        camera.position.z *= factor;
    }
}

function switchProduct(productType) {
    if (currentProduct) {
        scene.remove(currentProduct);
    }
    currentProduct = products[productType].clone();
    scene.add(currentProduct);
}

function resizeRenderer() {
    if (camera && renderer) {
        const container = renderer.domElement.parentElement;
        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.offsetWidth, container.offsetHeight);
    }
}

window.addEventListener('resize', resizeRenderer);
