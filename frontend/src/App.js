import React, { useState, useEffect } from 'react';
import PredictionForm from './components/PredictionForm';
import Chatbot from './components/Chatbot';
import PatientHistory from './components/PatientHistory';
import Settings from './components/Settings';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import './styles/App.css';

/**
 * Main App Component
 * Contains authentication and main sections:
 * 1. Thyroid Disease Prediction Form
 * 2. RAG-powered Medical Chatbot
 * 3. Patient History
 * 4. Settings
 */
function App() {
  const [activeTab, setActiveTab] = useState('prediction');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('thyrorag_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('thyrorag_user');
    setUser(null);
    setActiveTab('prediction');
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Show loading state
  if (isLoading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Show login if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'prediction':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-test-tube'></i> Thyroid Disease Prediction
            </h2>
            <p className="section-description">
              Enter your medical data below to get an AI-powered prediction about your thyroid health.
            </p>
            <PredictionForm />
          </div>
        );
      case 'chatbot':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-brain'></i> AI Medical Assistant
            </h2>
            <p className="section-description">
              Ask questions about symptoms, diagnosis, and thyroid health.
            </p>
            <Chatbot />
          </div>
        );
      case 'history':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-history'></i> Patient Records
            </h2>
            <p className="section-description">
              View patient medical history and past thyroid screening results.
            </p>
            <PatientHistory />
          </div>
        );
      case 'about':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-info-circle'></i> About ThyroRAG
            </h2>
            <div className="about-content">
              <div className="about-section">
                <h3><i className='bx bxs-heart'></i> Our Mission</h3>
                <p>ThyroRAG combines AI and medical expertise to provide accessible thyroid health screening and education.</p>
              </div>
              <div className="about-section">
                <h3><i className='bx bxs-brain'></i> Technology</h3>
                <p>Powered by machine learning algorithms and RAG (Retrieval-Augmented Generation) for accurate, context-aware responses.</p>
              </div>
              <div className="about-section">
                <h3><i className='bx bxs-shield-alt-2'></i> Disclaimer</h3>
                <p>This tool is for educational and screening purposes only. Always consult healthcare professionals for medical advice.</p>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-cog'></i> Settings
            </h2>
            <p className="section-description">
              Manage your preferences and system configuration.
            </p>
            <Settings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App">
      {/* Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
