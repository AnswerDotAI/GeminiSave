This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

<additional_info>

</additional_info>

</file_summary>

<directory_structure>
popup/
  popup.html
  popup.js
utils/
  banner.js
  github.js
  resp2md.js
.gitignore
background.js
content.js
LICENSE
Makefile
manifest.json
privacy_policy.md
README.md
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="popup/popup.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClaudeSave</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css">
    <style>
        body {
            width: 400px;
            height: 800px;
            padding: 1rem;
        }
        #status-card {
            margin-top: 1rem;
        }
        .title-container {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo {
            width: 30px;
            height: 30px;
            margin-right: 10px;
        }
        .title-text {
            margin: 0.5rem;
        }
    </style>
</head>
<body>
    <main class="container">
        <div class="title-container">
            <img src="../images/anthropic.png" alt="Anthropic logo" class="logo">
            <h2 class="title-text">Claudesave</h2>
        </div>
        <p>Paste your <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic">GitHub Personal Access Token</a> scoped to "gist" and click the "Save" button.</p>
        <form>
            <input type="password" id="pat" placeholder="Paste your GitHub PAT here" required>
            <button type="button" id="save">Save</button>
        </form>
        <hr>
        <h3>Logs</h3>
        <p>View the logs of the last save attempt.</p>
        <article id="status-card">
            <div id="status" aria-live="polite"></div>
        </article>
    </main>
    <script src="../utils/banner.js"></script>
    <script src="popup.js"></script>
</body>
</html>
</file>

<file path="popup/popup.js">
document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('save');
    const statusDiv = document.getElementById('status');
    pat.value = chrome.storage.sync.get('pat') ?? '';

    saveButton.addEventListener('click', function() {
        const pat = document.getElementById('pat');
        chrome.storage.sync.set({'pat': `${pat.value}`});
        createBanner('PAT saved', 'success');
    });

    // Function to update the logs
    function updateLogs() {
        chrome.storage.local.get(['log_url', 'log_status', 'log_message'], function(result) {
            if (result.log_status === 'success') {
                statusDiv.innerHTML = `Gist Created: <a href="${result.log_url}" target="_blank">link to gist</a>`;
                statusDiv.style.color = '#4CAF50';
                statusDiv.style.fontWeight = 'bold';
            } else if (result.log_status === 'error') {
                statusDiv.textContent = `Error: ${result.log_message}`;
                statusDiv.style.color = '#F44336';
                statusDiv.style.fontWeight = 'bold';
            } else {
                statusDiv.textContent = 'No recent logs.';
                statusDiv.style.color = '';
                statusDiv.style.fontWeight = 'normal';
            }
        });
    }

    // Update logs when popup opens
    updateLogs();

    // Listen for changes in chrome.storage.local
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'local' && (changes.log_url || changes.log_status || changes.log_message)) {
            updateLogs();
        }
    });
});
</file>

<file path="utils/banner.js">
function createBanner(message, type = 'error', timeout = 8000) {
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
    document.body.prepend(banner);

    // Set a timeout to remove the banner after 8 seconds
    setTimeout(() => {
        banner.style.animation = 'slideUp 0.5s ease-in';
        setTimeout(() => banner.remove(), 500);
    }, timeout);
}

// This adds the banner styles to the page
const style = document.createElement('style');
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
        color: black white;
    }
`;
document.head.appendChild(style);
</file>

<file path="utils/github.js">
// save a markdown file to a gist using a PAT
function saveToGist(markdown, pat, pageURL) {
    const apiUrl = 'https://api.github.com/gists';
    const personalAccessToken = pat; 
    const data = {
        description: 'Claude Conversation ' + `${pageURL}`,
        public: false,
        files: {
            'claude_conversation.md': {
                content: markdown
            }
        }
    };

    return fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `token ${personalAccessToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        console.log('Gist created:', result.html_url);
        return { status: 'success', url: result.html_url };
    })
}

export { saveToGist };
</file>

<file path="utils/resp2md.js">
// Code inspired from https://observablehq.com/@simonw/convert-claude-json-to-markdown
function parseInput(input) {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
}
  
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
  
  // Function to format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
}
  
  // Function to process a single message and its descendants
