import { convertScrapedDataToMarkdown } from './utils/dom2md.js';
import { saveToGist } from './utils/github.js';

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "scrapeAndSaveToGist" || request.action === "scrapeAndCopyToClipboard") {
        chrome.storage.sync.get(['pat'], (result) => {
            const pat = result.pat;
            if (!pat && request.action === "scrapeAndSaveToGist") {
                const msg = 'No PAT found, please set one in the extension popup.';
                chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                sendResponse({status: 'error', log_message: msg });
                return true;
            }

            if (!request.payload || !request.payload.conversation || request.payload.conversation.length === 0) {
                const msg = 'Could not find conversation content. Try refreshing the page.';
                chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                sendResponse({status: 'error', log_message: msg });
                return true;
            }

            let markdown = convertScrapedDataToMarkdown(request.payload.title, request.payload.conversation);

            if (request.action === "scrapeAndSaveToGist") {
                const description = request.payload.title || 'Gemini Conversation';
                const pageURL = sender.tab?.url || 'https://aistudio.google.com/';

                saveToGist(markdown, pat, description, pageURL)
                    .then(result => {
                        chrome.tabs.create({ url: result.url });
                        chrome.storage.local.set({log_url: result.url, log_status: 'success', log_message: 'Gist created'});
                        sendResponse({status: 'success'});
                    })
                    .catch(error => {
                        const msg = error.message + ' Please check PAT permissions.';
                        chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                        sendResponse({status: 'error', log_message: msg});
                    });
            } else if (request.action === "scrapeAndCopyToClipboard") {
                sendResponse({status: 'success', log_message: 'Data prepared for clipboard', markdown: markdown});
            }
        });
        return true; // Indicate async response
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url && changeInfo.url.startsWith('https://aistudio.google.com/app/')) {
        chrome.tabs.sendMessage(tabId, {action: "checkAndAddShareButton"});
    }
});
