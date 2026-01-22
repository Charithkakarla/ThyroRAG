import React, { useState } from 'react';
import PredictionForm from './components/PredictionForm';
import Chatbot from './components/Chatbot';
import Sidebar from './components/Sidebar';
import {
  TestTube,
  Bot,
  Clock,
  History,
  Info,
  Heart,
  Brain,
  ShieldCheck
} from 'lucide-react';
import './styles/App.css';

/**
 * Main App Component
 * Contains main navigation sections:
 * 1. Thyroid Disease Prediction Form
 * 2. RAG-powered Medical Chatbot
 * 3. History (Coming Soon)
 * 4. About
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
              <TestTube size={28} /> Thyroid Disease Prediction
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
              <Bot size={28} /> Medical Assistant Chatbot
            </h2>
            <p className="section-description">
              AI-powered chatbot to answer questions about thyroid health, symptoms, and medical information.
            </p>
            <Chatbot />
          </div>
        );
      case 'history':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <History size={28} /> Prediction History
            </h2>
            <p className="section-description">
              View your past predictions and chatbot conversations.
            </p>
            <div className="coming-soon">
              <Clock size={48} />
              <h3>Coming Soon</h3>
              <p>History tracking feature is under development.</p>
            </div>
          </div>
        );
      case 'about':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <Info size={28} /> About ThyroRAG
            </h2>
            <div className="about-content">
              <div className="about-section">
                <h3><Heart size={20} /> Our Mission</h3>
                <p>ThyroRAG combines AI and medical expertise to provide accessible thyroid health screening and education.</p>
              </div>
              <div className="about-section">
                <h3><Brain size={20} /> Technology</h3>
                <p>Powered by machine learning algorithms and RAG (Retrieval-Augmented Generation) for accurate, context-aware responses.</p>
              </div>
              <div className="about-section">
                <h3><ShieldCheck size={20} /> Disclaimer</h3>
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
