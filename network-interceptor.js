// Flag to avoid re-injecting the script
if (!window._geminiSaveInterceptorInjected) {
    window._geminiSaveInterceptorInjected = true;
    
    console.log(`GeminiSave: Interceptor active.`); // Simplified startup log
    
    /**
     * Checks if a URL is likely to be a GetPrompt API call
     * @param {string} url - The URL to check
     * @returns {boolean} - True if it appears to be a GetPrompt API call
     */
    function isGetPromptUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Look for the exact MakerSuiteService/GetPrompt pattern which appears stable
        if (url.includes('MakerSuiteService/GetPrompt')) {
            return true;
        }
        
        // Fallback to more generic pattern if the above fails
        const endsWithGetPrompt = url.endsWith('/GetPrompt');
        const containsExpectedPatterns = (
            url.includes('makersuite') || 
            url.includes('alkali') || 
            url.includes('google')
        );
        
        const isMatch = endsWithGetPrompt && containsExpectedPatterns;
        
        return isMatch;
    }
    
    // Original fetch function
    const originalFetch = window.fetch;
    
    // Override fetch to intercept GetPrompt API calls
    window.fetch = async function(resource, options) {
        const requestUrl = (typeof resource === 'string') ? resource : resource?.url;
        
        let isTargetRequest = false;
        if (requestUrl && typeof requestUrl === 'string') {
             isTargetRequest = isGetPromptUrl(requestUrl);
        }
        
        // Call the original fetch
        const response = await originalFetch.apply(this, arguments);
        
        try {
            // Check if this was identified as a GetPrompt request
            if (isTargetRequest) {
                const interceptTime = Date.now();
                console.log(`GeminiSave: [${interceptTime}] Intercepted GetPrompt (fetch):`, requestUrl);
                
                // Clone the response to avoid consuming it
                const responseClone = response.clone();
                
                // Process the response asynchronously
                responseClone.text().then(textData => {
                    try {
                        const jsonData = JSON.parse(textData);
                        if (jsonData && Array.isArray(jsonData)) {
                            const parsedTimeFetch = Date.now();
                            console.log(`GeminiSave: [${parsedTimeFetch}] Parsed & Saving GetPrompt data (fetch)...`);
                            
                            // Add debug logging to verify structure - particularly index 13 (conversation messages)
                            console.log(`GeminiSave DEBUG: Response array length: ${jsonData.length}`);
                            console.log(`GeminiSave DEBUG: Has title (index[4][0]): ${jsonData[4] && jsonData[4][0] ? 'Yes: ' + jsonData[4][0] : 'No'}`);
                            console.log(`GeminiSave DEBUG: Has conversations (index[13]): ${jsonData[13] && Array.isArray(jsonData[13]) ? 'Yes, with ' + jsonData[13].length + ' items' : 'No'}`);
                             
                             // Post message to the window for potential listeners (like event-bridge)
                             window.postMessage({
                                type: "GeminiSave_GetPromptData", 
                                payload: jsonData 
                            }, "*"); // Target origin * might be too broad, consider locking down if possible
                            
                        } else {
                            console.error(`GeminiSave: [${Date.now()}] Parsed GetPrompt data is not a non-empty array (fetch):`, typeof jsonData);
                        }
                    } catch(parseError) {
                         console.error(`GeminiSave: [${Date.now()}] Error PARSING GetPrompt response (fetch):`, parseError);
                    }
                }).catch(error => {
                    console.error(`GeminiSave: [${Date.now()}] Error reading GetPrompt response text (fetch):`, error);
                });
            }
        } catch (error) {
            console.error(`GeminiSave: [${Date.now()}] Error in network interceptor (fetch):`, error);
        }
        
        // Return the original response
        return response;
    };
    
    // Also intercept XMLHttpRequest for older browsers or different API calls
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        console.log(`GeminiSave: [${Date.now()}] [Interceptor] XHR open: ${method} ${url}`);
        this._geminiSaveUrl = url;
        this._geminiSaveMethod = method;
        return originalXHROpen.apply(this, [method, url, ...rest]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
        const xhr = this;
        let isTargetRequest = false;
        const sendTime = Date.now();
        
        console.log(`GeminiSave: [${sendTime}] [Interceptor] XHR send called for URL: ${xhr._geminiSaveUrl}`);
        
        // Check if this is a GetPrompt request using our flexible pattern matching
        if (xhr._geminiSaveUrl && 
            typeof xhr._geminiSaveUrl === 'string') {
                
            isTargetRequest = isGetPromptUrl(xhr._geminiSaveUrl) && xhr._geminiSaveMethod === 'POST';
        }
            
        if (isTargetRequest) {
            console.log(`GeminiSave: [${sendTime}] [Interceptor] Identified TARGET GetPrompt request (XHR):`, xhr._geminiSaveUrl);
            const originalOnReadyStateChange = xhr.onreadystatechange;
            
            xhr.onreadystatechange = function() {
                const stateChangeTime = Date.now();
                console.log(`GeminiSave: [${stateChangeTime}] [Interceptor] XHR readyState changed: ${xhr.readyState} for URL: ${xhr._geminiSaveUrl}`);
                if (xhr.readyState === 4 && xhr.status === 200) {
                    try {
                        console.log(`GeminiSave: [${Date.now()}] [Interceptor] XHR GetPrompt request completed successfully`);
                        const responseText = xhr.responseText;
                        console.log(`GeminiSave: [${Date.now()}] [Interceptor] Raw text response (XHR):`, responseText.substring(0, 500) + '...'); // Log raw text
                        const responseData = JSON.parse(responseText);
                        
                        if (responseData && Array.isArray(responseData)) {
                            const parsedTimeXHR = Date.now();
                            console.log(`GeminiSave: [${parsedTimeXHR}] Parsed & Saving GetPrompt data (XHR)...`); // Simplified log
                            
                            // Add debug logging to verify structure - particularly index 13 (conversation messages)
                            console.log(`GeminiSave DEBUG XHR: Response array length: ${responseData.length}`);
                            console.log(`GeminiSave DEBUG XHR: Has title (index[4][0]): ${responseData[4] && responseData[4][0] ? 'Yes: ' + responseData[4][0] : 'No'}`);
                            console.log(`GeminiSave DEBUG XHR: Has conversations (index[13]): ${responseData[13] && Array.isArray(responseData[13]) ? 'Yes, with ' + responseData[13].length + ' items' : 'No'}`);
                            
                            // Post message to the window instead of dispatching event
                            const messageToPost = { 
                                type: "GeminiSave_GetPromptData", 
                                payload: responseData 
                            };
                            
                            window.postMessage(messageToPost, "*"); // Target origin * might be too broad, consider locking down if possible
                            
                        } else {
                            console.error(`GeminiSave: [${Date.now()}] [Interceptor] XHR GetPrompt response is not a non-empty array:`, typeof responseData);
                        }
                    } catch (error) {
                        // Log the error and optionally the raw text separately
                        console.error(`GeminiSave: [${Date.now()}] [Interceptor] Error processing XHR GetPrompt response. Error:`, error);
                        if (xhr.responseText) {
                           console.error(`GeminiSave: [${Date.now()}] [Interceptor] Raw text during XHR error: ${xhr.responseText.substring(0, 500)}...`);
                        }
                    }
                } else if (xhr.readyState === 4) { // Log non-200 status for the target request
                     console.error(`GeminiSave: [${Date.now()}] XHR GetPrompt request failed with status ${xhr.status} for URL: ${xhr._geminiSaveUrl}`);
                }
                
                // Call the original onreadystatechange
                if (originalOnReadyStateChange) {
                    originalOnReadyStateChange.apply(this, arguments);
                }
            };
        }
        
        return originalXHRSend.apply(this, args);
    };
    
    console.log(`GeminiSave: [${Date.now()}] Network interception setup complete (FINAL)`);
} else {
    console.log(`GeminiSave: Interceptor already active.`); // Simplified re-injection log
} 