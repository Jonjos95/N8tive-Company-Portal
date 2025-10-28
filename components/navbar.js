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
                    font-size: 1.5rem;
                    background: linear-gradient(to right, #a78bfa, #8b5cf6);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .logo-cube-nav {
                    width: 32px;
                    height: 32px;
                    animation: spinCubeNav 20s linear infinite;
                    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
                }
                @keyframes spinCubeNav {
                    0% {
                        transform: rotateY(0deg) rotateX(0deg);
                    }
                    100% {
                        transform: rotateY(360deg) rotateX(360deg);
                    }
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
                .contact-btn {
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
                .contact-btn:hover {
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
                <a href="#" class="logo">
                    <svg class="logo-cube-nav" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="navCubeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
                            </linearGradient>
                            <linearGradient id="navCubeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                            </linearGradient>
                            <linearGradient id="navCubeGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#a78bfa;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <g>
                            <polygon points="50,15 75,28 75,48 50,61 25,48 25,28" fill="url(#navCubeGrad1)" opacity="0.9"/>
                            <polygon points="25,48 25,28 50,15 50,35" fill="url(#navCubeGrad2)" opacity="0.7"/>
                            <polygon points="50,35 50,15 75,28 75,48" fill="url(#navCubeGrad3)" opacity="0.8"/>
                            <polygon points="50,35 62,42 62,56 50,63 38,56 38,42" fill="#4c1d95" opacity="0.6"/>
                            <circle cx="50" cy="48" r="8" fill="#7c3aed" opacity="0.5"/>
                            <circle cx="50" cy="48" r="4" fill="#a78bfa" opacity="0.8"/>
                        </g>
                    </svg>
                    N8tive.io
                </a>
                <div class="nav-links">
                    <a href="#hero" class="nav-link">Home</a>
                    <a href="#about" class="nav-link">About</a>
                    <a href="#demo" class="nav-link">Demo</a>
                    <a href="#products" class="nav-link">Products</a>
                    <a href="#mission" class="nav-link">Mission</a>
                    <a href="#" class="contact-btn">Contact</a>
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
    }
}

customElements.define('custom-navbar', CustomNavbar);