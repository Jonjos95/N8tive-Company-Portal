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
                    color: rgba(255, 255, 255, 0.8);
                }
                .social-link:hover {
                    background: rgba(59, 130, 246, 0.2);
                    transform: translateY(-2px);
                    color: white;
                }
                .social-link svg {
                    width: 20px;
                    height: 20px;
                    stroke: currentColor;
                    fill: none;
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                .social-link i[data-feather] {
                    width: 20px;
                    height: 20px;
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
                            <a href="https://github.com/n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="GitHub" title="GitHub">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                            </a>
                            <a href="https://linkedin.com/company/n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="LinkedIn" title="LinkedIn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                            </a>
                            <a href="https://youtube.com/@n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="YouTube" title="YouTube">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                            </a>
                            <a href="https://twitter.com/n8tive" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="Twitter" title="Twitter">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 class="footer-heading">Services</h3>
                        <div class="footer-links">
                            <a href="#" class="footer-link">Project Manager</a>
                            <a href="#" class="footer-link">SkyTracker Pro</a>
                            <a href="#" class="footer-link">Spreadsheet App</a>
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
        // Wait for Feather library to be available
        const initIcons = () => {
            if (typeof feather !== 'undefined') {
                const icons = this.shadowRoot.querySelectorAll('[data-feather]');
                icons.forEach(el => {
                    try {
                        feather.replace(el);
                    } catch (e) {
                        console.warn('Feather icon replacement failed:', e);
                    }
                });
            } else {
                // Retry if Feather not loaded yet
                setTimeout(initIcons, 50);
            }
        };
        
        // Try immediately, then with delays
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initIcons);
        } else {
            setTimeout(initIcons, 10);
        }
        
        // Also listen for when Feather might load
        window.addEventListener('load', () => {
            setTimeout(initIcons, 100);
        });
    }
}

customElements.define('custom-footer', CustomFooter);