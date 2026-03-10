import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useUser, useAuth as useClerkAuth, SignIn, SignUp } from '@clerk/react';
import PredictionForm from './components/PredictionForm';
import Chatbot from './components/Chatbot';
import PatientHistory from './components/PatientHistory';
import Settings from './components/Settings';
import ProfileSettings from './components/ProfileSettings';
import Sidebar from './components/Sidebar';
import { supabase } from './supabase/supabaseClient';
import { setTokenGetter } from './services/api';
import './styles/App.css';

/**
 * Main App Component
 * Authentication is handled entirely by Clerk.
 * Supabase is used only as a database (predictions, queries, profiles).
 */
function App() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut, getToken } = useClerkAuth();
  const [activeTab, setActiveTab] = useState('prediction');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Wire the Clerk token into the API service layer
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Sync/upsert Clerk user into Supabase `profiles` table on every login
  useEffect(() => {
    if (!isSignedIn || !user) return;
    const upsertProfile = async () => {
      try {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? '',
            name: user.fullName ?? '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (e) {
        console.warn('[Profile sync]', e);
      }
    };
    upsertProfile();
  }, [isSignedIn, user]);

  const handleLogout = async () => {
    await signOut();
    setActiveTab('prediction');
  };

  const toggleSidebar = () => setIsSidebarCollapsed(c => !c);

  if (!isLoaded) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Unauthenticated: show Clerk-hosted Sign In / Sign Up
  if (!isSignedIn) {
    return (
      <Routes>
        <Route
          path="/sign-up/*"
          element={
            <div className="clerk-auth-page">
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/" />
            </div>
          }
        />
        <Route
          path="/*"
          element={
            <div className="clerk-auth-page">
              <SignIn routing="path" path="/" afterSignInUrl="/" />
            </div>
          }
        />
      </Routes>
    );
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
        return <Chatbot />;
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
      case 'profile':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-user-circle'></i> Profile Settings
            </h2>
            <p className="section-description">
              Manage your account display name and personal information.
            </p>
            <ProfileSettings />
          </div>
        );
      case 'settings':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-cog'></i> General Settings
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
    <Routes>
      <Route
        path="/*"
        element={
          <div className="App">
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              toggleSidebar={toggleSidebar}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              user={{
                username: user.primaryEmailAddress?.emailAddress ?? '',
                fullName: user.fullName || user.primaryEmailAddress?.emailAddress || 'User',
                role: 'Patient',
              }}
              onLogout={handleLogout}
            />
            <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
              {renderContent()}
            </main>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
