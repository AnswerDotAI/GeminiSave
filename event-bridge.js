console.log('GeminiSave: Event bridge script loaded.');

const STORAGE_KEY = 'GeminiSave_LastPromptData';

// Listen for messages from the window (posted by network interceptor)
window.addEventListener('message', function(event) {
    // Basic security check: Verify the source and message type
    if (event.source !== window || !event.data || event.data.type !== "GeminiSave_GetPromptData") {
        return;
    }

    const receivedTime = Date.now();
    console.log(`GeminiSave [Event Bridge]: Received GeminiSave_GetPromptData message at ${receivedTime}`);

    const payload = event.data.payload;

    if (!payload) {
        console.error('GeminiSave [Event Bridge]: Received message has no payload.');
        return;
    }

    // Save the received payload to chrome.storage.local
    chrome.storage.local.set({ [STORAGE_KEY]: payload }, () => {
        if (chrome.runtime.lastError) {
            console.error(`GeminiSave [Event Bridge]: Error saving data via chrome.storage: ${chrome.runtime.lastError.message}`);
        } else {
            const savedTime = Date.now();
            console.log(`GeminiSave [Event Bridge]: Successfully saved data to chrome.storage.local under key \'${STORAGE_KEY}\'. Timestamp: ${savedTime}`);
            // Optional: Send message to background script if needed immediately after save
            // chrome.runtime.sendMessage({ action: "dataSaved", storageKey: STORAGE_KEY });
        }
    });
}, false); 