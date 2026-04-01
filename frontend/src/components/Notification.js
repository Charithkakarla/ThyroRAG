import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import '../styles/Notification.css';

/**
 * Notification Component
 * Displays success, error, info, and warning notifications
 * Auto-dismisses after a configurable duration
 */
function Notification({ message, type = 'info', duration = 4000, onClose = null }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-icon">
        {getIcon()}
      </div>
      <div className="notification-content">
        {message}
      </div>
      <button
        className="notification-close"
        onClick={() => setIsVisible(false)}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default Notification;
