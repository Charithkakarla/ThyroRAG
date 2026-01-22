import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { sendChatMessage } from '../services/api';
import { Trash2, Upload, Send, Loader2 } from 'lucide-react';
import '../styles/Chatbot.css';

/**
 * Chatbot Component
 * ChatGPT-style chat interface with RAG-powered medical assistant
 * Features:
 * - Message history
 * - Auto-scroll to bottom
 * - Typing indicator
 * - Error handling
 */
function Chatbot() {
  // State management
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your Thyro RAG medical assistant. I can answer questions about thyroid health, symptoms, diagnosis, and general medical information. How can I help you today?",
      sender: 'ai',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref for auto-scrolling to bottom of chat
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  /**
   * Auto-scroll to bottom when new messages are added
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  /**
   * Handle sending a new message
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Validate input
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      // Send message to RAG backend
      const response = await sendChatMessage(inputMessage);

      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        text: response.message || response.response || 'I received your message.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setError(err.message || 'Failed to get response. Please try again.');

      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I couldn't process your request. Please try again or rephrase your question.",
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Enter key press to send message
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  /**
   * Clear chat history
   */
  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Chat cleared. How can I help you today?",
        sender: 'ai',
        timestamp: new Date().toISOString()
      }
    ]);
    setError(null);
  };

  /**
   * Suggested questions for quick start
   */
  const suggestedQuestions = [
    "What are the symptoms of hypothyroidism?",
    "How is thyroid disease diagnosed?",
    "What causes hyperthyroidism?",
    "What is TSH and what does it indicate?"
  ];

  const handleSuggestionClick = (question) => {
    setInputMessage(question);
  };

  return (
    <div className="chatbot-container">
      {/* Chat Messages Area */}
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg.text}
            sender={msg.sender}
            timestamp={msg.timestamp}
          />
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>AI is thinking...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="chat-error">
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions (show only if chat is empty or just started) */}
      {messages.length <= 1 && !isLoading && (
        <div className="suggested-questions">
          <p className="suggestions-label">💡 Suggested questions:</p>
          <div className="suggestions-grid">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                className="suggestion-chip"
                onClick={() => handleSuggestionClick(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Area */}
      <div className="chat-input-container">
        <button
          className="clear-chat-btn"
          onClick={handleClearChat}
          title="Clear chat history"
        >
          <Trash2 size={20} />
        </button>

        <button
          className="upload-btn"
          onClick={() => document.getElementById('file-upload').click()}
          title="Upload document"
        >
          <Upload size={20} />
        </button>
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              console.log('File uploaded:', file.name);
              // TODO: Implement file upload logic
              alert(`File "${file.name}" selected. Upload functionality coming soon!`);
            }
          }}
        />

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about thyroid health..."
            className="chat-input"
            rows="1"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-button"
            disabled={isLoading || !inputMessage.trim()}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chatbot;
