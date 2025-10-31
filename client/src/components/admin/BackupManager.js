import React, { useState, useEffect } from 'react';

const BackupManager = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fullBackups, setFullBackups] = useState([]);

  // Resolve API base, falling back to same-origin relative path
  const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  const api = (path) => `${API_BASE}${path}`;

  useEffect(() => {
    fetchBackups();
    fetchStatus();
    fetchFullBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/backup/list'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups || []);
      } else {
        setError('Failed to fetch backups');
      }
    } catch (error) {
      setError('Error fetching backups: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/backup/status'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching backup status:', error);
    }
  };

  const fetchFullBackups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/backup-simple/list'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFullBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Error fetching full backups:', error);
    }
  };

  const createFullBackup = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/backup-simple/create'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSuccess('Full website backup created successfully!');
        // Refresh lists
        fetchFullBackups();
        fetchBackups();
        fetchStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create full backup');
      }
    } catch (error) {
      setError('Error creating full backup: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const downloadFullBackup = async (backupName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/backup-simple/download/${backupName}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      // Determine filename from headers or fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${backupName}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^\"]+)"/);
        if (match && match[1]) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download backup');
    }
  };

  const createBackup = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api('/api/backup/create'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess('Backup created successfully!');
        fetchBackups();
        fetchStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create backup');
      }
    } catch (error) {
      setError('Error creating backup: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (backupName) => {
    if (!window.confirm(`Are you sure you want to restore from backup "${backupName}"? This will overwrite the current database.`)) {
      return;
    }

    setRestoring(backupName);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/backup/restore/${backupName}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setSuccess(`Database restored from backup "${backupName}" successfully!`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to restore backup');
      }
    } catch (error) {
      setError('Error restoring backup: ' + error.message);
    } finally {
      setRestoring(null);
    }
  };

  const deleteBackup = async (backupName) => {
    if (!window.confirm(`Are you sure you want to delete backup "${backupName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(backupName);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(api(`/api/backup/${backupName}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setSuccess(`Backup "${backupName}" deleted successfully!`);
        fetchBackups();
        fetchStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete backup');
      }
    } catch (error) {
      setError('Error deleting backup: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Backup Manager</h2>
          <p className="text-gray-600">Manage database backups and restore points</p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Create Backup</span>
            </>
          )}
        </button>
        <button
          onClick={createFullBackup}
          disabled={creating}
          className="ml-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {creating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating...</span>
            </>
          ) : (
            <>
              <span>🌐</span>
              <span>Create Full Backup</span>
            </>
          )}
        </button>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Backups</p>
                <p className="text-2xl font-bold text-blue-900">{status.totalBackups || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💾</span>
              <div>
                <p className="text-sm text-green-600 font-medium">Total Size</p>
                <p className="text-2xl font-bold text-green-900">{formatFileSize(status.totalSize || 0)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🕒</span>
              <div>
                <p className="text-sm text-purple-600 font-medium">Last Backup</p>
                <p className="text-lg font-bold text-purple-900">
                  {status.lastBackup ? formatDate(status.lastBackup) : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✅</span>
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Backups Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Available Backups</h3>
        </div>
        
        {backups.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No backups found</h3>
            <p className="text-gray-600 mb-4">Create your first backup to get started</p>
            <button
              onClick={createBackup}
              disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create First Backup
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Backup Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">💾</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{backup.name}</div>
                          <div className="text-sm text-gray-500">{backup.path}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(backup.created)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(backup.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        backup.compressed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {backup.compressed ? 'Compressed' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => restoreBackup(backup.name)}
                          disabled={restoring === backup.name}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {restoring === backup.name ? (
                            <div className="flex items-center space-x-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Restoring...</span>
                            </div>
                          ) : (
                            '🔄 Restore'
                          )}
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.name)}
                          disabled={deleting === backup.name}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleting === backup.name ? (
                            <div className="flex items-center space-x-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Deleting...</span>
                            </div>
                          ) : (
                            '🗑️ Delete'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Backup Schedule Info */}
      {status && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">Backup Schedule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-700"><strong>Interval:</strong> Every {status.interval || 24} hours</p>
              <p className="text-blue-700"><strong>Max Backups:</strong> {status.maxBackups || 30}</p>
            </div>
            <div>
              <p className="text-blue-700"><strong>Compression:</strong> {status.compression ? 'Enabled' : 'Disabled'}</p>
              <p className="text-blue-700"><strong>Next Backup:</strong> {status.nextBackup ? formatDate(status.nextBackup) : 'Not scheduled'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Full Website Backups */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Full Website Backups</h3>
          <span className="text-sm text-gray-600">Includes database, server, client, config</span>
        </div>

        {fullBackups.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🗂️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No full backups found</h3>
            <p className="text-gray-600 mb-4">Create a full backup to download your complete site</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Backup Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fullBackups.map((backup, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📦</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{backup.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(backup.created)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatFileSize(backup.size)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${backup.compressed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {backup.compressed ? 'Compressed' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => downloadFullBackup(backup.name)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          📥 Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager;