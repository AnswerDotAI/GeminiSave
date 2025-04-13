// Function to escape HTML special characters only within code blocks
function escapeHtml(str) {
    const entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return str.replace(/[&<>"']/g, match => entityMap[match]);
}

/**
 * Converts the Gemini API response data to Markdown format
 * @param {object} apiData - The processed API response data
 * @returns {string} Formatted markdown string
 */
function convertApiResponseToMarkdown(apiData) {
    const { title, conversation } = apiData;
    const bits = [];
    bits.push(`# ${title || 'Gemini Conversation'}`);
    bits.push(''); // Add a blank line

    conversation.forEach(turn => {
        const role = turn.role === 'user' ? 'User' : 'Model';
        const emoji = turn.role === 'user' ? '🧑' : '✨'; // Use sparkle emoji for Gemini
        bits.push(`## ${emoji} ${role}`);
        bits.push('');
        
        if (turn.content) {
            const contentLines = turn.content.split('\n');
            let inCodeBlock = false;
            
            contentLines.forEach(line => {
                if (line.trim().startsWith('```')) {
                    inCodeBlock = !inCodeBlock;
                    bits.push(line);
                } 
                else {
                    // Do not escape HTML at all - let GitHub Markdown renderer handle the content
                    bits.push(line);
                }
            });
            
            if (inCodeBlock) {
                bits.push('```');
            }
        }
        
        bits.push('');
        bits.push('---'); // Separator between turns
        bits.push('');
    });

    return bits.join('\n').trim();
}

/**
 * Process the raw API response data from the GetPrompt endpoint
 * @param {*} response The raw JSON array from the GetPrompt endpoint
 * @returns {Object} Object containing conversationId, title, and a filtered array of messages
 */
function processApiResponse(response) {
    console.log(`GeminiSave [api2md]: Processing API response, data type: ${typeof response}, length: ${typeof response === 'string' ? response.length : 'unknown'}`);
    
    try {
        // Handle string data that might not be parsed yet
        if (typeof response === 'string') {
            try {
                response = JSON.parse(response);
                console.log('GeminiSave [api2md]: Parsed string data to object');
            } catch (error) {
                console.error('GeminiSave [api2md]: Failed to parse string data:', error);
                return { error: 'Failed to parse response data' };
            }
        }

        // Check if we have a valid response structure
        if (!response || (typeof response !== 'object' && !Array.isArray(response))) {
            console.error('GeminiSave [api2md]: Invalid response format', response);
            return { error: 'Invalid response format' };
        }

        console.log('GeminiSave [api2md]: Response format:', 
            Array.isArray(response) ? 'array' : 'object',
            'with length:', Array.isArray(response) ? response.length : Object.keys(response).length);

        // Log first level structure for debugging
        if (Array.isArray(response)) {
            console.log('GeminiSave [api2md]: Array indices present:', 
                response.map((_, idx) => idx).filter(idx => response[idx] !== undefined));
        } else {
            console.log('GeminiSave [api2md]: Object keys:', Object.keys(response));
        }

        // Try to determine conversation ID and title
        let conversationId = '';
        let title = 'Untitled Conversation';
        let messages = [];

        // 1. First attempt - direct extraction if available
        if (typeof response === 'object' && !Array.isArray(response)) {
            if (response.conversationId) {
                conversationId = response.conversationId;
                console.log('GeminiSave [api2md]: Found conversationId in object root:', conversationId);
            }
            
            if (response.title) {
                title = response.title;
                console.log('GeminiSave [api2md]: Found title in object root:', title);
            }
            
            if (response.messages && Array.isArray(response.messages)) {
                messages = response.messages;
                console.log('GeminiSave [api2md]: Found messages in root.messages:', messages.length);
            } 
            else if (response.conversation && Array.isArray(response.conversation)) {
                messages = response.conversation;
                console.log('GeminiSave [api2md]: Found messages in root.conversation:', messages.length);
            }
        } 
        // 2. For array responses, check various indices where data might be
        else if (Array.isArray(response)) {
            // Common indices where the conversation data might be found
            const possibleIndices = [0, 1, 2, 4, 12, 13];

            // --- Check for NEW Gemini Structure at response[13] - START ---
            if (response[13] && Array.isArray(response[13])) {
                console.log(`GeminiSave [api2md]: Examining response[13] as potential new message format:`, 
                             Array.isArray(response[13]) ? `Array with ${response[13].length} items` : typeof response[13]);
                
                // This is the newer Gemini structure where messages are in a 2D array at index 13
                if (response[13].length > 0 && Array.isArray(response[13][0])) {
                    try {
                        const formattedMessages = [];
                        
                        // Loop through the outer array - each element represents a conversation turn
                        for (const messageArray of response[13]) {
                            if (!Array.isArray(messageArray)) {
                                continue;
                            }
                            
                            // Loop through the inner message array for this turn
                            for (const message of messageArray) {
                                // Check if we have a valid message structure
                                if (!Array.isArray(message) || message.length < 9) {
                                    continue;
                                }
                                
                                const text = message[0];
                                const role = message[8]; // 'user' or 'model'
                                
                                // For model messages, we only want the final output (not thinking)
                                const isFinalModelOutput = (role === 'model' && message.length > 16 && message[16] === 1);
                                const isUserMessage = (role === 'user' && text && text.trim().length > 0);
                                
                                // Only include user messages and final model outputs
                                if ((isUserMessage || isFinalModelOutput) && text) {
                                    formattedMessages.push({
                                        role: role,
                                        content: text.trim()
                                    });
                                    
                                    console.log(`GeminiSave [api2md]: Extracted message from response[13] - ${role}: ${text.substring(0, 50)}...`);
                                }
                            }
                        }
                        
                        if (formattedMessages.length > 0) {
                            console.log(`GeminiSave [api2md]: Successfully extracted ${formattedMessages.length} conversation turns from response[13]`);
                            messages = formattedMessages;
                            
                            // Extract title from index [4][0] which is the common location
                            if (response[4] && Array.isArray(response[4]) && typeof response[4][0] === 'string') {
                                title = response[4][0];
                                console.log(`GeminiSave [api2md]: Found title at response[4][0]: ${title}`);
                            }
                        }
                    } catch (err) {
                        console.error(`GeminiSave [api2md]: Error processing new format at response[13]:`, err);
                    }
                }
            }
            // --- Check for NEW Gemini Structure at response[13] - END ---
            
            // --- Specific Gemini Structure Check START ---
            if (messages.length === 0 && response[4] && Array.isArray(response[4])) {
                // Try extracting title from response[4][0]
                if (typeof response[4][0] === 'string') {
                    title = response[4][0];
                    console.log(`GeminiSave [api2md]: Found title via specific path response[4][0]: ${title}`);
                }
                // Try extracting messages from response[4][4]
                if (response[4][4] && Array.isArray(response[4][4])) {
                    messages = response[4][4];
                    console.log(`GeminiSave [api2md]: Found messages via specific path response[4][4]: ${messages.length} potential turns`);
                    
                    // Log a sample of the first message to understand its structure
                    if (messages.length > 0) {
                        console.log(`GeminiSave [api2md]: First message sample structure:`, JSON.stringify(messages[0]));
                    }
                    
                    // For Gemini format, the structure is complex - let's transform it directly
                    // Initial items in the array may be metadata/timestamps/headers
                    // Messages typically start after first 2-3 items that are metadata
                    try {
                        const processedMessages = [];
                        let isUserTurn = true; // First real message is usually from user
                        
                        // Skip first items which are typically metadata (timestamps, user info, etc.)
                        // In this case, we've observed the actual content messages often start at index 2+
                        for (let i = 2; i < messages.length; i++) {
                            const msgItem = messages[i];
                            
                            // Skip any null/undefined items
                            if (!msgItem) continue;
                            
                            // If it's an array with a string at index 1, that's likely the content
                            if (Array.isArray(msgItem) && typeof msgItem[1] === 'string' && msgItem[1].trim() !== '') {
                                processedMessages.push({
                                    role: isUserTurn ? 'user' : 'model',
                                    content: msgItem[1].trim()
                                });
                                
                                // Toggle for next message
                                isUserTurn = !isUserTurn;
                                
                                console.log(`GeminiSave [api2md]: Extracted direct message: ${isUserTurn ? 'model' : 'user'}: ${msgItem[1].substring(0, 50)}...`);
                            }
                        }
                        
                        if (processedMessages.length > 0) {
                            console.log(`GeminiSave [api2md]: Successfully extracted ${processedMessages.length} conversation turns directly from Gemini format`);
                            return {
                                conversationId: 'generated_' + Date.now(),
                                title: title,
                                messages: processedMessages
                            };
                        }
                    } catch (directParseError) {
                        console.error(`GeminiSave [api2md]: Error during direct parsing of Gemini format:`, directParseError);
                        // Fall back to standard processing if direct approach fails
                    }
                }
            }
            // --- Specific Gemini Structure Check END ---
            
            // If we didn't find messages in the new format, try other locations
            if (messages.length === 0) {
                for (const idx of possibleIndices) {
                    if (response[idx] && typeof response[idx] === 'object') {
                        console.log(`GeminiSave [api2md]: Examining response[${idx}]:`, Object.keys(response[idx]));
                        
                        const item = response[idx];
                        
                        // Check for conversationId
                        if (item.conversationId) {
                            conversationId = item.conversationId;
                            console.log(`GeminiSave [api2md]: Found conversationId at response[${idx}]:`, conversationId);
                        }
                        
                        // Check for title
                        if (item.title) {
                            title = item.title;
                            console.log(`GeminiSave [api2md]: Found title at response[${idx}]:`, title);
                        }
                        
                        // Check for messages array
                        if (item.messages && Array.isArray(item.messages)) {
                            messages = item.messages;
                            console.log(`GeminiSave [api2md]: Found messages at response[${idx}].messages:`, messages.length);
                            break; // We found messages, no need to continue
                        }
                        
                        // Check for conversation array
                        if (item.conversation && Array.isArray(item.conversation)) {
                            messages = item.conversation;
                            console.log(`GeminiSave [api2md]: Found messages at response[${idx}].conversation:`, messages.length);
                            break; // We found messages, no need to continue
                        }
                        
                        // Special case - check if the item itself is a messages array
                        if (Array.isArray(item) && item.length > 0 && 
                            (item[0].role || item[0].author || item[0].author_role)) {
                            messages = item;
                            console.log(`GeminiSave [api2md]: Found messages directly at response[${idx}]:`, messages.length);
                            break;
                        }
                    }
                }
            }
            
            // If we didn't find anything in common locations, try a deeper search
            if (messages.length === 0) {
                console.log('GeminiSave [api2md]: No messages found in common locations, performing deeper search');
                
                // Try to find a data structure that looks like messages
                for (const idx in response) {
                    const item = response[idx];
                    
                    // Special handling for array items that might contain the data
                    if (item && typeof item === 'object') {
                        // If this is an array that looks like messages (has role/author/content properties)
                        if (Array.isArray(item) && item.length > 0 && typeof item[0] === 'object') {
                            const sampleItem = item[0];
                            if (sampleItem.role || sampleItem.author || sampleItem.parts || sampleItem.content) {
                                messages = item;
                                console.log(`GeminiSave [api2md]: Found potential messages at response[${idx}]:`, messages.length);
                                break;
                            }
                        }
                        
                        // For nested objects, check for message arrays
                        const objKeys = Object.keys(item);
                        for (const key of objKeys) {
                            if (Array.isArray(item[key]) && item[key].length > 0 && typeof item[key][0] === 'object') {
                                const candidateArray = item[key];
                                const sampleItem = candidateArray[0];
                                
                                if (sampleItem.role || sampleItem.author || sampleItem.parts || sampleItem.content) {
                                    messages = candidateArray;
                                    console.log(`GeminiSave [api2md]: Found potential messages at response[${idx}].${key}:`, messages.length);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // If we found messages, process them
        if (messages.length > 0) {
            console.log('GeminiSave [api2md]: Processing found messages, first message keys:', 
                        Object.keys(messages[0]));
            
            // Convert messages to a consistent format
            const conversation = messages.map((msg, idx) => {
                // Log each message structure for debugging
                console.log(`GeminiSave [api2md]: Raw Message ${idx} Structure:`, JSON.stringify(msg));
                
                // Detect the role (user or model)
                const role = msg.role || 
                            msg.author || 
                            (msg.author_role === 'USER' ? 'user' : 'model') ||
                            // --- Specific Gemini Structure Check START ---
                            // Infer role based on presence/content of author details array (often at index 2)
                            (Array.isArray(msg) && msg[2] && msg[2][0] && msg[2][0].toLowerCase().includes('user') ? 'user' : 'model');
                            // --- Specific Gemini Structure Check END ---

                console.log(`GeminiSave [api2md]: Message ${idx} role detected as: ${role}`);
                
                // Extract the content, which could be in various places
                let content = '';

                if (Array.isArray(msg)) {
                    // If msg is an array, try index 1 first for simple string content
                    if (typeof msg[1] === 'string') {
                        content = msg[1];
                        console.log(`GeminiSave [api2md]: Extracted content from msg[1]`);
                    }
                    // Add checks for other potential indices if structure is different
                    else if (typeof msg[0] === 'string' && msg[0].includes('17')) {
                        // This is likely a timestamp, and the message text is probably in the next element
                        if (typeof msg[1] === 'string') {
                            content = msg[1];
                            console.log(`GeminiSave [api2md]: Extracted content from msg[1] after timestamp`);
                        }
                    }
                    // If other indices have content, add more checks
                    else if (msg.length > 3 && typeof msg[3] === 'string') {
                        content = msg[3];  // Try position 3 - sometimes content is here
                        console.log(`GeminiSave [api2md]: Extracted content from msg[3]`);
                    }

                } else if (typeof msg === 'object' && msg !== null) {
                    // If msg is an object, try common properties
                    if (msg.content && typeof msg.content === 'string') {
                        content = msg.content;
                        console.log(`GeminiSave [api2md]: Extracted content from msg.content`);
                    } else if (msg.parts && Array.isArray(msg.parts)) {
                        // Handle parts array (assuming text parts)
                        content = msg.parts
                            .map(part => (typeof part === 'string' ? part : part?.text || ''))
                            .join('');
                        console.log(`GeminiSave [api2md]: Extracted content from msg.parts`);
                    } else if (msg.candidates && Array.isArray(msg.candidates) && msg.candidates.length > 0) {
                        // Handle candidates array (simplified: take first candidate's parts/content)
                        const candidate = msg.candidates[0];
                        if (candidate?.parts && Array.isArray(candidate.parts)) {
                             content = candidate.parts
                                .map(part => (typeof part === 'string' ? part : part?.text || ''))
                                .join('');
                             console.log(`GeminiSave [api2md]: Extracted content from msg.candidates[0].parts`);
                        } else if (candidate?.content && typeof candidate.content === 'string') {
                            content = candidate.content;
                            console.log(`GeminiSave [api2md]: Extracted content from msg.candidates[0].content`);
                        }
                    }
                    // Add checks for other potential object properties if needed
                }

                console.log(`GeminiSave [api2md]: Message ${idx} final content:`, content.substring(0, 50) + '...');

                return {
                    role: role,
                    content: content.trim() // Ensure content is trimmed
                };
            });
            
            console.log(`GeminiSave [api2md]: Final conversation has ${conversation.length} messages`);
            
            // Generate a conversation ID if we couldn't find one
            if (!conversationId) {
                conversationId = `generated_${Date.now()}`;
                console.log('GeminiSave [api2md]: Generated conversationId:', conversationId);
            }
            
            // Filter out any messages with empty content before returning
            const filteredConversation = conversation.filter(msg => msg.content && msg.content.trim() !== '');
            console.log(`GeminiSave [api2md]: After filtering: ${filteredConversation.length} of ${conversation.length} messages have content`);
            
            // Return the structured data including the processed conversation
            return {
                conversationId: conversationId, // Might be empty if not found
                title: title,
                messages: filteredConversation // The filtered array with only non-empty messages
            };
        } else {
            // If no messages array was found after all checks
            console.error('GeminiSave [api2md]: Could not find conversation data in the response after checking known structures.');
            return { error: 'Could not find conversation data in the response' };
        }
    } catch (error) {
        console.error('GeminiSave [api2md]: Unexpected error during API response processing:', error);
        return { error: 'Unexpected error processing response: ' + error.message };
    }
} 

export { convertApiResponseToMarkdown, processApiResponse }; 