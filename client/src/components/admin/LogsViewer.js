import React, { useState, useEffect, useRef } from 'react';

const LogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const logsEndRef = useRef(null);

  const logLevels = ['all', 'error', 'warn', 'info', 'debug'];
  const logCategories = ['all', 'api', 'user', 'security', 'performance', 'database', 'file', 'video', 'auth', 'system'];
  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' }
  ];

  useEffect(() => {
    fetchLogs();
    fetchStats();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, selectedLevel, selectedCategory, dateRange]);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        level: selectedLevel !== 'all' ? selectedLevel : '',
        category: selectedCategory !== 'all' ? selectedCategory : '',
        dateRange: dateRange,
        limit: 1000
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/monitoring/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setError(null);
      } else {
        setError('Failed to fetch logs');
      }
    } catch (error) {
      setError('Error fetching logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/monitoring/logs/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching log stats:', error);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.meta && JSON.stringify(log.meta).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    setFilteredLogs(filtered);
  };

  const clearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/monitoring/logs/clean`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setLogs([]);
        setFilteredLogs([]);
        fetchStats();
      } else {
        setError('Failed to clear logs');
      }
    } catch (error) {
      setError('Error clearing logs: ' + error.message);
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `logs-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Logs Viewer</h2>
          <p className="text-gray-600">Monitor system logs and activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              autoRefresh 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>{autoRefresh ? '⏸️' : '▶️'}</span>
            <span>{autoRefresh ? 'Stop' : 'Auto Refresh'}</span>
          </button>
          <button
            onClick={exportLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>📥</span>
            <span>Export</span>
          </button>
          <button
            onClick={clearLogs}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <span>🗑️</span>
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-sm text-red-600 font-medium">Errors</p>
                <p className="text-2xl font-bold text-red-900">{stats.errors || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm text-yellow-600 font-medium">Warnings</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.warnings || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="text-sm text-blue-600 font-medium">Info</p>
                <p className="text-2xl font-bold text-blue-900">{stats.info || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📝</span>
              <div>
                <p className="text-sm text-gray-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {logLevels.map(level => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {logCategories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={scrollToBottom}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
            >
              <span>⬇️</span>
              <span>Bottom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Logs Display */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Logs ({filteredLogs.length})
          </h3>
          {autoRefresh && (
            <div className="flex items-center space-x-2 text-green-600">
              <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Live</span>
            </div>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-gray-600">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <span className="text-xl flex-shrink-0 mt-1">
                      {getLevelIcon(log.level)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        {log.category && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {log.category}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{log.message}</p>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            Show details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-700 overflow-x-auto">
                            {JSON.stringify(log.meta, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsViewer;