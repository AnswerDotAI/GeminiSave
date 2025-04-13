import { convertApiResponseToMarkdown, processApiResponse } from './utils/api2md.js';
import { saveToGist } from './utils/github.js';

// Register the network interceptor script dynamically
async function registerInterceptorScript() {
    try {
        await chrome.scripting.unregisterContentScripts(); // Clear existing dynamic scripts first
        await chrome.scripting.registerContentScripts([{
            id: 'gemini-interceptor',
            matches: ['https://aistudio.google.com/*'],
            js: ['network-interceptor.js'],
            runAt: 'document_start',
            world: 'MAIN' // Inject into the page's main world
        }]);
        console.log('GeminiSave: Network interceptor registered successfully');
    } catch (error) {
        console.error('GeminiSave: Error registering network interceptor:', error);
    }
}

// Register the script when the extension starts
registerInterceptorScript();

/**
 * Message handler for different actions
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`GeminiSave [background]: Received message with action: ${message.action}`, 
                sender ? `from tab: ${sender.tab?.url}` : 'no sender');
    
    switch (message.action) {
        case 'capturedGetPrompt':
            handleCapturedGetPrompt(message, sender, sendResponse);
            return true; // Indicates we'll respond asynchronously
            
        case 'getConversations':
            // Return all stored conversations
            getAllStoredConversations((conversations) => {
                sendResponse({ 
                    status: 'success', 
                    conversations: conversations 
                });
            });
            return true;
            
        case 'getConversation':
            // Return a specific conversation by ID
            if (!message.conversationId) {
                sendResponse({ status: 'error', message: 'Missing conversationId parameter' });
                return true;
            }
            
            getConversationById(message.conversationId, (conversation) => {
                if (conversation) {
                    sendResponse({ status: 'success', conversation });
                } else {
                    sendResponse({ status: 'error', message: 'Conversation not found' });
                }
            });
            return true;
            
        case 'deleteConversation':
            // Delete a specific conversation
            if (!message.conversationId) {
                sendResponse({ status: 'error', message: 'Missing conversationId parameter' });
                return true;
            }
            
            deleteConversation(message.conversationId, (success) => {
                if (success) {
                    sendResponse({ status: 'success' });
                } else {
                    sendResponse({ status: 'error', message: 'Failed to delete conversation' });
                }
            });
            return true;
            
        case "saveGeminiGist":
        case "copyGeminiMarkdown":
            console.log(`GeminiSave: [${Date.now()}] ENTERING save/copy block`);
            
            // Return true immediately to indicate async response
            const asyncResponse = true;
            
            // Extract conversation ID from sender tab URL
            let conversationId = null;
            if (sender.tab && sender.tab.url) {
                const match = sender.tab.url.match(/aistudio\.google\.com(?:\/u\/\d+)?\/(?:app\/)?prompts\/([a-zA-Z0-9_-]+)/);
                conversationId = match ? match[1] : null;
                console.log('GeminiSave: Extracted ID from sender URL for save/copy:', conversationId);
            } else {
                console.error('GeminiSave: Sender tab or URL missing, cannot extract ID.', sender);
            }
            
            if (!conversationId) {
                 const msg = 'Error: Could not extract conversation ID from sender tab URL.';
                 console.error('GeminiSave:', msg);
                 chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                 sendResponse({status: 'error', log_message: msg });
                 return asyncResponse; // Indicate async response
            }
            
            // Form the storage key
            const storageKey = 'GeminiSave_LastPromptData'; // Use the key set by the interceptor
            console.log(`GeminiSave: Looking for LAST captured GetPrompt data with key: ${storageKey} for action: ${message.action}`);
            
            // DEBUG: Check storage right before attempting to get the data
            chrome.storage.local.get(null, function(allItems) {
                console.log("GeminiSave: DEBUG - Current chrome.storage.local keys:", Object.keys(allItems));
                
                if (allItems[storageKey]) {
                    console.log(`GeminiSave: DEBUG - Data for key ${storageKey} EXISTS right before get attempt.`);
                } else {
                    console.warn(`GeminiSave: DEBUG - Data for key ${storageKey} DOES NOT EXIST right before get attempt.`);
                }
            });
            // END DEBUG
            
            chrome.storage.sync.get(['pat'], (syncResult) => {
                const pat = syncResult.pat;
                if (!pat && message.action === "saveGeminiGist") {
                    const msg = 'No PAT found, please set one in the extension popup.';
                    console.error('GeminiSave:', msg);
                    chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                    sendResponse({status: 'error', log_message: msg });
                    // No need to return true here as sendResponse is sync within this callback
                    return; // Exit this callback
                }

                // Get the stored API response data using the conversation ID extracted from the URL
                console.log('GeminiSave: Looking for conversation data at key:', storageKey);
                
                chrome.storage.local.get([storageKey], (localResult) => {
                    if (chrome.runtime.lastError) {
                         console.error(`GeminiSave: Error getting data for key ${storageKey}:`, chrome.runtime.lastError);
                         const msg = `Storage error: ${chrome.runtime.lastError.message}`;
                         sendResponse({status: 'error', log_message: msg });
                         return;
                    }
                    
                    const apiData = localResult[storageKey];
                    
                    if (!apiData) {
                        const msg = 'Could not find conversation data. Please wait for the conversation to fully load or try refreshing the page.';
                        console.error('GeminiSave: Data not found in storage for key:', storageKey);
                        chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                        sendResponse({status: 'error', log_message: msg });
                        return;
                    }
                    
                    // Continue with the data
                    continueWithData(apiData);
                });
                
                // Helper function to avoid duplicating code
                function continueWithData(apiData) {
                    console.log('GeminiSave: Found conversation data', apiData);
                    let processedData;
                    let markdown;

                    // 1. Process the raw API data first
                    try {
                        processedData = processApiResponse(apiData);
                        if (processedData.error) {
                             throw new Error(processedData.error); // Throw if processing function returned an error object
                        }
                        if (!processedData || !processedData.messages) {
                            throw new Error('Processing API response failed to produce messages.');
                        }
                    } catch (processingError) {
                        const msg = `Error processing API data: ${processingError.message}`;
                        console.error('GeminiSave:', msg, processingError);
                        chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                        sendResponse({status: 'error', log_message: msg});
                        return; // Stop execution here
                    }

                    // 2. Convert the *processed* data to Markdown
                    try {
                        // Construct the object convertApiResponseToMarkdown expects
                        markdown = convertApiResponseToMarkdown({ 
                            title: processedData.title, 
                            conversation: processedData.messages // Pass the messages array as 'conversation'
                        });
                    } catch (conversionError) {
                        const msg = `Error converting data to Markdown: ${conversionError.message}`;
                        console.error('GeminiSave:', msg, conversionError);
                        chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                        sendResponse({status: 'error', log_message: msg});
                        return; // Stop execution here
                    }

                    if (message.action === "saveGeminiGist") {
                        const description = processedData.title || 'Gemini Conversation';
                        const pageURL = sender.tab?.url || 'https://aistudio.google.com/';

                        saveToGist(markdown, pat, description, pageURL)
                            .then(result => {
                                console.log('GeminiSave: Gist created successfully', result);
                                chrome.tabs.create({ url: result.url });
                                chrome.storage.local.set({log_url: result.url, log_status: 'success', log_message: 'Gist created'});
                                sendResponse({status: 'success', log_message: 'Gist created successfully', url: result.url});
                            })
                            .catch(error => {
                                const msg = error.message + ' Please check PAT permissions.';
                                console.error('GeminiSave: Error creating gist', error);
                                chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                                sendResponse({status: 'error', log_message: msg});
                            });
                    } else if (message.action === "copyGeminiMarkdown") {
                        console.log('GeminiSave: Preparing markdown for clipboard');
                        sendResponse({status: 'success', log_message: 'Data prepared for clipboard', markdown: markdown});
                    }
                }
            });
            return asyncResponse; // Return the same value as above
        default:
            console.log(`GeminiSave [background]: Unknown action: ${message.action}`);
            sendResponse({ status: 'error', message: 'Unknown action' });
    }
});

/**
 * Handle the receipt of a captured GetPrompt message from the content script
 * This contains the raw conversation data we need to process and store
 * @param {*} message Message containing the raw response data
 * @param {*} sender Information about the sender (tab, etc)
 * @param {*} sendResponse Callback to send a response
 * @returns {boolean} Whether we intend to respond asynchronously
 */
