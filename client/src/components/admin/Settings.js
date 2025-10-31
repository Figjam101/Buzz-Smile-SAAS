import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [settings, setSettings] = useState({
    monitoring: {
      cpuThreshold: { warning: 80, critical: 90 },
      memoryThreshold: { warning: 80, critical: 90 },
      diskThreshold: { warning: 80, critical: 90 },
      responseTimeThreshold: { warning: 1000, critical: 2000 },
      errorRateThreshold: { warning: 5, critical: 10 },
      refreshInterval: 30
    },
    backup: {
      enabled: true,
      interval: 24,
      maxBackups: 7,
      compression: true,
      directory: '/backups'
    },
    logging: {
      level: 'info',
      maxFileSize: '10MB',
      maxFiles: 5,
      enableConsole: true,
      enableFile: true
    },
    security: {
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      requireTwoFactor: false,
      passwordMinLength: 8
    },
    notifications: {
      emailAlerts: true,
      slackWebhook: '',
      discordWebhook: '',
      alertCooldown: 300
    },
    performance: {
      enableCaching: true,
      cacheTimeout: 3600,
      enableCompression: true,
      maxRequestSize: '10MB'
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('monitoring');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prevSettings => ({ ...prevSettings, ...data }));
        setError(null);
      } else {
        setError('Failed to fetch settings');
      }
    } catch (error) {
      setError('Error fetching settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setSuccess('Settings saved successfully');
        setHasChanges(false);
        setError(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to save settings');
      }
    } catch (error) {
      setError('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!window.confirm('Are you sure you want to reset all settings to default values?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/settings/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchSettings();
        setSuccess('Settings reset to defaults');
        setHasChanges(false);
      } else {
        setError('Failed to reset settings');
      }
    } catch (error) {
      setError('Error resetting settings: ' + error.message);
    }
  };

  const testConnection = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/settings/test/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings.notifications)
      });
      
      if (response.ok) {
        setSuccess(`${type} connection test successful`);
      } else {
        setError(`${type} connection test failed`);
      }
    } catch (error) {
      setError(`Error testing ${type} connection: ` + error.message);
    }
  };

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const updateNestedSetting = (category, parentKey, childKey, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentKey]: {
          ...prev[category][parentKey],
          [childKey]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'monitoring', name: 'Monitoring', icon: '📊' },
    { id: 'backup', name: 'Backup', icon: '💾' },
    { id: 'logging', name: 'Logging', icon: '📝' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'performance', name: 'Performance', icon: '⚡' }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600">Configure system thresholds, preferences, and integrations</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={resetSettings}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Reset to Defaults
          </button>
          <button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              hasChanges && !saving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✅</span>
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Changes Indicator */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-500">⚠️</span>
            <p className="text-yellow-700">You have unsaved changes. Don't forget to save!</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Monitoring Settings */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Monitoring Thresholds</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">CPU Usage Thresholds</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warning (%)</label>
                      <input
                        type="number"
                        value={settings.monitoring.cpuThreshold.warning}
                        onChange={(e) => updateNestedSetting('monitoring', 'cpuThreshold', 'warning', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Critical (%)</label>
                      <input
                        type="number"
                        value={settings.monitoring.cpuThreshold.critical}
                        onChange={(e) => updateNestedSetting('monitoring', 'cpuThreshold', 'critical', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Memory Usage Thresholds</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warning (%)</label>
                      <input
                        type="number"
                        value={settings.monitoring.memoryThreshold.warning}
                        onChange={(e) => updateNestedSetting('monitoring', 'memoryThreshold', 'warning', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Critical (%)</label>
                      <input
                        type="number"
                        value={settings.monitoring.memoryThreshold.critical}
                        onChange={(e) => updateNestedSetting('monitoring', 'memoryThreshold', 'critical', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Disk Usage Thresholds</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Warning (%)</label>
                      <input
                        type="number"
                        value={settings.monitoring.diskThreshold.warning}
                        onChange={(e) => updateNestedSetting('monitoring', 'diskThreshold', 'warning', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Critical (%)</label>
                      <input
                        type="number"
                        value={settings.monitoring.diskThreshold.critical}
                        onChange={(e) => updateNestedSetting('monitoring', 'diskThreshold', 'critical', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Performance Thresholds</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Response Time Warning (ms)</label>
                      <input
                        type="number"
                        value={settings.monitoring.responseTimeThreshold.warning}
                        onChange={(e) => updateNestedSetting('monitoring', 'responseTimeThreshold', 'warning', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Error Rate Warning (%)</label>
                      <input
                        type="number"
                        value={settings.monitoring.errorRateThreshold.warning}
                        onChange={(e) => updateNestedSetting('monitoring', 'errorRateThreshold', 'warning', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Interval (seconds)</label>
                <input
                  type="number"
                  value={settings.monitoring.refreshInterval}
                  onChange={(e) => updateSetting('monitoring', 'refreshInterval', Number(e.target.value))}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Backup Settings */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Backup Configuration</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="backup-enabled"
                    checked={settings.backup.enabled}
                    onChange={(e) => updateSetting('backup', 'enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="backup-enabled" className="ml-2 block text-sm text-gray-900">
                    Enable automatic backups
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Backup Interval (hours)</label>
                  <input
                    type="number"
                    value={settings.backup.interval}
                    onChange={(e) => updateSetting('backup', 'interval', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Backups to Keep</label>
                  <input
                    type="number"
                    value={settings.backup.maxBackups}
                    onChange={(e) => updateSetting('backup', 'maxBackups', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Backup Directory</label>
                  <input
                    type="text"
                    value={settings.backup.directory}
                    onChange={(e) => updateSetting('backup', 'directory', e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="backup-compression"
                    checked={settings.backup.compression}
                    onChange={(e) => updateSetting('backup', 'compression', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="backup-compression" className="ml-2 block text-sm text-gray-900">
                    Enable backup compression
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Logging Settings */}
          {activeTab === 'logging' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Logging Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
                  <select
                    value={settings.logging.level}
                    onChange={(e) => updateSetting('logging', 'level', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum File Size</label>
                  <input
                    type="text"
                    value={settings.logging.maxFileSize}
                    onChange={(e) => updateSetting('logging', 'maxFileSize', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Files to Keep</label>
                  <input
                    type="number"
                    value={settings.logging.maxFiles}
                    onChange={(e) => updateSetting('logging', 'maxFiles', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="logging-console"
                      checked={settings.logging.enableConsole}
                      onChange={(e) => updateSetting('logging', 'enableConsole', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="logging-console" className="ml-2 block text-sm text-gray-900">
                      Enable console logging
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="logging-file"
                      checked={settings.logging.enableFile}
                      onChange={(e) => updateSetting('logging', 'enableFile', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="logging-file" className="ml-2 block text-sm text-gray-900">
                      Enable file logging
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Security Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (hours)</label>
                  <input
                    type="number"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSetting('security', 'sessionTimeout', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Login Attempts</label>
                  <input
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSetting('security', 'maxLoginAttempts', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lockout Duration (minutes)</label>
                  <input
                    type="number"
                    value={settings.security.lockoutDuration}
                    onChange={(e) => updateSetting('security', 'lockoutDuration', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Password Length</label>
                  <input
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => updateSetting('security', 'passwordMinLength', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="security-2fa"
                    checked={settings.security.requireTwoFactor}
                    onChange={(e) => updateSetting('security', 'requireTwoFactor', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="security-2fa" className="ml-2 block text-sm text-gray-900">
                    Require two-factor authentication
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Notification Configuration</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifications-email"
                    checked={settings.notifications.emailAlerts}
                    onChange={(e) => updateSetting('notifications', 'emailAlerts', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notifications-email" className="ml-2 block text-sm text-gray-900">
                    Enable email alerts
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slack Webhook URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={settings.notifications.slackWebhook}
                      onChange={(e) => updateSetting('notifications', 'slackWebhook', e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => testConnection('slack')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Test
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discord Webhook URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={settings.notifications.discordWebhook}
                      onChange={(e) => updateSetting('notifications', 'discordWebhook', e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => testConnection('discord')}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      Test
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alert Cooldown (seconds)</label>
                  <input
                    type="number"
                    value={settings.notifications.alertCooldown}
                    onChange={(e) => updateSetting('notifications', 'alertCooldown', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">Minimum time between duplicate alerts</p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Settings */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Performance Configuration</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="performance-caching"
                    checked={settings.performance.enableCaching}
                    onChange={(e) => updateSetting('performance', 'enableCaching', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="performance-caching" className="ml-2 block text-sm text-gray-900">
                    Enable caching
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cache Timeout (seconds)</label>
                  <input
                    type="number"
                    value={settings.performance.cacheTimeout}
                    onChange={(e) => updateSetting('performance', 'cacheTimeout', Number(e.target.value))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="performance-compression"
                    checked={settings.performance.enableCompression}
                    onChange={(e) => updateSetting('performance', 'enableCompression', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="performance-compression" className="ml-2 block text-sm text-gray-900">
                    Enable response compression
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Request Size</label>
                  <input
                    type="text"
                    value={settings.performance.maxRequestSize}
                    onChange={(e) => updateSetting('performance', 'maxRequestSize', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;