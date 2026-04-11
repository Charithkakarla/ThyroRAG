import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser, useAuth as useClerkAuth, SignIn, SignUp } from '@clerk/react';
import PredictionForm from './components/PredictionForm';
import Chatbot from './components/Chatbot';
import PatientHistory from './components/PatientHistory';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import ProfileSettings from './components/ProfileSettings';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import { NotificationProvider } from './context/NotificationContext';
import { setTokenGetter, syncUserProfile } from './services/api';
import {
  getPatientDisplayName,
  hydratePatientRecords,
  loadPatientRecords,
} from './utils/patientRecords';
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
  const [patientRecords, setPatientRecords] = useState([]);
  const [localHistoryRecords, setLocalHistoryRecords] = useState([]);
  const [updateCounter, setUpdateCounter] = useState(0); // Force re-renders

  const mergeHistoryRecords = (baseRecords, extraRecords) => {
    const signature = (record) => {
      const date = record?.date || '';
      const tsh = record?.tsh ?? '';
      const t3 = record?.freeT3 ?? '';
      const t4 = record?.freeT4 ?? '';
      const prediction = record?.prediction ?? '';
      return `${date}|${tsh}|${t3}|${t4}|${prediction}`;
    };

    const merged = new Map();
    (baseRecords || []).forEach((record) => merged.set(signature(record), record));
    (extraRecords || []).forEach((record) => merged.set(signature(record), record));
    return Array.from(merged.values());
  };

  // Wire the Clerk token into the API service layer
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Sync/upsert Clerk user into Supabase `profiles` table on every login
  useEffect(() => {
    if (!isSignedIn || !user) return;
    const upsertProfile = async () => {
      try {
        await syncUserProfile({
          name: user.fullName ?? '',
          email: user.primaryEmailAddress?.emailAddress ?? '',
        });

        console.log('[Profile sync] Profile upserted successfully');
      } catch (e) {
        console.error('[Profile sync]', e);
      }
    };
    upsertProfile();
  }, [isSignedIn, user]);

  // This useEffect now depends on `updateCounter` to force a reload
  useEffect(() => {
    if (!isSignedIn || !user) {
      setPatientRecords([]);
      setLocalHistoryRecords([]);
      return;
    }

    // Fetch evaluated predictions from backend and merge local records containing file metadata.
    loadPatientRecords(user).then((records) => {
      const merged = hydratePatientRecords(mergeHistoryRecords(records, localHistoryRecords));
      setPatientRecords(merged);
    });
  }, [isSignedIn, user, updateCounter, localHistoryRecords]);

  const handleLogout = async () => {
    await signOut();
    setActiveTab('prediction');
  };

  // This function now just triggers the useEffect hook above
  const handleAddPatientRecord = (recordPayload) => {
    if (recordPayload && typeof recordPayload === 'object') {
      const localRecord = {
        id: recordPayload.id || `upload-${Date.now()}`,
        prediction: recordPayload.prediction || 'Unknown',
        confidence: recordPayload.confidence ?? null,
        ...recordPayload,
      };
      setLocalHistoryRecords((prev) => mergeHistoryRecords(prev, [localRecord]));
    }

    // Trigger backend refresh for evaluated thyroid predictions.
    setUpdateCounter(c => c + 1);
  };

  const toggleSidebar = () => setIsSidebarCollapsed(c => !c);

  const patientName = getPatientDisplayName({ fullName: user?.fullName });

  // Gate component for tabs that require sign-in (used in renderContent)
  const SignInGate = ({ title }) => (
    <div className="signin-gate">
      <div className="signin-gate-card">
        <i className='bx bx-lock-alt signin-gate-icon'></i>
        <h2>{title}</h2>
        <p>Sign in to access this feature and save your results securely.</p>
        <div className="signin-gate-btns">
          <button className="signin-gate-btn-primary" onClick={() => window.location.href = '/sign-in'}>Sign In</button>
          <button className="signin-gate-btn-outline" onClick={() => window.location.href = '/sign-up'}>Create Account</button>
        </div>
      </div>
    </div>
  );

  const renderContent = (signedIn = true) => {
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
            <PredictionForm
              defaultPatientName={patientName}
              onHistoryRecordCreated={handleAddPatientRecord}
            />
          </div>
        );
      case 'chatbot':
        return <Chatbot isGuest={!signedIn} />;
      case 'history':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-history'></i> Patient Records
            </h2>
            <p className="section-description">
              Review static and uploaded thyroid hormone records for {patientName}.
            </p>
            {signedIn ? (
              <PatientHistory user={user} records={patientRecords} />
            ) : (
              <SignInGate title="Sign in to view patient history" />
            )}
          </div>
        );
      case 'analytics':
        return (
          <div className="section-container">
            <h2 className="section-title">
              <i className='bx bx-line-chart'></i> Analytics
            </h2>
            <p className="section-description">
              Track hormone trends, compare the latest report, and review the latest TSH status.
            </p>
            {signedIn ? (
              <Analytics user={user} records={patientRecords} />
            ) : (
              <SignInGate title="Sign in to view analytics" />
            )}
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

  if (!isLoaded) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Unauthenticated: landing page at /, Clerk forms at /sign-in and /sign-up
  // /app is accessible without sign-in (chatbot with 3-query limit; other tabs prompt login)
  if (!isSignedIn) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/sign-up/*"
          element={
            <div className="clerk-auth-page">
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/app" />
            </div>
          }
        />
        <Route
          path="/sign-in/*"
          element={
            <div className="clerk-auth-page">
              <SignIn routing="path" path="/sign-in" afterSignInUrl="/app" />
            </div>
          }
        />
        {/* /app is publicly accessible — chatbot free, other tabs prompt sign-in */}
        <Route
          path="/app/*"
          element={
            <div className="App">
              <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={toggleSidebar}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                user={null}
                onLogout={null}
                isGuest
              />
              <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {renderContent(false)}
              </main>
            </div>
          }
        />
        {/* Any other path → landing page */}
        <Route path="/*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <NotificationProvider>
      <Routes>
        {/* Signed-in users: always show landing page at / — user must click "Go to App" */}
        <Route path="/" element={<LandingPage />} />
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
                {renderContent(true)}
              </main>
            </div>
          }
        />
      </Routes>
    </NotificationProvider>
  );
}

export default App;
