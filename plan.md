
Okay, I need to see the code first to make a detailed plan specific to your implementation.

I'll read the `content.js` file to understand how it currently handles the network interception and processes the response data.

Read file: content.js

Okay, I've reviewed `content.js`. It looks like this script mainly handles adding the UI buttons ("Share to Gist", "Copy to Clipboard") to the Gemini page and sending messages to a *background script* when those buttons are clicked. It doesn't do the network interception or data processing itself.

The core logic for fetching the conversation data, parsing it, and interacting with the Gist API must be in your background script (often `background.js` or `service-worker.js`, check your `manifest.json` if you're unsure).

Here’s a detailed plan focused on what needs to happen in that **background script**:

1.  **Locate the Listener:** Find the message listener in the background script that handles the `saveGeminiGist` action sent from `content.js` (`chrome.runtime.onMessage.addListener`).
2.  **Identify Data Source:** Inside this listener, determine how the script gets the conversation JSON data.
    *   Does it intercept the `/GetPrompt` network request directly using `chrome.webRequest` or `chrome.debugger` API? If so, find where it accesses the response body.
    *   Does it re-fetch the data using the conversation ID (extracted from the sender tab's URL)? If so, find the `fetch` or `XMLHttpRequest` call and where it handles the JSON response.
3.  **Analyze Current Parsing Logic:** Examine the code that processes the JSON response (let's call the parsed JSON `responseData`).
    *   Confirm it's likely extracting the title correctly, e.g., `title = responseData[4][0]`.
    *   Identify the part where it attempts to extract messages. It's probably looking in the wrong place or only grabbing the first element.
4.  **Implement Correct Message Extraction:**
    *   Access the main message array: `const messageArray = responseData[13];`
    *   Initialize an empty array or string to store the formatted conversation: `let formattedConversation = [];`
    *   Iterate through `messageArray`:
        ```javascript
        for (const message of messageArray) {
           // Check if message structure is valid (basic check)
           if (!Array.isArray(message) || message.length < 9) {
              continue; // Skip malformed entries
           }

           const text = message[0];
           const role = message[8];
           const isFinalModelOutput = (role === 'model' && message.length > 16 && message[16] === 1);
           const isUserMessage = (role === 'user' && text && text.trim().length > 0);

           if (isUserMessage) {
              formattedConversation.push(`User: ${text.trim()}`);
           } else if (isFinalModelOutput) {
              formattedConversation.push(`Model: ${text.trim()}`);
           }
           // Skip other message types (like model's internal thinking)
        }
        ```
5.  **Format for Gist:** Join the extracted messages into a single string: `const gistContent = formattedConversation.join('\\n\\n');` (using double newlines for separation).
6.  **Update Gist Payload:** Find the code that prepares the data for the GitHub Gist API call. Ensure it uses the `gistContent` string (containing the full conversation) and the `title` variable for the Gist description and filename. The structure usually looks something like:
    ```javascript
    const gistPayload = {
      description: title,
      public: false, // or true, based on preference
      files: {
        [`${title.replace(/ /g, '_')}.md`]: { // Create a filename from the title
          content: gistContent
        }
      }
    };
    ```
7.  **Verify API Call:** Double-check that the `fetch` call to the GitHub API (`https://api.github.com/gists`) sends the `gistPayload` correctly in the request body.

This plan focuses on modifying the background script to correctly parse the nested structure of the `/GetPrompt` response and include all relevant user/model messages in the Gist content.