function handleCapturedGetPrompt(message, sender, sendResponse) {
    console.log('GeminiSave [background]: Received capturedGetPrompt message', 
        'Message keys:', Object.keys(message),
        'Content type:', typeof message.content, 
        'Content present:', message.content ? 'Yes' : 'No',
        'Data size:', typeof message.content === 'string' ? message.content.length : 'unknown');
    
    try {
        if (!message.content) {
            console.error('GeminiSave [background]: No content in capturedGetPrompt message', 'Full message:', JSON.stringify(message).substring(0, 200) + '...');
            sendResponse({status: 'error', error: 'No content in message'});
            return false;
        }
        
        // Parse the content if it's a string (from stringified JSON)
        let contentData = message.content;
        
        if (typeof contentData === 'string') {
            console.log('GeminiSave [background]: Content is a string, first 100 chars:', contentData.substring(0, 100));
            
            // Check if the string looks like JSON and try to parse it
            if ((contentData.startsWith('{') && contentData.endsWith('}')) || 
                (contentData.startsWith('[') && contentData.endsWith(']'))) {
                try {
                    console.log('GeminiSave [background]: String appears to be JSON, attempting to parse');
                    contentData = JSON.parse(contentData);
                    console.log('GeminiSave [background]: Successfully parsed JSON content:', 
                                'Type:', typeof contentData,
                                'Is array:', Array.isArray(contentData),
                                'Length:', Array.isArray(contentData) ? contentData.length : 'N/A');
                    
                    if (Array.isArray(contentData) && contentData.length > 0) {
                        console.log('GeminiSave [background]: First item keys:', Object.keys(contentData[0] || {}));
                    } else if (typeof contentData === 'object' && contentData !== null) {
                        console.log('GeminiSave [background]: Object keys:', Object.keys(contentData));
                    }
                } catch (parseError) {
                    console.error('GeminiSave [background]: Error parsing JSON content:', parseError, 'Content sample:', contentData.substring(0, 200));
                    // Continue with the string version if parsing fails
                }
            } else {
                console.log('GeminiSave [background]: Content is a string but does not appear to be JSON');
            }
        } else {
            console.log('GeminiSave [background]: Content is not a string:', 
                        'Type:', typeof contentData,
                        'Is array:', Array.isArray(contentData),
                        'Sample:', typeof contentData === 'object' ? JSON.stringify(contentData).substring(0, 100) : contentData);
        }
        
        const responseData = processApiResponse(contentData);
        console.log('GeminiSave [background]: Processed API response:', 
            responseData.conversationId ? `ID: ${responseData.conversationId}` : 'No ID',
            responseData.title ? `Title: ${responseData.title}` : 'No title',
            responseData.messages ? `Messages: ${responseData.messages.length}` : 'No messages',
            responseData.error ? `Error: ${responseData.error}` : 'No error');
        
        // If there was an error in processing, report it and don't proceed
        if (responseData.error) {
            console.error('GeminiSave [background]: Error processing API response:', responseData.error);
            sendResponse({status: 'error', error: responseData.error});
            return false;
        }
        
        // Ensure we have required data
        if (!responseData.conversationId) {
            console.error('GeminiSave [background]: No conversation ID in processed response');
            sendResponse({status: 'error', error: 'No conversation ID found'});
            return false;
        }
        
        if (!responseData.messages || !Array.isArray(responseData.messages) || responseData.messages.length === 0) {
            console.error('GeminiSave [background]: No messages in processed response');
            sendResponse({status: 'error', error: 'No messages found'});
            return false;
        }
        
        // Convert the conversation to markdown and HTML
        const markdown = convertApiResponseToMarkdown(responseData);
        
        // Store the data
        storeConversationData(responseData.conversationId, {
            title: responseData.title || 'Untitled Conversation',
            timestamp: Date.now(),
            markdown,
            // Store the raw conversation messages
            conversation: responseData.messages,
            url: sender.tab ? sender.tab.url : 'unknown'
        });
        
        // Update the badge
        updateConversationCountBadge();
        
        // Send success response
        sendResponse({status: 'success', received_action: 'capturedGetPrompt', conversationId: responseData.conversationId});
        return false;
    } catch (error) {
        console.error('GeminiSave [background]: Error handling capturedGetPrompt message:', error, error.stack);
        sendResponse({status: 'error', error: error.message});
        return false;
    }
}

