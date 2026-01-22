import React from 'react';
import {
  ShieldPlus,
  Bell,
  LogIn,
  TestTube,
  Bot,
  History,
  Info,
  ChevronRight,
  ChevronLeft,
  Settings,
  HelpCircle
} from 'lucide-react';
import '../styles/Sidebar.css';

/**
 * Collapsible Sidebar Component
 * Features navigation with Lucide icons and smooth collapse/expand animation
 */
function Sidebar({ isCollapsed, toggleSidebar, activeTab, setActiveTab }) {
  const menuItems = [
    {
      id: 'prediction',
      icon: TestTube,
      label: 'Disease Prediction',
      description: 'Analyze thyroid health'
    },
    {
      id: 'chatbot',
      icon: Bot,
      label: 'Medical Assistant',
      description: 'Ask questions'
    },
    {
      id: 'history',
      icon: History,
      label: 'History',
      description: 'View past results'
    },
    {
      id: 'about',
      icon: Info,
      label: 'About',
      description: 'Learn more'
    }
  ];

  return (
    <>
      {/* Fixed Header */}
      <header className="app-header-fixed">
        <div className="header-left">
          <div className="header-content-fixed">
            <img src="/2.png" alt="ThyroRAG Logo" className="header-icon-img" />
            <div className="header-text">
              <h1 className="header-title">ThyroRAG</h1>
              <p className="header-subtitle">Advanced Medical Analytics</p>
            </div>
          </div>
        </div>

        <div className="header-right">
          <Bell className="icon-btn" size={20} style={{ cursor: 'pointer', color: 'var(--olive-300)' }} />
          <div className="header-user">
            {!isCollapsed && <span className="menu-label">Login</span>}
            <div className="user-avatar">
              <LogIn size={20} />
            </div>
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
            {menuItems.map((item) => (
              <li key={item.id} className="menu-item">
                <button
                  className={`menu-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon className="menu-icon" size={20} />
                  {!isCollapsed && (
                    <div className="menu-text">
                      <span className="menu-label">{item.label}</span>
                      <span className="menu-description">{item.description}</span>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator"></div>
            <span>System Live</span>
          </div>
          <div className="footer-item">
            <Settings size={20} />
            {!isCollapsed && <span className="footer-text">User Settings</span>}
          </div>
          <div className="footer-item">
            <HelpCircle size={20} />
            {!isCollapsed && <span className="footer-text">Help & Support</span>}
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