function processMessage(message, payload, bits) {
    console.log("Processing message:", {
        uuid: message.uuid,
        sender: message.sender,
        hasContent: Boolean(message.content),
        hasText: Boolean(message.text),
        hasAttachments: Boolean(message.attachments?.length),
        attachmentsCount: message.attachments?.length || 0
    });

    // If the previous item was a code block, ensure it's closed
    if (bits.length > 0 && bits[bits.length - 1].startsWith('```')) {
        bits.push('```');
    }

    let emoji = message.sender === 'human' ? '🧑' : (message.sender === 'assistant' ? '🤖' : '👤');
    
    bits.push(`## ${emoji} ${message.sender} _(${formatDate(message.created_at)})_`);
    
    // Handle content array if it exists
    if (message.content && message.content.length > 0) {
        message.content.forEach(content => {
            if (content.type === 'text') {
                console.log("Adding content text:", content.text.substring(0, 50) + "...");
                bits.push(content.text);
            }
        });
    } else if (message.text) {
        console.log("Adding message text:", message.text.substring(0, 50) + "...");
        bits.push(message.text);
    }

    // Only process attachments if they exist AND have length > 0
    if (message.attachments?.length > 0) {
        message.attachments.forEach((attachment) => {
            if (attachment.extracted_content) {
                console.log("Adding attachment content");
                bits.push("```");
                bits.push(escapeHtml(attachment.extracted_content));
                bits.push("```");
            }
        });
    }

    console.log("Current bits array:", bits.slice(-3));

    // Find and process child messages
    const childMessages = payload.chat_messages.filter(m => m.parent_message_uuid === message.uuid);
    if (childMessages.length > 0) {
        const mostRecentChild = childMessages.reduce((latest, current) => {
            return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
        });
        processMessage(mostRecentChild, payload, bits);
    }
}

// Add this new function
function cleanupMarkdown(markdown) {
    const lines = markdown.split('\n');
    const cleanedLines = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // More permissive regex to catch variations of message headers
        const isMessageHeader = line.match(/^## [🧑🤖👤].*(human|assistant|system).*_\(.*\)_$/i);
        
        if (line === '```') {
            if (inCodeBlock) {
                // We're ending a code block
                cleanedLines.push(line);
                inCodeBlock = false;
            } else {
                // We're starting a code block
                // Check if next lines contain message headers
                let peekIndex = i + 1;
                let foundHeader = false;
                while (peekIndex < lines.length && lines[peekIndex].trim() !== '```') {
                    if (lines[peekIndex].trim().match(/^## [🧑🤖👤].*(human|assistant|system).*_\(.*\)_$/i)) {
                        foundHeader = true;
                        break;
                    }
                    peekIndex++;
                }
                
                if (!foundHeader) {
                    cleanedLines.push(line);
                    inCodeBlock = true;
                }
                // If we found a header, skip adding the opening code block
            }
            continue;
        }

        if (isMessageHeader) {
            if (inCodeBlock) {
                // If we find a header inside a code block, close the block first
                cleanedLines.push('```');
                inCodeBlock = false;
            }
            cleanedLines.push(line);
        } else {
            cleanedLines.push(line);
        }
    }

    // Ensure we close any open code block
    if (inCodeBlock) {
        cleanedLines.push('```');
    }

    return cleanedLines.join('\n');
}

// Main function to convert JSON chat to Markdown
function convertPayloadToMarkdown(payload) {
    if (!payload.chat_messages || payload.chat_messages.length === 0) {
        return "";
    }
    const bits = [];
    bits.push(`# ${payload.name}`);

    // Find the most recent root message
    const mostRecentRootMessage = payload.chat_messages
        .filter(message => message.parent_message_uuid === '00000000-0000-4000-8000-000000000000')
        .reduce((latest, current) => {
            return new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest;
        });

    // Start processing from the most recent root message
    if (mostRecentRootMessage) {
        processMessage(mostRecentRootMessage, payload, bits);
    }

    // Clean up the markdown before returning
    return cleanupMarkdown(bits.join("\n"));
}

export { convertPayloadToMarkdown };
</file>

<file path=".gitignore">
# ignore stuff for chrome extensiosn
extension.zip

# ignore DS_Store from Macs
.DS_Store
</file>

<file path="background.js">
import { convertPayloadToMarkdown } from './utils/resp2md.js';
import { saveToGist } from './utils/github.js';

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "saveToGistAPI" || request.action === "SaveToClipboard") {
        chrome.storage.sync.get(['pat'], (result) => {
            const pat = result.pat;
            if (!pat && request.action === "saveToGistAPI") {
                const msg = 'No PAT found, please set one in the extension by clicking on the extension icon';
                chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                sendResponse({log_status: 'error', log_message: msg });
                return true;
            }
            chrome.storage.local.get([`chat_${request.uuid}`], (result) => {
                const payload = result[`chat_${request.uuid}`];
                if (!payload) {
                    const msg = 'No payload found, try refreshing the page.';
                    chrome.storage.local.set({log_url: '', log_status: 'error', log_message: msg});
                    sendResponse({log_status: 'error', log_message: msg });
                    return true;
                }
                else {
                    let markdown = convertPayloadToMarkdown(payload);
                    if (request.action === "saveToGistAPI") {
                        saveToGist(markdown, pat, `https://claude.ai/chat/${request.uuid}`)
                        .then(result => {
                            chrome.tabs.create({ url: result.url });
                            chrome.storage.local.set({log_url: result.url, log_status: 'success', log_message: 'Gist created'});
                            sendResponse({log_status: 'success'});
                        })
                        .catch(error => {
                            const msg = error.message + ' Please make sure your PAT has the correct permissions to create gists.';
                            chrome.storage.local.set({log_url: '', log_status: 'error', log_message: error.message});
                            sendResponse({log_status: 'error', log_message: msg});
                        });
                    } else if (request.action === "SaveToClipboard") {
                        sendResponse({log_status: 'success', log_message: 'Copied to clipboard', markdown: markdown});
                    }
                }
            });
        });
        return true;
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url && changeInfo.url.startsWith('https://claude.ai/chat/')) {
        chrome.tabs.sendMessage(tabId, {action: "checkAndAddShareButton"});
    }
});

