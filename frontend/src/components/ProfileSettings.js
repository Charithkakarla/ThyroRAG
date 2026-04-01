import React, { useState, useRef, useCallback } from 'react';
import {
  User, Camera, Trash2,
  Bell, Shield, Palette, Database, Save, Info,
  X, CheckCircle, AlertCircle
} from 'lucide-react';
import { useUser } from '@clerk/react';
import '../styles/Settings.css';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function getAvatarColor(name) {
  const palette = ['#4f8a5b', '#3d7a50', '#2f6842', '#5a9665', '#6aaa76'];
  if (!name) return palette[0];
  return palette[name.charCodeAt(0) % palette.length];
}

// ── Toast hook ────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, push, dismiss };
}

function ToastStack({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' && <CheckCircle size={16} />}
            {t.type === 'error' && <AlertCircle size={16} />}
            {t.type === 'info' && <Info size={16} />}
          </span>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function ProfileSettings() {
  const { user } = useUser();
  const fileInputRef = useRef(null);
  const { toasts, push: notify, dismiss } = useToast();

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || '';
  const email = user?.primaryEmailAddress?.emailAddress || '';

  // Profile state
  const [profileName, setProfileName] = useState(displayName);
  const [profileSaving, setProfileSaving] = useState(false);

  // Picture state
  const [picUploading, setPicUploading] = useState(false);
  const [picPreview, setPicPreview] = useState(user?.imageUrl || null);

  // General settings state
  const defaultSettings = {
    emailNotifications: true, smsNotifications: false, pushNotifications: true,
    shareDataForResearch: false, allowAnonymousAnalytics: true,
    theme: 'light', language: 'en',
    autoSaveResults: true, exportFormat: 'pdf',
    ...((() => { try { return JSON.parse(localStorage.getItem('thyrorag_settings')) || {}; } catch { return {}; } })())
  };
  const [prefs, setPrefs] = useState(defaultSettings);

  const handleToggle = (key) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  const handleSelect = (key, value) => setPrefs(prev => ({ ...prev, [key]: value }));

  // ── Handlers ──────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const parts = profileName.trim().split(/\s+/);
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ');
      await user.update({ firstName, ...(lastName ? { lastName } : {}) });
      notify('Profile name updated successfully.', 'success');
    } catch {
      notify('Failed to update profile. Please try again.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPicUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => setPicPreview(ev.target.result);
    reader.readAsDataURL(file);
    notify('Uploading photo…', 'info');
    try {
      await user.setProfileImage({ file });
      notify('Profile photo updated!', 'success');
    } catch {
      notify('Upload failed. Please use a JPEG or PNG file.', 'error');
      setPicPreview(user?.imageUrl || null);
    } finally {
      setPicUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePic = async () => {
    if (!user) return;
    setPicUploading(true);
    try {
      await user.setProfileImage({ file: null });
      setPicPreview(null);
      notify('Profile photo removed.', 'info');
    } catch {
      notify('Could not remove photo. Try again.', 'error');
    } finally {
      setPicUploading(false);
    }
  };

  const handleSavePrefs = () => {
    localStorage.setItem('thyrorag_settings', JSON.stringify(prefs));
    notify('Preferences saved!', 'success');
  };

  const handleToggleWithNotify = (key, label) => {
    setPrefs(prev => {
      const next = !prev[key];
      notify(`${label} ${next ? 'enabled' : 'disabled'}.`, 'info');
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="settings-container">
      <ToastStack toasts={toasts} dismiss={dismiss} />

      <div className="settings-grid">

        {/* ── Profile Identity ──────────────────────────────── */}
        <div className="settings-section profile-settings-section">
          <div className="section-header">
            <User size={20} />
            <h3>Profile</h3>
          </div>

          {/* Picture upload */}
          <div className="profile-picture-row">
            <div className="profile-picture-wrap">
              {picPreview ? (
                <img src={picPreview} alt="Profile" className="profile-picture-img" />
              ) : (
                <div
                  className="avatar-circle avatar-circle-xl"
                  style={{ background: getAvatarColor(profileName || email) }}
                >
                  {getInitials(profileName || email)}
                </div>
              )}
              <button
                className="picture-camera-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change photo"
                disabled={picUploading}
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="profile-picture-actions">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="pic-action-btn pic-action-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={picUploading}
                >
                  {picUploading ? 'Uploading…' : 'Change Photo'}
                </button>
                {picPreview && (
                  <button
                    className="pic-action-btn pic-action-remove"
                    onClick={handleRemovePic}
                    disabled={picUploading}
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handlePicChange}
            />
          </div>

          {/* Display name */}
          <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div className="setting-info">
              <label htmlFor="profile-name">Display Name</label>
              <p>This name appears in the app header</p>
            </div>
            <input
              id="profile-name"
              type="text"
              className="profile-name-input"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div className="setting-info">
              <label>Email Address</label>
              <p>Your account email (cannot be changed here)</p>
            </div>
            <input
              type="email"
              className="profile-name-input"
              value={email}
              readOnly
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <button
            className="profile-save-btn"
            onClick={handleSaveProfile}
            disabled={profileSaving || profileName.trim() === displayName}
          >
            {profileSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        {/* ── Notifications ─────────────────────────────────── */}
        <div className="settings-section">
          <div className="section-header">
            <Bell size={20} />
            <h3>Notifications</h3>
          </div>
          {[['emailNotifications','Email Notifications','Receive updates and reminders via email'],
            ['smsNotifications','SMS Notifications','Get text messages for important updates'],
            ['pushNotifications','Push Notifications','Receive browser notifications']
          ].map(([key, label, desc]) => (
            <div className="setting-item" key={key}>
              <div className="setting-info"><label>{label}</label><p>{desc}</p></div>
              <label className="toggle-switch">
                <input type="checkbox" checked={prefs[key]} onChange={() => handleToggleWithNotify(key, label)} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>

        {/* ── Privacy & Security ────────────────────────────── */}
        <div className="settings-section">
          <div className="section-header">
            <Shield size={20} />
            <h3>Privacy &amp; Security</h3>
          </div>
          {[['shareDataForResearch','Share Data for Research','Help improve thyroid health research (anonymized)'],
            ['allowAnonymousAnalytics','Anonymous Analytics','Help us improve the app with usage data']
          ].map(([key, label, desc]) => (
            <div className="setting-item" key={key}>
              <div className="setting-info"><label>{label}</label><p>{desc}</p></div>
              <label className="toggle-switch">
                <input type="checkbox" checked={prefs[key]} onChange={() => handleToggleWithNotify(key, label)} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
          <div className="info-box">
            <Info size={16} />
            <span>Your medical data is encrypted and HIPAA compliant</span>
          </div>
        </div>

        {/* ── Display Preferences ───────────────────────────── */}
        <div className="settings-section">
          <div className="section-header">
            <Palette size={20} />
            <h3>Display Preferences</h3>
          </div>
          <div className="setting-item">
            <div className="setting-info"><label>Theme</label><p>Choose your preferred color scheme</p></div>
            <select value={prefs.theme} onChange={e => handleSelect('theme', e.target.value)} className="setting-select">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
          <div className="setting-item">
            <div className="setting-info"><label>Language</label><p>Select your preferred language</p></div>
            <select value={prefs.language} onChange={e => handleSelect('language', e.target.value)} className="setting-select">
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>

        {/* ── System Settings ───────────────────────────────── */}
        <div className="settings-section">
          <div className="section-header">
            <Database size={20} />
            <h3>System Settings</h3>
          </div>
          <div className="setting-item">
            <div className="setting-info"><label>Auto-Save Results</label><p>Automatically save prediction results</p></div>
            <label className="toggle-switch">
              <input type="checkbox" checked={prefs.autoSaveResults} onChange={() => handleToggleWithNotify('autoSaveResults', 'Auto-Save Results')} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="setting-item">
            <div className="setting-info"><label>Export Format</label><p>Default format for exporting reports</p></div>
            <select value={prefs.exportFormat} onChange={e => handleSelect('exportFormat', e.target.value)} className="setting-select">
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="excel">Excel</option>
            </select>
          </div>
        </div>

      </div>

      {/* Save preferences */}
      <div className="settings-actions">
        <button className="save-btn" onClick={handleSavePrefs}>
          <Save size={18} /> Save Preferences
        </button>
      </div>
    </div>
  );
}

export default ProfileSettings;

