window.HELP_IMPROVE_VIDEOJS = false;

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (container && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('moreWorksDropdown');
        const button = document.querySelector('.more-works-btn');
        dropdown.classList.remove('show');
        button.classList.remove('active');
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    const copyText = button.querySelector('.copy-text');
    
    if (bibtexElement) {
        navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
            // Success feedback
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = bibtexElement.textContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.classList.add('copied');
            copyText.textContent = 'Cop';
            setTimeout(function() {
                button.classList.remove('copied');
                copyText.textContent = 'Copy';
            }, 2000);
        });
    }
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Video carousel autoplay when in view
function setupVideoCarouselAutoplay() {
    const carouselVideos = document.querySelectorAll('.results-carousel video');
    
    if (carouselVideos.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Video is in view, play it
                video.play().catch(e => {
                    // Autoplay failed, probably due to browser policy
                    console.log('Autoplay prevented:', e);
                });
            } else {
                // Video is out of view, pause it
                video.pause();
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the video is visible
    });
    
    carouselVideos.forEach(video => {
        observer.observe(video);
    });
}

// Teaser image carousel
function setupTeaserCarousel() {
    const carousel = document.querySelector('.teaser-carousel');
    if (!carousel) return;

    const viewport = carousel.querySelector('.teaser-carousel-viewport');
    const slides = Array.from(carousel.querySelectorAll('.teaser-slide'));
    const dots = Array.from(carousel.querySelectorAll('.teaser-dot'));
    if (!viewport || slides.length === 0) return;

    let index = slides.findIndex(slide => slide.classList.contains('is-active'));
    if (index < 0) index = 0;

    const setActive = (activeIndex) => {
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('is-active', slideIndex === activeIndex);
        });
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('is-active', dotIndex === activeIndex);
        });
    };

    const activate = (nextIndex) => {
        if (nextIndex < 0 || nextIndex >= slides.length) return;
        setActive(nextIndex);
        index = nextIndex;
    };

    activate(index);

    const controls = carousel.querySelectorAll('.teaser-carousel-btn');
    controls.forEach(control => {
        control.addEventListener('click', (event) => {
            event.preventDefault();
            const direction = control.getAttribute('data-direction');
            if (direction === 'prev') {
                index = (index - 1 + slides.length) % slides.length;
            } else {
                index = (index + 1) % slides.length;
            }
            activate(index);
        });
    });

    dots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', () => activate(dotIndex));
    });
}

// Abstract collapse button inside details
function setupAbstractCollapse() {
    const details = document.querySelector('.abstract-details');
    if (!details) return;

    const collapseButton = details.querySelector('.abstract-collapse-btn');
    if (!collapseButton) return;

    collapseButton.addEventListener('click', () => {
        details.removeAttribute('open');
        details.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
}

// Focused section highlighting
function setupFocusSections() {
    const sections = Array.from(document.querySelectorAll('.focus-section'));
    if (sections.length === 0) return;

    document.body.classList.add('has-focus-sections');

    const setActive = (activeSection) => {
        sections.forEach(section => {
            section.classList.toggle('is-active', section === activeSection);
            section.classList.toggle('is-dim', section !== activeSection);
        });
    };

    const getClosestSection = () => {
        const viewportCenter = window.innerHeight / 2;
        let closest = sections[0];
        let closestDistance = Infinity;

        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const sectionCenter = rect.top + rect.height / 2;
            const distance = Math.abs(sectionCenter - viewportCenter);

            if (distance < closestDistance) {
                closestDistance = distance;
                closest = section;
            }
        });

        return closest;
    };

    let activeSection = getClosestSection();
    setActive(activeSection);

    const observer = new IntersectionObserver(() => {
        const nextSection = getClosestSection();
        if (nextSection && nextSection !== activeSection) {
            activeSection = nextSection;
            setActive(activeSection);
        }
    }, {
        root: null,
        rootMargin: '-10% 0px -10% 0px',
        threshold: [0.05, 0.2, 0.4, 0.6, 0.8]
    });

    sections.forEach(section => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', function() {
    // Check for click events on the navbar burger icon

    var options = {
		slidesToScroll: 1,
		slidesToShow: 1,
		loop: true,
		infinite: true,
		autoplay: true,
		autoplaySpeed: 5000,
    };

	// Initialize all div with carousel class (if bulma carousel is available)
    if (window.bulmaCarousel) {
        window.bulmaCarousel.attach('.carousel', options);
    }

    if (window.bulmaSlider) {
        window.bulmaSlider.attach();
    }

    // Setup video autoplay for carousel
    setupVideoCarouselAutoplay();

    // Focus section blur effect
    setupFocusSections();

    // Teaser carousel
    setupTeaserCarousel();

    // Abstract collapse
    setupAbstractCollapse();
});
