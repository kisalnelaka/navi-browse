const ASSETS_PATH = 'assets';

export const products = [
    {
        id: 'smartphone',
        name: 'Premium Smartphone',
        price: 999,
        features: [
            '6.7" AMOLED Display',
            '5G Ready',
            '48MP Camera'
        ],
        specs: [
            'All-day battery life',
            'Water resistant',
            'Face recognition'
        ],
        modelType: 'phone',
        images: {
            thumbnail: `${ASSETS_PATH}/images/phone-thumb.jpg`,
            gallery: [
                `${ASSETS_PATH}/images/phone-1.jpg`,
                `${ASSETS_PATH}/images/phone-2.jpg`,
                `${ASSETS_PATH}/images/phone-3.jpg`
            ],
            textures: {
                body: `${ASSETS_PATH}/textures/phone-body.jpg`,
                screen: `${ASSETS_PATH}/textures/phone-screen.jpg`
            }
        },
        modelConfig: {
            scale: 1,
            rotation: [0, 0, 0],
            position: [0, 0, 0],
            cameraPosition: [0, 0, 8]
        }
    }
];

export const getProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) {
        console.warn(`Product ${id} not found`);
    }
    return product;
};
