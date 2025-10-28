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
                    width: 100%;
                    top: 0;
                    z-index: 50;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .logo {
                    font-weight: 700;
                    font-size: 1.5rem;
                    background: linear-gradient(to right, #3b82f6, #8b5cf6);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    display: flex;
                    align-items: center;
                }
                .logo-icon {
                    margin-right: 0.5rem;
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
                    <i data-feather="hexagon" class="logo-icon"></i>
                    n8tive.io
                </a>
                <div class="nav-links">
                    <a href="#hero" class="nav-link">Home</a>
                    <a href="#about" class="nav-link">About</a>
                    <a href="#products" class="nav-link">Products</a>
                    <a href="#mission" class="nav-link">Mission</a>
                    <a href="#" class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-sm font-medium">
                        Contact
                    </a>
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