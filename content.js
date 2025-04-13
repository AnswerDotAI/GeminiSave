function createButton(icon, text, action) {
    let button = document.createElement('button');
    button.className = 'gemini-save-button mat-mdc-icon-button mat-mdc-button-base';
    button.setAttribute('mattooltip', text);
    button.setAttribute('aria-label', text);
    
    let iconElement = document.createElement('span');
    iconElement.className = 'material-symbols-outlined notranslate';
    iconElement.textContent = icon === 'github' ? 'share' : 'content_copy';
    
    button.appendChild(iconElement);
    
    button.addEventListener('click', function() {
        const scrapedData = scrapeConversationFromDOM();
        chrome.runtime.sendMessage({
            action: action === 'github' ? 'scrapeAndSaveToGist' : 'scrapeAndCopyToClipboard', 
            payload: scrapedData
        }, function(response) {
            if (response && response.status === 'error') {
                createBanner(`Error: ${response.log_message}`);
            } else if (response && response.status === 'success' && action !== 'github') {
                navigator.clipboard.writeText(response.markdown);
                createBanner('Copied to clipboard!', 'success', 1000);
            }
        });
    });
    
    return button;
}

function addShareButtons() {
    let buttonContainer = document.querySelector('ms-header-root .header-container .right-side');
    
    if (buttonContainer && !buttonContainer.querySelector('.gemini-save-button')) {
        if (!document.querySelector('link[href*="material-symbols"]')) {
            let materialLink = document.createElement('link');
            materialLink.rel = 'stylesheet';
            materialLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
            document.head.appendChild(materialLink);
        }

        let shareButton = createButton('github', 'Share to Gist', 'github');
        let clipboardButton = createButton('clipboard', 'Copy to Clipboard', 'clipboard');

        buttonContainer.prepend(clipboardButton);
        buttonContainer.prepend(shareButton);
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
                console.log("Failed to add share buttons after maximum attempts");
            }
        }
        tryAddButtons();
    }
}

function scrapeConversationFromDOM() {
    const conversation = [];
    const turns = document.querySelectorAll('ms-chat-turn');

    turns.forEach(turn => {
        const roleElement = turn.querySelector('[data-turn-role]');
        if (!roleElement) return;

        const role = roleElement.getAttribute('data-turn-role').toLowerCase(); // 'user' or 'model'
        let content = '';

        const contentElement = turn.querySelector('ms-cmark-node') || turn.querySelector('.text-chunk');
        if (contentElement) {
            content = contentElement.innerText || contentElement.textContent;
        }

        if (role && content.trim()) {
            conversation.push({
                role: role.toLowerCase(),
                content: content.trim()
            });
        }
    });

    const titleElement = document.querySelector('ms-toolbar h1');
    const title = titleElement ? titleElement.innerText.trim() : 'Gemini Conversation';

    return { title, conversation };
}

checkAndAddShareButtons();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "checkAndAddShareButton") {
        checkAndAddShareButtons();
    }
});

function extractChatId(url) {
    const match = url.match(/aistudio\.google\.com\/app\/prompts\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
}
