import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  History,
  HeartPulse,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  LogOut,
  UserCircle
} from 'lucide-react';
import '../styles/Sidebar.css';
import 'boxicons/css/boxicons.min.css';

/** Returns up to 2 uppercase initials from a name or email */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic colour for the avatar based on name */
function getAvatarColor(name) {
  const palette = ['#4f8a5b', '#3d7a50', '#2f6842', '#5a9665', '#6aaa76'];
  if (!name) return palette[0];
  return palette[name.charCodeAt(0) % palette.length];
}

/**
 * Collapsible Sidebar Component
 * Features navigation with Lucide icons and smooth collapse/expand animation
 */
function Sidebar({ isCollapsed, toggleSidebar, activeTab, setActiveTab, user, onLogout }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            {/* Profile Avatar with Dropdown */}
            {user && (
              <div className="profile-avatar-wrapper" ref={profileRef}>
                <button
                  className="profile-avatar-btn"
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  title={user.fullName}
                  aria-label="Open profile menu"
                >
                  <div
                    className="avatar-circle"
                    style={{ background: getAvatarColor(user.fullName) }}
                  >
                    {getInitials(user.fullName)}
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="profile-dropdown">
                    {/* Header */}
                    <div className="profile-dropdown-header">
                      <div
                        className="avatar-circle avatar-circle-lg"
                        style={{ background: getAvatarColor(user.fullName) }}
                      >
                        {getInitials(user.fullName)}
                      </div>
                      <div className="profile-dropdown-info">
                        <p className="profile-dropdown-name">{user.fullName}</p>
                        <p className="profile-dropdown-email">{user.username}</p>
                      </div>
                    </div>

                    <div className="profile-dropdown-divider" />

                    {/* Profile Settings */}
                    <button
                      className="profile-menu-item"
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                    >
                      <UserCircle size={15} />
                      Profile Settings
                    </button>

                    <div className="profile-dropdown-divider" />

                    {/* Logout */}
                    <button
                      className="profile-menu-item profile-menu-logout"
                      onClick={() => { onLogout(); setShowProfileMenu(false); }}
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
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
            {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <ul className="menu-list">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="menu-item">
                  <button
                    className={`menu-link ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className="menu-icon" size={24} />
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

      </div>
    </>
  );
}

export default Sidebar;
