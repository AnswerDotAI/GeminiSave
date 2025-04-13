// save a markdown file to a gist using a PAT
function saveToGist(markdown, pat, description, pageURL) {
    const apiUrl = 'https://api.github.com/gists';
    const personalAccessToken = pat; 
    const gistDescription = `${description} (saved from ${pageURL})`;
    
    const data = {
        description: gistDescription,
        public: false,
        files: {
            'gemini_conversation.md': {
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
