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
                    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
                    animation: spinCubeNav 20s linear infinite;
                    transform-style: preserve-3d;
                }
                @keyframes spinCubeNav {
                    0% {
                        transform: perspective(400px) rotateY(0deg) rotateX(-15deg);
                    }
                    100% {
                        transform: perspective(400px) rotateY(360deg) rotateX(-15deg);
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
                    <svg class="logo-cube-nav" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="navCenterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                                <stop offset="50%" style="stop-color:#6366f1;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <g>
                            <polygon points="60,20 85,32 85,60 60,72 35,60 35,32" 
                                     fill="url(#navCenterGrad)" 
                                     stroke="#6366f1" 
                                     stroke-width="1.5" 
                                     opacity="0.3"/>
                            <line x1="60" y1="20" x2="60" y2="35" stroke="#6366f1" stroke-width="2" opacity="0.6"/>
                            <line x1="85" y1="32" x2="95" y2="45" stroke="#6366f1" stroke-width="2" opacity="0.6"/>
                            <line x1="85" y1="60" x2="95" y2="75" stroke="#6366f1" stroke-width="2" opacity="0.6"/>
                            <line x1="60" y1="72" x2="60" y2="88" stroke="#6366f1" stroke-width="2" opacity="0.6"/>
                            <line x1="35" y1="60" x2="25" y2="75" stroke="#6366f1" stroke-width="2" opacity="0.6"/>
                            <line x1="35" y1="32" x2="25" y2="45" stroke="#6366f1" stroke-width="2" opacity="0.6"/>
                            <polygon points="60,35 95,45 95,75 60,88 25,75 25,45" 
                                     fill="none" 
                                     stroke="#8b5cf6" 
                                     stroke-width="2.5"/>
                            <line x1="60" y1="46" x2="60" y2="20" stroke="#6366f1" stroke-width="1.5" opacity="0.3"/>
                            <line x1="60" y1="46" x2="85" y2="32" stroke="#6366f1" stroke-width="1.5" opacity="0.3"/>
                            <line x1="60" y1="46" x2="85" y2="60" stroke="#6366f1" stroke-width="1.5" opacity="0.3"/>
                            <line x1="60" y1="46" x2="60" y2="72" stroke="#6366f1" stroke-width="1.5" opacity="0.3"/>
                            <line x1="60" y1="46" x2="35" y2="60" stroke="#6366f1" stroke-width="1.5" opacity="0.3"/>
                            <line x1="60" y1="46" x2="35" y2="32" stroke="#6366f1" stroke-width="1.5" opacity="0.3"/>
                            <line x1="60" y1="61" x2="60" y2="35" stroke="#8b5cf6" stroke-width="2"/>
                            <line x1="60" y1="61" x2="95" y2="45" stroke="#8b5cf6" stroke-width="2"/>
                            <line x1="60" y1="61" x2="95" y2="75" stroke="#8b5cf6" stroke-width="2"/>
                            <line x1="60" y1="61" x2="60" y2="88" stroke="#8b5cf6" stroke-width="2"/>
                            <line x1="60" y1="61" x2="25" y2="75" stroke="#8b5cf6" stroke-width="2"/>
                            <line x1="60" y1="61" x2="25" y2="45" stroke="#8b5cf6" stroke-width="2"/>
                            <circle cx="60" cy="20" r="3" fill="#6366f1" opacity="0.6"/>
                            <circle cx="85" cy="32" r="3" fill="#6366f1" opacity="0.6"/>
                            <circle cx="85" cy="60" r="3" fill="#6366f1" opacity="0.6"/>
                            <circle cx="60" cy="72" r="3" fill="#6366f1" opacity="0.6"/>
                            <circle cx="35" cy="60" r="3" fill="#6366f1" opacity="0.6"/>
                            <circle cx="35" cy="32" r="3" fill="#6366f1" opacity="0.6"/>
                            <circle cx="60" cy="35" r="4" fill="#8b5cf6"/>
                            <circle cx="95" cy="45" r="4" fill="#8b5cf6"/>
                            <circle cx="95" cy="75" r="4" fill="#8b5cf6"/>
                            <circle cx="60" cy="88" r="4" fill="#8b5cf6"/>
                            <circle cx="25" cy="75" r="4" fill="#8b5cf6"/>
                            <circle cx="25" cy="45" r="4" fill="#8b5cf6"/>
                            <circle cx="60" cy="46" r="6" fill="url(#navCenterGrad)" opacity="0.5"/>
                            <circle cx="60" cy="61" r="8" fill="url(#navCenterGrad)"/>
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