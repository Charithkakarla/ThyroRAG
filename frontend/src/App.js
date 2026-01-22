import React, { useState } from 'react';
import PredictionForm from './components/PredictionForm';
import Chatbot from './components/Chatbot';
import Sidebar from './components/Sidebar';
import { Activity, Brain, History, Info, FlaskConical } from 'lucide-react';
import './styles/App.css';

/**
 * Main App Component
 * Contains two main sections:
 * 1. Thyroid Disease Prediction Form
 * 2. RAG-powered Medical Chatbot
 */
function App() {
  // State to track which tab is active (prediction or chatbot)
  const [activeTab, setActiveTab] = useState('prediction');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'prediction':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <Activity className="section-icon" size={32} /> Thyroid Disease Diagnosis
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
              <Brain className="section-icon" size={32} /> AI Medical Assistant
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
              <History className="section-icon" size={32} /> Patient History
            </h2>
            <p className="section-description">
              View your past predictions and chatbot conversations.
            </p>
            <div className="coming-soon">
              <i className='bx bx-time-five'></i>
              <h3>Coming Soon</h3>
              <p>History tracking feature is under development.</p>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <Info className="section-icon" size={32} /> System Documentation
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
      />

      {/* Main Content Area */}
      <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
