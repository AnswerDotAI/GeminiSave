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
function formatDate() {
    return new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
}

function convertScrapedDataToMarkdown(title, conversation) {
    const bits = [];
    bits.push(`# ${title || 'Gemini Conversation'}`);
    bits.push(''); // Add a blank line

    conversation.forEach(turn => {
        const role = turn.role === 'user' ? 'User' : 'Model';
        const emoji = turn.role === 'user' ? '🧑' : '✨'; // Use sparkle emoji for Gemini
        bits.push(`## ${emoji} ${role} _(${formatDate()})_`);
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
