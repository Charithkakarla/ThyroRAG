import React from 'react';
import { Bot, User } from 'lucide-react';
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
  return (
    <div className={`message-bubble ${sender}`}>
      <div className="message-content">
        <p className="message-text">{message}</p>
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
        {sender === 'ai' ? <Bot size={20} /> : <User size={20} />}
      </div>
    </div>
  );
}

export default MessageBubble;
