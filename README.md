# GeminiSave

> A Chrome extension that saves conversations with Google AI Studio to GitHub Gists or your clipboard.

Note this is meant to work with [https://aistudio.google.com/](https://aistudio.google.com/)

## Installation

### Local Installation (Developer Mode)

1. **Clone or download this repository**
   ```
   git clone https://github.com/AnswerDotAI/GeminiSave.git
   ```
   Or download and extract the ZIP file from the repository.

2. **Open Chrome Extensions page**
   - Type `chrome://extensions` in your Chrome address bar
   - Or go to Chrome menu (three dots) → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle on the "Developer mode" switch in the top-right corner

4. **Load the extension**
   - Click the "Load unpacked" button that appears
   - Navigate to the directory where you cloned/extracted GeminiSave
   - Select the root folder (the one containing `manifest.json`)

5. **Verify installation**
   - The GeminiSave extension should appear in your extensions list
   - The extension icon should appear in your Chrome toolbar (pin it if necessary)

## Usage

### Step 1: Obtain a PAT

Obtain a [personal access token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) with the `gist` scope. (Use the 'Tokens (classic)' option in the interface).

### Step 2: Save your PAT
After installing the extension, you can click the extension icon to save your PAT.

### Step 3: Save your conversation

When you are ready to save your conversation, click on the share button with the github icon.

> **NOTE:** You must refresh the page after loading or receiving new responses before using the buttons. This ensures the extension captures all conversation data properly.

The extension adds two buttons to the Gemini interface in the top-right corner of the page:
- **Share to Gist** (share icon): Saves your conversation to a GitHub Gist
- **Copy to Clipboard** (clipboard icon): Copies the conversation in Markdown format to your clipboard

**See [this video](https://www.loom.com/share/f58e90829a604394b807d07204524d03?sid=537515fe-0404-45a7-9c35-d77ec883db6e)** for a demo.

If you have saved your PAT correctly, a new tab will open with a gist containing your conversation. You can inspect the logs by clicking on the extension icon and scrolling down to logs to check if there are any issues with your PAT.