chrome.webRequest.onBeforeSendHeaders.addListener((obj) => {
    if (isChatRequest(obj) && !isOwnRequest(obj)) {
        fetchChat(obj).then(resp => {
            if (resp.chat_messages && resp.uuid) {
                chrome.storage.local.set({[`chat_${resp.uuid}`]: resp});
            }
        });
    }
}, {urls: ["https://claude.ai/api/*chat_conversations*"]}, ['requestHeaders', 'extraHeaders']);


function isChatRequest(obj) {
    return obj.url.includes('?tree=True') && obj.method === 'GET';
}

function isOwnRequest(obj) {
    return obj.requestHeaders?.some(header => header.name === 'X-Own-Request') ?? false;
}

async function fetchChat(obj) {
    const headers = {};
    obj.requestHeaders.forEach(header => headers[header.name] = header.value);
    headers['X-Own-Request'] = 'true';
    try {
        const response = await fetch(obj.url, {
            method: obj.method,
            headers: headers,
            credentials: "include"
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        return null;
    }
}
</file>

<file path="content.js">
function createButton(icon, text, action) {
    let button = document.createElement('button');
    button.className = 'claude-button inline-flex items-center justify-center relative shrink-0 ring-offset-2 ring-offset-bg-300 ring-accent-main-100 focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none text-text-200 transition-all font-styrene active:bg-bg-400 hover:bg-bg-500/40 hover:text-text-100 rounded py-1 px-2 whitespace-nowrap text-ellipsis overflow-hidden outline-none gap-1 ml-2';
    
    let iconElement = document.createElement('i');
    iconElement.className = `fa fa-${icon}`;
    
    let textElement = document.createElement('div');
    textElement.className = 'font-tiempos truncate font-normal tracking-tight';
    textElement.textContent = text;
    
    button.appendChild(iconElement);
    button.appendChild(textElement);
    
    button.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: action, uuid: extractUUID(window.location.href)}, function(response) {
            if (response && response.log_status === 'error') {
                createBanner(`Error: ${response.log_message}`);
            } else if (response && response.log_status === 'success' && action === 'SaveToClipboard') {
                navigator.clipboard.writeText(response.markdown);
                createBanner('Copied to clipboard!', 'success', 1000);
            }
        });
    });
    
    return button;
}

