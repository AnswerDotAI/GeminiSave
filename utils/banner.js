function createBanner(message, type = 'error', timeout = 8000) {
    // Ensure the banner styles exist before creating a banner
    ensureBannerStyles();
    
    const banner = document.createElement('article');
    banner.className = type === 'error' ? 'error' : 'success';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        margin: 0;
        padding: 1rem;
        text-align: center;
        z-index: 9999;
        animation: slideDown 0.5s ease-out;
    `;
    banner.innerHTML = `<p>${message}</p>`;
    
    // Make sure body exists before appending
    if (document.body) {
        document.body.prepend(banner);
        
        // Set a timeout to remove the banner after 8 seconds
        setTimeout(() => {
            banner.style.animation = 'slideUp 0.5s ease-in';
            setTimeout(() => banner.remove(), 500);
        }, timeout);
    } else {
        // If document.body doesn't exist yet, wait for it
        window.addEventListener('DOMContentLoaded', () => {
            document.body.prepend(banner);
            
            // Set a timeout to remove the banner after 8 seconds
            setTimeout(() => {
                banner.style.animation = 'slideUp 0.5s ease-in';
                setTimeout(() => banner.remove(), 500);
            }, timeout);
        });
    }
}

// Create banner styles if they don't exist yet
function ensureBannerStyles() {
    // Check if styles already exist
    if (document.getElementById('gemini-save-banner-styles')) {
        return; // Styles already added
    }
    
    const style = document.createElement('style');
    style.id = 'gemini-save-banner-styles';
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
        @keyframes slideUp {
            from { transform: translateY(0); }
            to { transform: translateY(-100%); }
        }
        article.error {
            background-color: #d30c00;
            border-color: #d30c00;
            color: white;
        }
        article.success {
            background-color: #125019;
            border-color: #125019;
            color: white;
        }
    `;
    
    // Safely append style to document
    const appendStyle = () => {
        if (document.head) {
            document.head.appendChild(style);
        } else {
            // If document.head doesn't exist yet, try again later
            setTimeout(appendStyle, 50);
        }
    };
    
    appendStyle();
}

// Initialize banner styles when script loads
if (document.readyState === 'loading') {
    // If document is still loading, wait for it to finish
    window.addEventListener('DOMContentLoaded', ensureBannerStyles);
} else {
    // Document already loaded, run immediately
    ensureBannerStyles();
}
