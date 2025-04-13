# GeminiSave

> A Chrome extension that saves conversations with Google Gemini to GitHub Gists or your clipboard.

## Usage

### Step 1: Obtain a PAT

Obtain a [personal access token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) with the `gist` scope. (Use the 'Tokens (classic)' option in the interface).

### Step 2: Install the extension

Follow [these steps](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) to load an unpacked extension. Select the root of this repository as the extension directory.

### Step 3: Save your PAT
After installing the extension, you can click the extension icon to save your PAT.

### Step 4: Save your conversation

When you are ready to save your conversation, click on the share button with the github icon.

> **NOTE:** You must refresh the page after loading or receiving new responses before using the buttons. This ensures the extension captures all conversation data properly.

The extension adds two buttons to the Gemini interface in the top-right corner of the page:
- **Share to Gist** (share icon): Saves your conversation to a GitHub Gist
- **Copy to Clipboard** (clipboard icon): Copies the conversation in Markdown format to your clipboard

If you have saved your PAT correctly, a new tab will open with a gist containing your conversation. You can inspect the logs by clicking on the extension icon and scrolling down to logs to check if there are any issues with your PAT.
