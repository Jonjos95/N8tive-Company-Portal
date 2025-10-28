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

// Staggered animation for cards
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) scale(1)';
            }, index * 150);
        }
    });
}, {
    threshold: 0.2
});

// Observe vertical cards with staggered animation
setTimeout(() => {
    document.querySelectorAll('.vertical-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px) scale(0.95)';
        card.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        cardObserver.observe(card);
    });
}, 100);

// Interactive card enhancements
function initializeCardInteractions() {
    // Add 3D tilt effect to vertical cards
    document.querySelectorAll('.vertical-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
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

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('#hero');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});