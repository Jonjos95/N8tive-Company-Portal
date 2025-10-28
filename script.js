// Shared functionality
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle functionality will be added here if needed
    console.log('n8tive.io portal loaded');
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Initialize card interactions
    initializeCardInteractions();
});

// Enhanced Intersection Observer for scroll animations
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
});

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    sectionObserver.observe(section);
});

// Staggered animation for cards with entrance effect
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.classList.contains('has-entered')) {
            const cards = Array.from(document.querySelectorAll('.vertical-card'));
            const index = cards.indexOf(entry.target);
            
            setTimeout(() => {
                entry.target.classList.add('entering', 'has-entered');
                
                // Remove entering class after animation completes
                setTimeout(() => {
                    entry.target.classList.remove('entering');
                }, 800);
            }, index * 150);
        }
    });
}, {
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px'
});

// Observe vertical cards with staggered animation
setTimeout(() => {
    document.querySelectorAll('.vertical-card').forEach((card) => {
        card.style.opacity = '0';
        cardObserver.observe(card);
    });
}, 100);

// Interactive card enhancements
function initializeCardInteractions() {
    // Add 3D tilt effect to vertical cards
    document.querySelectorAll('.vertical-card').forEach((card, index) => {
        // Store the card's current scroll-based transform
        let scrollTransform = { x: 0, y: 0, scale: 1, opacity: 1 };
        
        // Update scroll transform storage
        const storeScrollTransform = () => {
            const transform = card.style.transform;
            const opacity = card.style.opacity;
            
            // Parse current transform values
            const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            
            if (translateMatch) {
                scrollTransform.x = parseFloat(translateMatch[1]) || 0;
                scrollTransform.y = parseFloat(translateMatch[2]) || 0;
            }
            if (scaleMatch) {
                scrollTransform.scale = parseFloat(scaleMatch[1]) || 1;
            }
            scrollTransform.opacity = parseFloat(opacity) || 1;
        };
        
        card.addEventListener('mouseenter', storeScrollTransform);
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            // Combine scroll transform with tilt effect
            card.style.transform = `
                translate(${scrollTransform.x}px, ${scrollTransform.y - 8}px) 
                scale(${scrollTransform.scale * 1.02}) 
                perspective(1000px) 
                rotateX(${rotateX}deg) 
                rotateY(${rotateY}deg)
            `;
        });
        
        card.addEventListener('mouseleave', () => {
            // Restore scroll-based transform
            card.style.transform = `translate(${scrollTransform.x}px, ${scrollTransform.y}px) scale(${scrollTransform.scale})`;
        });
    });

    // Add click ripple effect
    document.querySelectorAll('.tech-icon, .viz-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(59, 130, 246, 0.5)';
            ripple.style.width = '20px';
            ripple.style.height = '20px';
            ripple.style.pointerEvents = 'none';
            
            const rect = this.getBoundingClientRect();
            ripple.style.left = (e.clientX - rect.left - 10) + 'px';
            ripple.style.top = (e.clientY - rect.top - 10) + 'px';
            
            this.style.position = 'relative';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.style.transform = 'scale(4)';
                ripple.style.opacity = '0';
                ripple.style.transition = 'all 0.6s ease-out';
            }, 10);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Advanced scroll-based animations with bidirectional support
let ticking = false;
let lastScrollPosition = 0;
let scrollDirection = 'down'; // Track scroll direction

