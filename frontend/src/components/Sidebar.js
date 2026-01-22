import React from 'react';
import {
  Activity,
  Brain,
  History,
  Info,
  HeartPulse,
  ChevronRight,
  ChevronLeft,
  Settings,
  HelpCircle,
  Stethoscope,
  Bell,
  LogIn
} from 'lucide-react';
import '../styles/Sidebar.css';

/**
 * Collapsible Sidebar Component
 * Features navigation with Boxicons and smooth collapse/expand animation
 */
function Sidebar({ isCollapsed, toggleSidebar, activeTab, setActiveTab }) {
  const menuItems = [
    {
      id: 'prediction',
      icon: Stethoscope,
      label: 'Diagnosis',
      description: 'AI Screening'
    },
    {
      id: 'chatbot',
      icon: Brain,
      label: 'Medical AI',
      description: 'Expert Assistant'
    },
    {
      id: 'history',
      icon: History,
      label: 'Patient History',
      description: 'Past Records'
    },
    {
      id: 'about',
      icon: Info,
      label: 'Documentation',
      description: 'System Info'
    }
  ];

  return (
    <>
      {/* Fixed Header */}
      <header className="app-header-fixed">
        <div className="header-container-flex">
          <div className="header-content-fixed">
            <HeartPulse className="header-icon" size={36} />
            <div className="header-text">
              <h1 className="header-title">ThyroRAG</h1>
              <p className="header-subtitle">AI-Powered Thyroid Assistant</p>
            </div>
          </div>

          <div className="header-actions-static">
            <button className="header-action-btn" title="Notifications">
              <Bell size={20} />
              <span className="notif-badge"></span>
            </button>
            <button className="header-login-btn">
              <LogIn size={18} />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Toggle Button */}
        <div className="sidebar-toggle-section">
          <button
            className="toggle-btn"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <ul className="menu-list">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.id} className="menu-item">
                  <button
                    className={`menu-link ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : ''}
                  >
                    <IconComponent className="menu-icon" size={24} />
                    {!isCollapsed && (
                      <div className="menu-text">
                        <span className="menu-label">{item.label}</span>
                        <span className="menu-description">{item.description}</span>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="footer-item">
            <Settings className="menu-icon" size={20} />
            {!isCollapsed && <span className="footer-text">Settings</span>}
          </div>
          <div className="footer-item">
            <HelpCircle className="menu-icon" size={20} />
            {!isCollapsed && <span className="footer-text">Help</span>}
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