// Send message to content script to add buttons when a tab is updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // Check if the page is fully loaded and the URL matches
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://aistudio.google.com/app/')) {
        console.log('GeminiSave: Detected Gemini page load/update, telling content script to check buttons.');
        // Tell the content script to add buttons
        chrome.tabs.sendMessage(tabId, {action: "checkAndAddShareButton"}, response => {
            if (chrome.runtime.lastError) {
                console.warn('GeminiSave: Could not send message to content script (maybe it is not ready yet?):', chrome.runtime.lastError.message);
            } else {
                console.log('GeminiSave: Message sent to content script successfully.');
            }
        });
    }
});

/**
 * Store a processed conversation in chrome.storage.local
 * @param {Object} conversation - The processed conversation data
 */
function storeConversationData(conversationId, conversation) {
    if (!conversation || !conversationId) {
        console.error('GeminiSave [background]: Invalid conversation data for storage');
        return;
    }

    const storageKey = `gemini_conversation_${conversationId}`;
    
    // Add timestamp if not present
    if (!conversation.savedAt) {
        conversation.savedAt = new Date().toISOString();
    }
    
    console.log(`GeminiSave [background]: Storing conversation with ID ${conversationId}`);
    
    // Use chrome.storage.local instead of localStorage
    chrome.storage.local.set({ [storageKey]: conversation }, () => {
        if (chrome.runtime.lastError) {
            console.error('GeminiSave [background]: Error storing conversation:', chrome.runtime.lastError);
            return;
        }
        
        console.log(`GeminiSave [background]: Successfully stored conversation with ID ${conversationId}`);
        
        // Update the badge count after successful storage
        updateConversationCountBadge();
    });
}

