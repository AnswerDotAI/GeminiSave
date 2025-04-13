function createButton(icon, text, action) {
    let button = document.createElement('button');
    button.className = 'gemini-save-button mat-mdc-icon-button mat-mdc-button-base mat-unthemed gmat-mdc-button';
    button.setAttribute('mattooltip', text);
    button.setAttribute('aria-label', text);
    
    let iconElement = document.createElement('span');
    iconElement.className = 'material-symbols-outlined notranslate';
    iconElement.textContent = icon === 'github' ? 'share' : 'content_copy';
    
    button.appendChild(iconElement);
    
    let rippleSpan = document.createElement('span');
    rippleSpan.className = 'mat-mdc-button-persistent-ripple mdc-icon-button__ripple';
    button.appendChild(rippleSpan);

    let focusSpan = document.createElement('span');
    focusSpan.className = 'mat-focus-indicator';
    button.appendChild(focusSpan);

    let touchSpan = document.createElement('span');
    touchSpan.className = 'mat-mdc-button-touch-target';
    button.appendChild(touchSpan);
    
    button.addEventListener('click', function() {
        // Don't extract ID here, let background script handle it from sender tab
        console.log('GeminiSave: Button clicked.');
        
        const messageAction = action === 'github' ? 'saveGeminiGist' : 'copyGeminiMarkdown';
        console.log(`GeminiSave: Sending message to background: Action=${messageAction}`);
        
        // Show loading banner immediately
        if (action === 'github') {
            createBanner('Creating Gist...', 'info', 0);  // 0 duration = stay until replaced
        }
        
        // Send only the action, background will get ID from sender.tab.url
        try {
            chrome.runtime.sendMessage({
                action: messageAction
            }, function(response) {
                // Clear any timeout we might have had
                console.log('GeminiSave: Received response from background for button click:', response);
                
                if (chrome.runtime.lastError) {
                    console.error('GeminiSave: Runtime error:', chrome.runtime.lastError.message);
                    createBanner(`Error: ${chrome.runtime.lastError.message}`, 'error', 3000);
                    return;
                }
                
                if (response && response.status === 'error') {
                    console.error('GeminiSave: Background script reported error:', response.log_message);
                    createBanner(`Error: ${response.log_message}`, 'error', 3000);
                } else if (response && response.status === 'success') {
                    if (action === 'github') {
                        createBanner('Gist created successfully!', 'success', 3000);
                    } else {
                        navigator.clipboard.writeText(response.markdown);
                        createBanner('Copied to clipboard!', 'success', 1000);
                    }
                } else {
                    createBanner('Unknown response from background script', 'error', 3000);
                }
            });
        } catch (err) {
            console.error('GeminiSave: Error sending message:', err);
            createBanner(`Error: ${err.message}`, 'error', 3000);
        }
    });
    
    return button;
}

// Create a simple banner notification
function createBanner(message, type = 'info', duration = 3000) {
    // Remove any existing banner
    const existingBanner = document.querySelector('.gemini-save-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    const banner = document.createElement('div');
    banner.className = `gemini-save-banner gemini-save-banner-${type}`;
    banner.textContent = message;
    
    // Apply styles
    banner.style.position = 'fixed';
    banner.style.top = '10px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.padding = '10px 20px';
    banner.style.borderRadius = '4px';
    banner.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    banner.style.zIndex = '10000';
    banner.style.fontSize = '14px';
    
    // Set color based on type
    if (type === 'error') {
        banner.style.backgroundColor = '#f44336';
        banner.style.color = 'white';
    } else if (type === 'success') {
        banner.style.backgroundColor = '#4caf50';
        banner.style.color = 'white';
    } else {
        banner.style.backgroundColor = '#2196f3';
        banner.style.color = 'white';
    }
    
    document.body.appendChild(banner);
    
    // Automatically remove after duration (if not 0)
    if (duration > 0) {
        setTimeout(() => {
            if (banner.parentNode) {
                banner.remove();
            }
        }, duration);
    }
    
    return banner;
}

/**
 * Add Material Icons stylesheet to the document
 */
function addMaterialIcons() {
    if (document.querySelector('link[href*="material-symbols"]')) {
        return; // Already added
    }
    
    if (!document.head) {
        // If document.head is not available, try again later
        console.log('GeminiSave: document.head not available, will retry later');
        setTimeout(addMaterialIcons, 100);
        return;
    }
    
    let materialLink = document.createElement('link');
    materialLink.rel = 'stylesheet';
    materialLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
    document.head.appendChild(materialLink);
    console.log('GeminiSave: Added Material Icons stylesheet');
}

function addShareButtons() {
    let buttonContainer = document.querySelector('ms-header-root .header-container .right-side');
    
    if (buttonContainer && !buttonContainer.querySelector('.gemini-save-button')) {
        // Add material icons stylesheet safely
        addMaterialIcons();

        let shareButton = createButton('github', 'Share to Gist', 'github');
        let clipboardButton = createButton('clipboard', 'Copy to Clipboard', 'clipboard');

        buttonContainer.prepend(clipboardButton);
        buttonContainer.prepend(shareButton);
        
        console.log('GeminiSave: Added share buttons to the UI');
    }
}

function checkAndAddShareButtons() {
    if (window.location.href.startsWith('https://aistudio.google.com/app/')) {
        const maxAttempts = 15;
        let attempts = 0;

        function tryAddButtons() {
            if (attempts < maxAttempts) {
                addShareButtons();
                if (!document.querySelector('.gemini-save-button')) {
                    attempts++;
                    setTimeout(tryAddButtons, 1000);
                }
            } else {
                console.log("GeminiSave: Failed to add share buttons after maximum attempts");
            }
        }
        tryAddButtons();
    }
}

// Initialize the buttons - wait for document to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndAddShareButtons);
} else {
    checkAndAddShareButtons();
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "checkAndAddShareButton") {
        checkAndAddShareButtons();
    }
});