function updateCardPositions(scrollPos) {
    const cards = document.querySelectorAll('.vertical-card');
    const aboutSection = document.querySelector('#about');
    
    if (!aboutSection) return;
    
    const sectionTop = aboutSection.offsetTop;
    const sectionHeight = aboutSection.offsetHeight;
    const windowHeight = window.innerHeight;
    
    // Calculate section visibility
    const sectionMid = sectionTop + (sectionHeight / 2);
    const viewportMid = scrollPos + (windowHeight / 2);
    const distanceFromCenter = viewportMid - sectionMid;
    const normalizedDistance = distanceFromCenter / windowHeight;
    
    cards.forEach((card, index) => {
        const cardTop = card.offsetTop + sectionTop;
        const cardMid = cardTop + (card.offsetHeight / 2);
        const cardDistanceFromViewport = viewportMid - cardMid;
        const cardNormalizedDistance = cardDistanceFromViewport / windowHeight;
        
        // Dynamic parallax based on scroll position
        let translateX = 0;
        let translateY = 0;
        let scale = 1;
        let opacity = 1;
        
        // Calculate if card is in viewport
        const isInViewport = cardTop < (scrollPos + windowHeight) && (cardTop + card.offsetHeight) > scrollPos;
        
        if (isInViewport) {
            // Bidirectional movement - adjust based on scroll direction
            const directionMultiplier = scrollDirection === 'down' ? 1 : 1.1;
            
            // Apply different movement patterns for each card
            switch(index) {
                case 0: // Left card - moves right to left
                    translateX = -cardNormalizedDistance * 30 * directionMultiplier;
                    translateY = Math.abs(cardNormalizedDistance) * 15;
                    break;
                case 1: // Middle card - vertical movement
                    translateY = -cardNormalizedDistance * 40 * directionMultiplier;
                    scale = 1 + (Math.abs(cardNormalizedDistance) * 0.05);
                    break;
                case 2: // Right card - moves left to right
                    translateX = cardNormalizedDistance * 30 * directionMultiplier;
                    translateY = Math.abs(cardNormalizedDistance) * 15;
                    break;
            }
            
            // Fade based on distance from optimal viewing position
            const distanceFactor = Math.abs(cardNormalizedDistance);
            opacity = Math.max(0.4, 1 - (distanceFactor * 0.6));
            
            // Smooth easing based on direction
            const transitionSpeed = scrollDirection === 'down' ? '0.5s' : '0.6s';
            card.style.transition = `all ${transitionSpeed} cubic-bezier(0.16, 1, 0.3, 1)`;
            
            // Apply smooth transformation
            card.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            card.style.opacity = opacity;
            
            // Add/remove phase classes for additional effects
            if (distanceFactor > 0.8) {
                card.classList.add('scroll-phase-out');
                card.classList.remove('scroll-phase-in');
            } else {
                card.classList.add('scroll-phase-in');
                card.classList.remove('scroll-phase-out');
            }
        }
    });
    
    // Hero parallax
    const hero = document.querySelector('#hero');
    if (hero) {
        hero.style.transform = `translateY(${scrollPos * 0.5}px)`;
    }
}

function onScroll() {
    const currentScrollPosition = window.pageYOffset;
    
    // Determine scroll direction
    if (currentScrollPosition > lastScrollPosition) {
        scrollDirection = 'down';
    } else if (currentScrollPosition < lastScrollPosition) {
        scrollDirection = 'up';
    }
    
    lastScrollPosition = currentScrollPosition;
    
    if (!ticking) {
        window.requestAnimationFrame(() => {
            updateCardPositions(lastScrollPosition);
            updateDemoSection(lastScrollPosition, scrollDirection);
            ticking = false;
        });
        ticking = true;
    }
}