/**
 * Update the extension badge with the number of stored conversations
 */
function updateConversationCountBadge() {
    // Get all keys that start with gemini_conversation_
    chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
            console.error('GeminiSave [background]: Error getting stored conversations:', chrome.runtime.lastError);
            return;
        }
        
        const conversationKeys = Object.keys(result).filter(key => 
            key.startsWith('gemini_conversation_'));
        
        const count = conversationKeys.length;
        console.log(`GeminiSave [background]: Setting badge count to ${count}`);
        
        // Update the badge
        chrome.action.setBadgeText({ text: count.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#4285F4' }); // Google Blue
    });
}

/**
 * Get a list of all stored conversations
 * @param {Function} callback - Function to call with the list of conversations
 */
function getAllStoredConversations(callback) {
    chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
            console.error('GeminiSave [background]: Error getting stored conversations:', chrome.runtime.lastError);
            callback([]);
            return;
        }
        
        const conversations = [];
        
        for (const key in result) {
            if (key.startsWith('gemini_conversation_')) {
                conversations.push(result[key]);
            }
        }
        
        // Sort by savedAt date, newest first
        conversations.sort((a, b) => {
            return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
        });
        
        callback(conversations);
    });
}

/**
 * Get a specific conversation by ID
 * @param {string} conversationId - The ID of the conversation to retrieve
 * @param {Function} callback - Function to call with the conversation data
 */
function getConversationById(conversationId, callback) {
    const storageKey = `gemini_conversation_${conversationId}`;
    
    chrome.storage.local.get(storageKey, (result) => {
        if (chrome.runtime.lastError) {
            console.error(`GeminiSave [background]: Error getting conversation ${conversationId}:`, chrome.runtime.lastError);
            callback(null);
            return;
        }
        
        const conversation = result[storageKey];
        callback(conversation || null);
    });
}

/**
 * Delete a conversation by ID
 * @param {string} conversationId - The ID of the conversation to delete
 * @param {Function} callback - Function to call when deletion is complete
 */
function deleteConversation(conversationId, callback) {
    const storageKey = `gemini_conversation_${conversationId}`;
    
    chrome.storage.local.remove(storageKey, () => {
        if (chrome.runtime.lastError) {
            console.error(`GeminiSave [background]: Error deleting conversation ${conversationId}:`, chrome.runtime.lastError);
            callback(false);
            return;
        }
        
        console.log(`GeminiSave [background]: Deleted conversation ${conversationId}`);
        
        // Update badge count after deletion
        updateConversationCountBadge();
        
        callback(true);
    });
}
