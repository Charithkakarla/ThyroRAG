import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { sendChatMessage, uploadDocumentToRAG } from '../services/api';
import '../styles/Chatbot.css';

const FREE_QUERY_LIMIT = 3;
const STORAGE_KEY = 'thyrorag_guest_queries';

// Web Speech API setup (browser compatibility)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isVoiceSupported = !!SpeechRecognition;

function Chatbot({ isGuest = false }) {
  // State management
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: isGuest
        ? `Hello! I\'m your Thyro RAG medical assistant. You have ${FREE_QUERY_LIMIT} free questions — sign in for unlimited access and file uploads. How can I help you?`
        : "Hello! I'm your Thyro RAG medical assistant. I can answer questions about thyroid health, symptoms, diagnosis, and general medical information. How can I help you today?",
      sender: 'ai',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadState, setUploadState] = useState(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [guestQueryCount, setGuestQueryCount] = useState(() => {
    if (!isGuest) return 0;
    // Clear any stale localStorage data from old sessions
    localStorage.removeItem(STORAGE_KEY);
    return parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);
  });

  // Ref for auto-scrolling to bottom of chat
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);

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
    if (!inputMessage.trim()) return;

    // Guest query limit check
    if (isGuest && guestQueryCount >= FREE_QUERY_LIMIT) {
      setShowSignInModal(true);
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const history = messages
        .slice(-8)
        .map((message) => ({ sender: message.sender, text: message.text }));
      const response = await sendChatMessage(inputMessage, history);
      const aiMessage = {
        id: Date.now() + 1,
        text: response.message || response.response || 'I received your message.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Increment guest query count
      if (isGuest) {
        const newCount = guestQueryCount + 1;
        setGuestQueryCount(newCount);
        sessionStorage.setItem(STORAGE_KEY, String(newCount));
        // Show modal after limit is reached
        if (newCount >= FREE_QUERY_LIMIT) {
          setTimeout(() => setShowSignInModal(true), 800);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to get response. Please try again.');
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
   * Handle voice input - speech to text conversion
   */
  const handleStartVoiceInput = () => {
    if (!isVoiceSupported) {
      setVoiceError('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      setTimeout(() => setVoiceError(null), 5000);
      return;
    }

    if (isRecording) {
      // Stop recording
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // Start recording
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.language = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInputMessage((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Voice input error. Please try again.';
      if (event.error === 'no-speech') {
        errorMessage = 'No speech detected. Please try again.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'No microphone found. Please check your device.';
      } else if (event.error === 'network') {
        errorMessage = 'Network error. Please check your connection.';
      }
      setVoiceError(errorMessage);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
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
            {/* ── Sign-In Modal (ChatGPT style) ── */}
      {showSignInModal && (
        <div className="signin-modal-overlay" onClick={() => setShowSignInModal(false)}>
          <div className="gpt-modal" onClick={e => e.stopPropagation()}>
            <button className="gpt-modal-close" onClick={() => setShowSignInModal(false)} aria-label="Close">×</button>
            <h2 className="gpt-modal-title">Log in or sign up</h2>
            <p className="gpt-modal-sub">You'll get smarter responses and can upload files and more.</p>
            <div className="gpt-modal-btns">
              <button className="gpt-social-btn" onClick={() => window.location.href = '/sign-in'}>
                <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2c-7.6 0-14.1 4.6-17.7 11.3z"/>
                  <path fill="#FBBC05" d="M24 46c5.8 0 11-2 14.9-5.3l-6.9-5.7C29.9 36.6 27.1 37 24 37c-6 0-11.1-3.9-13-9.3l-7 5.4C7.8 41.3 15.3 46 24 46z"/>
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1.1 3-3.4 5.5-6.3 7.1l6.9 5.7C40.7 37.6 44.5 31.4 44.5 24c0-1.3-.2-2.7-.5-4z"/>
                </svg>
                Continue with Google
              </button>
            </div>
            <div className="gpt-modal-divider"><span>OR</span></div>
            <input
              className="gpt-email-input"
              type="email"
              placeholder="Email address"
              onKeyDown={e => { if (e.key === 'Enter') window.location.href = '/sign-in'; }}
            />
            <button className="gpt-continue-btn" onClick={() => window.location.href = '/sign-in'}>Continue</button>
            <p className="gpt-modal-note">By messaging ThyroRAG, you agree to our Terms and Privacy Policy.</p>
          </div>
        </div>
      )}

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
          <i className='bx bx-trash'></i>
        </button>
        
        {/* Upload button — guests see a locked version that prompts sign-in */}
        <button
          className={`upload-btn${uploadState?.status === 'uploading' ? ' uploading' : ''}`}
          onClick={() => {
            if (isGuest) { setShowSignInModal(true); return; }
            document.getElementById('file-upload').click();
          }}
          title={isGuest ? 'Sign in to upload files' : 'Upload any file to knowledge base (PDF, Word, image, CSV, …)'}
          disabled={!isGuest && !!uploadState && uploadState.status === 'uploading'}
        >
          {isGuest
            ? <i className='bx bx-lock-alt'></i>
            : uploadState?.status === 'uploading'
              ? <i className='bx bx-loader-alt bx-spin'></i>
              : <i className='bx bx-upload'></i>}
        </button>
        <input
          id="file-upload"
          type="file"
          accept="*/*"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files[0];
            // Reset input so the same file can be re-uploaded if needed
            e.target.value = '';
            if (!file) return;

            setUploadState({ filename: file.name, progress: 0, status: 'uploading' });
            setError(null);

            try {
              const result = await uploadDocumentToRAG(file, (pct) => {
                setUploadState((prev) => ({ ...prev, progress: pct }));
              });

              const preview = (result.extracted_preview || '').trim();
              const snippet = preview
                ? `\n\nExtracted preview:\n${preview.slice(0, 280)}${preview.length > 280 ? '…' : ''}`
                : '';
              const uploadMessage = {
                id: Date.now() + 2,
                sender: 'ai',
                timestamp: new Date().toISOString(),
                text: result.warning
                  ? `${result.warning}\n\nYou can still ask about the uploaded file by name, but a clearer PDF/image will give better answers.`
                  : `I've extracted text from "${file.name}" and indexed it for chat.${snippet}\n\nAsk follow-up questions like "list each patient in the file", "extract patient 2 details", or "summarise the abnormal thyroid values".`,
              };
              setMessages((prev) => [...prev, uploadMessage]);
              setUploadState({ filename: file.name, progress: 100, status: 'done' });
              // Clear status pill after 4 s
              setTimeout(() => setUploadState(null), 4000);
            } catch (err) {
              setUploadState({ filename: file.name, progress: 0, status: 'error' });
              setTimeout(() => setUploadState(null), 4000);
            }
          }}
        />
        {/* Upload progress bar */}
        {uploadState && (
          <div className={`upload-progress-bar ${uploadState.status}`}>
            <span className="upload-filename">{uploadState.filename}</span>
            {uploadState.status === 'uploading' && (
              <div className="upload-track">
                <div className="upload-fill" style={{ width: `${uploadState.progress}%` }} />
              </div>
            )}
            {uploadState.status === 'done' && <span className="upload-done">✓ Done</span>}
            {uploadState.status === 'error' && <span className="upload-err">✗ Failed</span>}
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="chat-input-form">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isGuest && guestQueryCount >= FREE_QUERY_LIMIT ? 'Sign in to continue chatting...' : 'Ask me anything about thyroid health...'}
            className="chat-input"
            rows="1"
            disabled={isLoading || (isGuest && guestQueryCount >= FREE_QUERY_LIMIT)}
          />
          <button
            type="button"
            className={`voice-button ${isRecording ? 'recording' : ''}`}
            onClick={handleStartVoiceInput}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            disabled={isLoading || (isGuest && guestQueryCount >= FREE_QUERY_LIMIT)}
          >
            {isRecording ? (
              <i className='bx bx-microphone' style={{ animation: 'pulse 1.5s infinite' }}></i>
            ) : (
              <i className='bx bx-microphone'></i>
            )}
          </button>
          <button
            type="submit"
            className="send-button"
            disabled={isLoading || !inputMessage.trim()}
          >
            {isLoading ? <i className='bx bx-loader-alt bx-spin'></i> : <i className='bx bx-send'></i>}
          </button>
        </form>

        {/* Voice Error Display */}
        {voiceError && (
          <div className="voice-error-message">
            <span>🎤 {voiceError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chatbot;

