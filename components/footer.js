class CustomFooter extends HTMLElement {
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                footer {
                    background: rgba(17, 24, 39, 0.8);
                    backdrop-filter: blur(10px);
                    padding: 3rem 2rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .footer-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 3rem;
                }
                .footer-logo {
                    font-weight: 700;
                    font-size: 1.5rem;
                    background: linear-gradient(to right, #3b82f6, #8b5cf6);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    margin-bottom: 1rem;
                    display: inline-flex;
                    align-items: center;
                }
                .footer-description {
                    color: rgba(255, 255, 255, 0.6);
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }
                .footer-links {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .footer-link {
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .footer-link:hover {
                    color: white;
                }
                .footer-heading {
                    color: white;
                    font-weight: 600;
                    margin-bottom: 1.25rem;
                    font-size: 1.1rem;
                }
                .social-links {
                    display: flex;
                    gap: 1rem;
                }
                .social-link {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .social-link:hover {
                    background: rgba(59, 130, 246, 0.2);
                    transform: translateY(-2px);
                }
                .copyright {
                    text-align: center;
                    margin-top: 3rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.875rem;
                }
                @media (max-width: 768px) {
                    .footer-content {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
            <footer>
                <div class="footer-content">
                    <div>
                        <div class="footer-logo">
                            <i data-feather="hexagon" class="logo-icon"></i>
                            n8tive.io
                        </div>
                        <p class="footer-description">
                            Building intuitive web tools for the modern digital landscape.
                        </p>
                        <div class="social-links">
                            <a href="https://github.com/n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="GitHub">
                                <i data-feather="github"></i>
                            </a>
                            <a href="https://linkedin.com/company/n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="LinkedIn">
                                <i data-feather="linkedin"></i>
                            </a>
                            <a href="https://youtube.com/@n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="YouTube">
                                <i data-feather="youtube"></i>
                            </a>
                            <a href="https://twitter.com/n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Twitter">
                                <i data-feather="twitter"></i>
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 class="footer-heading">Products</h3>
                        <div class="footer-links">
                            <a href="#" class="footer-link">Project Manager</a>
                            <a href="#" class="footer-link">SkyTracker Pro</a>
                            <a href="#" class="footer-link">Codefolio Nexus</a>
                            <a href="#" class="footer-link">Automate Flow</a>
                        </div>
                    </div>
                    <div>
                        <h3 class="footer-heading">Company</h3>
                        <div class="footer-links">
                            <a href="#about" class="footer-link">About Us</a>
                            <a href="#mission" class="footer-link">Our Mission</a>
                            <a href="#" class="footer-link">Careers</a>
                            <a href="#" class="footer-link">Contact</a>
                        </div>
                    </div>
                    <div>
                        <h3 class="footer-heading">Legal</h3>
                        <div class="footer-links">
                            <a href="#" class="footer-link">Privacy Policy</a>
                            <a href="#" class="footer-link">Terms of Service</a>
                            <a href="#" class="footer-link">Cookie Policy</a>
                        </div>
                    </div>
                </div>
                <div class="copyright">
                    &copy; ${new Date().getFullYear()} n8tive.io. All rights reserved.
                </div>
            </footer>
        `;
        
        // Initialize Feather icons within shadow DOM
        this.shadowRoot.querySelectorAll('[data-feather]').forEach(el => {
            feather.replace(el);
        });
    }
}

customElements.define('custom-footer', CustomFooter);