function addShareButtons() {
    let buttonContainer = document.querySelector('.flex.min-w-0.items-center.max-md\\:text-sm');
    
    if (buttonContainer && !buttonContainer.querySelector('.claude-button')) {
        let faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
        document.head.appendChild(faLink);

        let shareButton = createButton('github', 'Share', 'saveToGistAPI');
        let clipboardButton = createButton('clipboard', 'Copy', 'SaveToClipboard');

        buttonContainer.appendChild(shareButton);
        buttonContainer.appendChild(clipboardButton);
    }
}

function checkAndAddShareButtons() {
    if (window.location.href.startsWith('https://claude.ai/chat/')) {
        const maxAttempts = 15;
        let attempts = 0;

        function tryAddButtons() {
            if (attempts < maxAttempts) {
                addShareButtons();
                if (!document.querySelector('.claude-button')) {
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

checkAndAddShareButtons();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "checkAndAddShareButton") {
        checkAndAddShareButtons();
    }
});

function extractUUID(url) {
    const urlParts = url.split('https://claude.ai/chat/');
    const lastPart = urlParts[1];
    return lastPart.split('?')[0];
}
</file>

<file path="LICENSE">
Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
</file>

<file path="Makefile">
package:
	zip -r -FS extension.zip . -x "*.git*" "*.DS_Store" "extension.zip"
</file>

<file path="manifest.json">
{
    "manifest_version": 3,
    "name": "ClaudeSave",
    "version": "1.9",
    "description": "A Chrome extension that saves conversations with Claude to gists.",
    "permissions": ["storage", "tabs", "webRequest", "clipboardWrite"],
    "host_permissions": ["https://claude.ai/*", "https://api.claude.ai/*"],
    "background": {
        "service_worker": "background.js",
        "type": "module"
    },
    "action": {
        "default_title": "ClaudeSave",
        "default_popup": "popup/popup.html"
    },
    "content_scripts": [
        {   
            "run_at": "document_end",
            "matches": ["https://claude.ai/*"],
            "js": ["utils/banner.js", "content.js"]
        }
    ],
    "web_accessible_resources": [
        {
            "resources": ["images/anthropic.png"],
            "matches": ["<all_urls>"]
        }
    ],
    "icons": {
        "128": "images/anthropic.png"
    }
}
</file>

<file path="privacy_policy.md">
# Privacy Policy for ClaudeSave extension

## Introduction

This Privacy Policy describes how the ClaudeSave extension ("we", "our", or "the extension") handles user data. We are committed to protecting your privacy and ensuring the security of your information.

## Data Collection and Usage

The Claude Share Extension does not collect, store, or transmit any personal information or user data. Our extension operates entirely within the user's browser and does not send any data to external servers or third parties.

## Information Handling

1. No Personal Information: We do not collect, store, or process any personal information from users.
2. No Usage Data: We do not track or collect any data about how users interact with the extension.
3. Local Processing: All functionality of the extension occurs locally within the user's browser.

## Third-Party Services

The extension does not integrate with or utilize any third-party services for data collection or analytics.

## Data Security

As we do not collect or store any user data, there are no specific data security measures in place beyond the inherent security of the user's local browser environment.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify users of any changes by posting the new Privacy Policy on the Chrome Web Store listing for the extension.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at `contact@parlance-labs.com`.

Last updated: 2024-08-12
</file>

<file path="README.md">
# ClaudeSave

> A Chrome extension that saves conversations with Claude to GitHubGists or your clipboard.

## Demo

https://github.com/user-attachments/assets/c0d64e6d-5649-451b-9e34-f8a24e90887e


## Usage

### Step 1: Obtain a PAT

Obtain a [personal access token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) with the `gist` scope. (Use the 'Tokens (classic)' option in the interface).

### Step 2: Install the extension

Follow [these steps](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) to load an unpacked extension.  Select the root of this repository as the extension directory.

### Step 3: Save your PAT
After installing the extension, you can click the extension icon to save your PAT.

> ![screenshot](images/screenshots/3_claudesave.png)

### Step 4: Save your conversation

When you are ready to save your conversation, click on the share button with the github icon.

> ![screenshot](images/screenshots/1_claudesave_buttons.png)

If you have saved your PAT correctly, a new tab will open with a gist containing your conversation.  You can inspect the logs by clicking on the extension icon and scrolling down to logs to check if there are any issues with your PAT.
</file>

</files>
