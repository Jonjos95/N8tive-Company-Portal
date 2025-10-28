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

// Advanced scroll-based animations
let ticking = false;
let lastScrollPosition = 0;

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
            // Apply different movement patterns for each card
            switch(index) {
                case 0: // Left card - moves right to left
                    translateX = -cardNormalizedDistance * 30;
                    translateY = Math.abs(cardNormalizedDistance) * 15;
                    break;
                case 1: // Middle card - vertical movement
                    translateY = -cardNormalizedDistance * 40;
                    scale = 1 + (Math.abs(cardNormalizedDistance) * 0.05);
                    break;
                case 2: // Right card - moves left to right
                    translateX = cardNormalizedDistance * 30;
                    translateY = Math.abs(cardNormalizedDistance) * 15;
                    break;
            }
            
            // Fade based on distance from optimal viewing position
            const distanceFactor = Math.abs(cardNormalizedDistance);
            opacity = Math.max(0.4, 1 - (distanceFactor * 0.6));
            
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
    lastScrollPosition = window.pageYOffset;
    
    if (!ticking) {
        window.requestAnimationFrame(() => {
            updateCardPositions(lastScrollPosition);
            ticking = false;
        });
        ticking = true;
    }
}

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