import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Globe,
  HelpCircle,
  Save,
  Info
} from 'lucide-react';
import '../styles/Settings.css';

function Settings() {
  const [settings, setSettings] = useState({
    // User Preferences
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    
    // Privacy Settings
    shareDataForResearch: false,
    allowAnonymousAnalytics: true,
    
    // Display Settings
    theme: 'light',
    language: 'en',
    
    // System Settings
    autoSaveResults: true,
    exportFormat: 'pdf'
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelect = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // In a real app, this would save to backend
    localStorage.setItem('thyrorag_settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  return (
    <div className="settings-container">
      <div className="settings-grid">
        
        {/* Notification Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Bell size={20} />
            <h3>Notifications</h3>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <label>Email Notifications</label>
              <p>Receive updates and reminders via email</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>SMS Notifications</label>
              <p>Get text messages for important updates</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={() => handleToggle('smsNotifications')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Push Notifications</label>
              <p>Receive browser notifications</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={() => handleToggle('pushNotifications')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="settings-section">
          <div className="section-header">
            <Shield size={20} />
            <h3>Privacy & Security</h3>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Share Data for Research</label>
              <p>Help improve thyroid health research (anonymized)</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.shareDataForResearch}
                onChange={() => handleToggle('shareDataForResearch')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Anonymous Analytics</label>
              <p>Help us improve the app with usage data</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.allowAnonymousAnalytics}
                onChange={() => handleToggle('allowAnonymousAnalytics')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="info-box">
            <Info size={16} />
            <span>Your medical data is encrypted and HIPAA compliant</span>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="settings-section">
          <div className="section-header">
            <Palette size={20} />
            <h3>Display Preferences</h3>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Theme</label>
              <p>Choose your preferred color scheme</p>
            </div>
            <select
              value={settings.theme}
              onChange={(e) => handleSelect('theme', e.target.value)}
              className="setting-select"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Language</label>
              <p>Select your preferred language</p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => handleSelect('language', e.target.value)}
              className="setting-select"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>

        {/* System Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Database size={20} />
            <h3>System Settings</h3>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Auto-Save Results</label>
              <p>Automatically save prediction results</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoSaveResults}
                onChange={() => handleToggle('autoSaveResults')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <label>Export Format</label>
              <p>Default format for exporting reports</p>
            </div>
            <select
              value={settings.exportFormat}
              onChange={(e) => handleSelect('exportFormat', e.target.value)}
              className="setting-select"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="excel">Excel</option>
            </select>
          </div>
        </div>

        {/* System Information */}
        <div className="settings-section system-info">
          <div className="section-header">
            <HelpCircle size={20} />
            <h3>System Information</h3>
          </div>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Version:</span>
              <span className="info-value">1.0.0</span>
            </div>
            <div className="info-item">
              <span className="info-label">Build:</span>
              <span className="info-value">2026.01.24</span>
            </div>
            <div className="info-item">
              <span className="info-label">ML Model:</span>
              <span className="info-value">CatBoost v1.2</span>
            </div>
            <div className="info-item">
              <span className="info-label">RAG Engine:</span>
              <span className="info-value">Gemini 2.0 Flash</span>
            </div>
            <div className="info-item">
              <span className="info-label">Database:</span>
              <span className="info-value">ChromaDB</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">January 24, 2026</span>
            </div>
          </div>
        </div>

      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button className="save-btn" onClick={handleSave}>
          <Save size={18} />
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default Settings;
