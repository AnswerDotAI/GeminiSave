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
function formatDate(timestamp) {
    if (timestamp) {
        return timestamp; // Use the timestamp from the DOM if available
    }
    return new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
}

/**
 * Converts scraped conversation data to Markdown format
 * @param {string} title - The conversation title
 * @param {Array} conversation - Array of conversation turns with role, content, and optional timestamp
 * @returns {string} Formatted markdown string
 */
function convertScrapedDataToMarkdown(title, conversation) {
    const bits = [];
    bits.push(`# ${title || 'Gemini Conversation'}`);
    bits.push(''); // Add a blank line

    conversation.forEach(turn => {
        const role = turn.role === 'user' ? 'User' : 'Model';
        const emoji = turn.role === 'user' ? '🧑' : '✨'; // Use sparkle emoji for Gemini
        const timestampStr = turn.timestamp ? `_(${turn.timestamp})_` : '';
        bits.push(`## ${emoji} ${role} ${timestampStr}`);
        bits.push('');
        
        if (turn.content) {
            const contentLines = turn.content.split('\n');
            let inCodeBlock = false;
            
            contentLines.forEach(line => {
                if (line.trim().startsWith('```')) {
                    inCodeBlock = !inCodeBlock;
                    bits.push(line);
                } 
                else if (inCodeBlock) {
                    bits.push(escapeHtml(line));
                } 
                else {
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

export { convertScrapedDataToMarkdown };
