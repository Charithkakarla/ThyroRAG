import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  History,
  HeartPulse,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  LogOut,
  UserCircle,
  Menu,
  X,
  BarChart3,
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
function Sidebar({ isCollapsed, toggleSidebar, activeTab, setActiveTab, user, onLogout, isGuest }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: 'Analytics',
      description: 'Hormone Trends'
    }
  ];

  return (
    <>
      {/* Fixed Header */}
      <header className="app-header-fixed">
        <div className="header-container-flex">
          <div className="header-content-fixed">
            {/* Hamburger — mobile only */}
            <button
              className="hamburger-btn"
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <HeartPulse className="header-icon" size={36} />
            <div className="header-text">
              <h1 className="header-title">ThyroRAG</h1>
              <p className="header-subtitle">AI-Powered Thyroid Assistant</p>
            </div>
          </div>

          <div className="header-actions-static">
            {/* Guest: show Sign In button */}
            {isGuest && !user && (
              <button
                className="header-signin-btn"
                onClick={() => window.location.href = '/sign-in'}
              >
                Sign In
              </button>
            )}
            {/* Logged-in: Profile Avatar with Dropdown */}
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
                      onClick={() => { setShowProfileMenu(false); setShowLogoutConfirm(true); }}
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

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>


        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <ul className="menu-list">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="menu-item">
                  <button
                    className={`menu-link ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className="menu-icon" size={24} />
                    <div className="menu-text">
                      <span className="menu-label">{item.label}</span>
                      <span className="menu-description">{item.description}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

      </div>
      {/* ── Logout Confirmation Modal ── */}
      {showLogoutConfirm && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="logout-modal" onClick={e => e.stopPropagation()}>
            <h2 className="logout-modal-title">Are you sure you want to log out?</h2>
            <p className="logout-modal-sub">Log out of ThyroRAG as {user?.username}?</p>
            <button className="logout-modal-btn-confirm" onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>
              Log out
            </button>
            <button className="logout-modal-btn-cancel" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
