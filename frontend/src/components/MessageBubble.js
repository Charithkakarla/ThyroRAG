import { Brain, User } from 'lucide-react';
import '../styles/Chatbot.css';

/**
 * MessageBubble Component
 * Displays individual chat messages with different styles for user and AI
 * 
 * Props:
 * - message: Message text content
 * - sender: 'user' or 'ai'
 * - timestamp: Message timestamp
 */
function MessageBubble({ message, sender, timestamp }) {
  // Simple function to format message text with basic markdown-like support
  const formatMessage = (text) => {
    if (!text) return null;

    // Split by lines to handle headers and lists
    return text.split('\n').map((line, i) => {
      // Handle ### Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="message-header-3">{line.replace('### ', '')}</h3>;
      }
      // Handle **Bold**
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <p key={i} className="message-text">
            {parts.map((part, index) =>
              index % 2 === 1 ? <strong key={index}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Handle * Bullets
      if (line.trim().startsWith('* ')) {
        return <li key={i} className="message-list-item">{line.trim().replace('* ', '')}</li>;
      }

      return <p key={i} className="message-text">{line}</p>;
    });
  };

  return (
    <div className={`message-bubble ${sender}`}>
      <div className="message-content">
        <div className="formatted-message">
          {formatMessage(message)}
        </div>
        {timestamp && (
          <span className="message-timestamp">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
      <div className="message-avatar">
        {sender === 'ai' ? <Brain size={20} /> : <User size={20} />}
      </div>
    </div>
  );
}

export default MessageBubble;
