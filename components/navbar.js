class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                nav {
                    background: rgba(17, 24, 39, 0.8);
                    backdrop-filter: blur(10px);
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: fixed;
                    left: 0;
                    right: 0;
                    top: 0;
                    z-index: 50;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    box-sizing: border-box;
                }
                .logo {
                    font-weight: 700;
                    font-size: 2.25rem;
                    background: linear-gradient(to right, #a78bfa, #8b5cf6);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    text-decoration: none;
                }
                .logo-cube-nav {
                    width: 64px;
                    height: 64px;
                    cursor: pointer;
                }
                #nav-cube-canvas {
                    filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.6));
                }
                #nav-cube-canvas:hover {
                    filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.9));
                }
                .nav-links {
                    display: flex;
                    gap: 1.5rem;
                    align-items: center;
                }
                .nav-link {
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.2s;
                    position: relative;
                }
                .nav-link:hover {
                    color: white;
                }
                .nav-link:hover::after {
                    content: '';
                    position: absolute;
                    bottom: -4px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(to right, #3b82f6, #8b5cf6);
                    border-radius: 2px;
                }
                .contact-btn, .login-btn {
                    padding: 0.5rem 1rem;
                    background: linear-gradient(to right, #3b82f6, #8b5cf6);
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: white;
                    text-decoration: none;
                    transition: all 0.3s;
                    white-space: nowrap;
                }
                .contact-btn:hover, .login-btn:hover {
                    box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);
                    transform: translateY(-1px);
                }
                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    color: white;
                }
                @media (max-width: 768px) {
                    .nav-links {
                        display: none;
                    }
                    .mobile-menu-btn {
                        display: block;
                    }
                }
            </style>
            <nav>
                <a href="index.html" class="logo">
                    <div class="logo-cube-nav">
                        <canvas id="nav-cube-canvas" width="64" height="64"></canvas>
                    </div>
                    N8tive.io
                </a>
                <div class="nav-links">
                    <a href="index.html" class="nav-link">Home</a>
                    <a href="index.html#about" class="nav-link">About</a>
                    <a href="index.html#demo" class="nav-link">Demo</a>
                    <a href="products.html" class="nav-link">Products</a>
                    <a href="pricing.html" class="nav-link">Pricing</a>
                    <a href="index.html#mission" class="nav-link">Mission</a>
                    <a href="login.html" class="login-btn">Login</a>
                </div>
                <button class="mobile-menu-btn">
                    <i data-feather="menu"></i>
                </button>
            </nav>
        `;
        
        // Initialize Feather icons within shadow DOM
        this.shadowRoot.querySelectorAll('[data-feather]').forEach(el => {
            feather.replace(el);
        });
        
        // Initialize Three.js 3D Cube Logo
        this.initNavCube();
    }
    
    initNavCube() {
        const canvas = this.shadowRoot.getElementById('nav-cube-canvas');
        if (!canvas || !window.THREE) return;
        
        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            alpha: true, 
            antialias: true 
        });
        renderer.setSize(64, 64);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Create cube structure
        const cubeGroup = new THREE.Group();
        scene.add(cubeGroup);
        
        const cubeSize = 0.7;
        const halfSize = cubeSize / 2;
        
        // Define cube corners
        const corners = [
            new THREE.Vector3(-halfSize, -halfSize, -halfSize),
            new THREE.Vector3(halfSize, -halfSize, -halfSize),
            new THREE.Vector3(halfSize, halfSize, -halfSize),
            new THREE.Vector3(-halfSize, halfSize, -halfSize),
            new THREE.Vector3(-halfSize, -halfSize, halfSize),
            new THREE.Vector3(halfSize, -halfSize, halfSize),
            new THREE.Vector3(halfSize, halfSize, halfSize),
            new THREE.Vector3(-halfSize, halfSize, halfSize)
        ];
        
        // Define cube edges (pairs of corner indices)
        const edges = [
            [0,1],[1,2],[2,3],[3,0], // Back face
            [4,5],[5,6],[6,7],[7,4], // Front face
            [0,4],[1,5],[2,6],[3,7]  // Connecting edges
        ];
        
        const center = new THREE.Vector3(0, 0, 0);
        
        // Define only 4 key nodes at face centers
        const keyNodes = [
            new THREE.Vector3(0, halfSize, 0),   // Top
            new THREE.Vector3(0, -halfSize, 0),  // Bottom
            new THREE.Vector3(-halfSize, 0, 0),  // Left
            new THREE.Vector3(halfSize, 0, 0)    // Right
        ];
        
        // Material for cube edges - purple
        const edgeLineMaterial = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });
        
        // Material for spokes - purple
        const spokeMaterial = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });
        
        // Draw cube edges
        edges.forEach(([i, j]) => {
            const edgePoints = [corners[i], corners[j]];
            const edgeGeometry = new THREE.BufferGeometry().setFromPoints(edgePoints);
            const edgeLine = new THREE.Line(edgeGeometry, edgeLineMaterial);
            cubeGroup.add(edgeLine);
        });
        
        // Draw only 4 connections from center to key nodes
        keyNodes.forEach(node => {
            const spokePoints = [center, node];
            const spokeGeometry = new THREE.BufferGeometry().setFromPoints(spokePoints);
            const spokeLine = new THREE.Line(spokeGeometry, spokeMaterial);
            cubeGroup.add(spokeLine);
        });
        
        // Add only 4 node spheres - purple
        const nodeGeometry = new THREE.SphereGeometry(0.045, 16, 16);
        const nodeMaterial = new THREE.MeshPhongMaterial({ color: 0x8b5cf6 });
        
        keyNodes.forEach(node => {
            const sphere = new THREE.Mesh(nodeGeometry, nodeMaterial);
            sphere.position.copy(node);
            cubeGroup.add(sphere);
        });
        
        // Add central hub - cyan/blue
        const hubGeometry = new THREE.SphereGeometry(0.09, 16, 16);
        const hubMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x3b82f6,
            emissive: 0x60a5fa,
            emissiveIntensity: 0.7
        });
        
        const centralHub = new THREE.Mesh(hubGeometry, hubMaterial);
        centralHub.position.copy(center);
        cubeGroup.add(centralHub);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const pointLight1 = new THREE.PointLight(0x8b5cf6, 1, 10);
        pointLight1.position.set(2, 1, 2);
        scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0x6366f1, 0.8, 10);
        pointLight2.position.set(-2, -1, -2);
        scene.add(pointLight2);
        
        camera.position.z = 3.2;
        
        // Rotation variables
        let rotation = { x: -0.6, y: 0.8 };
        let targetRotation = { x: -0.6, y: 0.8 };
        let autoRotate = true;
        let autoRotateSpeed = 0.003;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        // Mouse events for interaction
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            autoRotate = false;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaMove = {
                    x: e.clientX - previousMousePosition.x,
                    y: e.clientY - previousMousePosition.y
                };
                
                targetRotation.y += deltaMove.x * 0.01;
                targetRotation.x += deltaMove.y * 0.01;
                
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            setTimeout(() => { autoRotate = true; }, 2000);
        });
        
        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });
        
        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (autoRotate) {
                targetRotation.y += autoRotateSpeed;
            }
            
            rotation.x += (targetRotation.x - rotation.x) * 0.1;
            rotation.y += (targetRotation.y - rotation.y) * 0.1;
            
            cubeGroup.rotation.x = rotation.x;
            cubeGroup.rotation.y = rotation.y;
            
            renderer.render(scene, camera);
        };
        
        animate();
    }
}

customElements.define('custom-navbar', CustomNavbar);