// Enhanced bidirectional animation for demo section
function updateDemoSection(scrollPos, direction) {
    const demoSection = document.querySelector('#demo');
    if (!demoSection) return;
    
    const sectionTop = demoSection.offsetTop;
    const sectionHeight = demoSection.offsetHeight;
    const windowHeight = window.innerHeight;
    
    // Check if demo section is in viewport
    const isInView = scrollPos + windowHeight > sectionTop && scrollPos < sectionTop + sectionHeight;
    
    // Calculate progress through section (0 to 1)
    const progress = Math.max(0, Math.min(1, (scrollPos + windowHeight - sectionTop) / (sectionHeight + windowHeight)));
    
    // Trigger entrance animations for demo cards
    const demoCards = document.querySelectorAll('.demo-card');
    demoCards.forEach((card, index) => {
        if (isInView && progress > 0.2) {
            // Trigger entrance animation once
            if (!card.classList.contains('animate-in')) {
                setTimeout(() => {
                    card.classList.add('animate-in');
                }, index * 100);
            }
        }
        
        // Continue with scroll-based transformations after entrance
        if (card.classList.contains('animate-in')) {
            const delay = index * 0.05;
            const cardProgress = Math.max(0, Math.min(1, (progress - 0.3 - delay) * 1.5));
            
            if (direction === 'down' && cardProgress > 0) {
                // Forward scroll - subtle drift
                const translateY = Math.sin(cardProgress * Math.PI) * -10;
                const rotateZ = Math.sin(cardProgress * Math.PI) * 2;
                const scale = 1 + (Math.sin(cardProgress * Math.PI) * 0.02);
                
                card.style.transform = `translateY(${translateY}px) scale(${scale}) rotateZ(${rotateZ}deg)`;
            } else if (direction === 'up' && cardProgress > 0) {
                // Backward scroll - reverse drift
                const translateY = Math.sin(cardProgress * Math.PI) * -10;
                const rotateZ = Math.sin(cardProgress * Math.PI) * -2;
                const scale = 1 + (Math.sin(cardProgress * Math.PI) * 0.02);
                
                card.style.transform = `translateY(${translateY}px) scale(${scale}) rotateZ(${rotateZ}deg)`;
            }
        }
    });
    
    // Animate showcase items with enhanced triggering
    const showcaseItems = document.querySelectorAll('.showcase-item');
    showcaseItems.forEach((item, index) => {
        const itemProgress = Math.max(0, Math.min(1, (progress - 0.3 - (index * 0.2)) * 2));
        
        // More sensitive trigger for showcase items
        if (itemProgress > 0.3 && !item.classList.contains('active')) {
            setTimeout(() => {
                item.classList.add('active');
                item.classList.add(direction === 'down' ? 'scroll-forward' : 'scroll-backward');
                item.classList.remove(direction === 'down' ? 'scroll-backward' : 'scroll-forward');
            }, index * 100);
        }
    });
    
    // Parallax effect for demo section background
    const gridBg = demoSection.querySelector('.demo-grid-bg');
    if (gridBg) {
        const bgProgress = (scrollPos - sectionTop) * 0.3;
        gridBg.style.transform = `translateY(${bgProgress}px)`;
    }
}

// Animate metric numbers counting up
function animateNumbers() {
    const metricNumbers = document.querySelectorAll('.metric-number');
    
    metricNumbers.forEach((number, index) => {
        const target = parseInt(number.getAttribute('data-target'));
        const duration = 1500; // 1.5 seconds
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        
        setTimeout(() => {
            const counter = setInterval(() => {
                current += increment;
                if (current >= target) {
                    number.textContent = target;
                    clearInterval(counter);
                } else {
                    number.textContent = Math.floor(current);
                }
            }, duration / steps);
        }, 500 + (index * 100)); // Stagger the animations
    });
}

// Observe demo cards for animation trigger
const demoCardsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animate-in')) {
            // Add animate-in class to trigger CSS animations
            setTimeout(() => {
                entry.target.classList.add('animate-in');
            }, 50);
            
            // Trigger number animations when cards are visible
            if (entry.target.querySelector('.metric-number')) {
                setTimeout(() => {
                    // Only animate if we want counting effect, otherwise just show the number
                    const metrics = entry.target.querySelectorAll('.metric-number');
                    metrics.forEach(metric => {
                        const target = parseInt(metric.getAttribute('data-target'));
                        metric.textContent = target; // Show final value immediately
                    });
                }, 300);
            }
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '50px'
});

// Observe demo cards
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const demoCards = document.querySelectorAll('.demo-card');
        demoCards.forEach((card, index) => {
            // Start with cards visible but not animated
            card.style.opacity = '0';
            demoCardsObserver.observe(card);
            
            // Check if card is already in viewport on load
            const rect = card.getBoundingClientRect();
            const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
            if (isInViewport) {
                setTimeout(() => {
                    card.classList.add('animate-in');
                    card.style.opacity = '1';
                }, 300 + (index * 200));
            }
        });
    }, 100);
});

// Observe showcase items for entrance animations
const showcaseObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('active')) {
            setTimeout(() => {
                entry.target.classList.add('active');
            }, 100);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
});

// Observe all showcase items
setTimeout(() => {
    document.querySelectorAll('.showcase-item').forEach((item) => {
        showcaseObserver.observe(item);
    });
}, 100);

// Initialize scroll animations
window.addEventListener('scroll', onScroll);

// Initial position update
setTimeout(() => {
    updateCardPositions(window.pageYOffset);
}, 500);

// Update on resize
window.addEventListener('resize', () => {
    updateCardPositions(window.pageYOffset);
});