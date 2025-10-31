import React, { useState, useEffect, useRef } from 'react';

const SystemMonitoring = () => {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [error, setError] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchMetrics();
        fetchAlerts();
      }, refreshInterval * 1000);
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
  }, [autoRefresh, refreshInterval]);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/monitoring/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        
        // Add to historical data for charts
        setHistoricalData(prev => {
          const newData = [...prev, {
            timestamp: new Date().toISOString(),
            cpu: data.system?.cpu?.usage || 0,
            memory: data.system?.memory?.usage || 0,
            disk: data.system?.disk?.usage || 0
          }];
          // Keep only last 20 data points
          return newData.slice(-20);
        });
        
        setError(null);
      } else {
        setError('Failed to fetch metrics');
      }
    } catch (error) {
      setError('Error fetching metrics: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/monitoring/alerts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getStatusColor = (value, thresholds) => {
    if (value >= (thresholds?.critical || 90)) return 'text-red-600 bg-red-50';
    if (value >= (thresholds?.warning || 80)) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = (value, thresholds) => {
    if (value >= (thresholds?.critical || 90)) return 'bg-red-500';
    if (value >= (thresholds?.warning || 80)) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const SimpleChart = ({ data, dataKey, color, label }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey]), 100);
    const width = 300;
    const height = 100;
    
    if (data.length < 2) return <div className="text-gray-500 text-sm">Collecting data...</div>;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d[dataKey] / maxValue) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
        <svg width={width} height={height} className="border rounded">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{stopColor: color, stopOpacity: 0.3}} />
              <stop offset="100%" style={{stopColor: color, stopOpacity: 0.1}} />
            </linearGradient>
          </defs>
          <polygon
            fill={`url(#gradient-${dataKey})`}
            points={`0,${height} ${points} ${width},${height}`}
          />
        </svg>
        <div className="text-xs text-gray-500 mt-1">
          Current: {data[data.length - 1]?.[dataKey]?.toFixed(1)}%
        </div>
      </div>
    );
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
          <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
          <p className="text-gray-600">Real-time system performance and health metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Refresh:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
            </select>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              autoRefresh 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>{autoRefresh ? '⏸️' : '▶️'}</span>
            <span>{autoRefresh ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-red-900 mb-3">🚨 Active Alerts</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                <div>
                  <p className="font-medium text-red-900">{alert.message}</p>
                  <p className="text-sm text-red-600">{new Date(alert.timestamp).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">CPU Usage</h3>
            <span className="text-2xl">🖥️</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Current</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(metrics?.system?.cpu?.usage || 0)}`}>
                {(metrics?.system?.cpu?.usage || 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics?.system?.cpu?.usage || 0)}`}
                style={{ width: `${metrics?.system?.cpu?.usage || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              Cores: {metrics?.system?.cpu?.cores || 'N/A'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Memory</h3>
            <span className="text-2xl">💾</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(metrics?.system?.memory?.usage || 0)}`}>
                {(metrics?.system?.memory?.usage || 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics?.system?.memory?.usage || 0)}`}
                style={{ width: `${metrics?.system?.memory?.usage || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {formatBytes(metrics?.system?.memory?.used || 0)} / {formatBytes(metrics?.system?.memory?.total || 0)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Disk Space</h3>
            <span className="text-2xl">💿</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(metrics?.system?.disk?.usage || 0)}`}>
                {(metrics?.system?.disk?.usage || 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(metrics?.system?.disk?.usage || 0)}`}
                style={{ width: `${metrics?.system?.disk?.usage || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              {formatBytes(metrics?.system?.disk?.used || 0)} / {formatBytes(metrics?.system?.disk?.total || 0)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Uptime</h3>
            <span className="text-2xl">⏱️</span>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {formatUptime(metrics?.system?.uptime || 0)}
            </div>
            <div className="text-xs text-gray-500">
              Since: {metrics?.system?.startTime ? new Date(metrics.system.startTime).toLocaleString() : 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <SimpleChart 
          data={historicalData} 
          dataKey="cpu" 
          color="#3B82F6" 
          label="CPU Usage (%)" 
        />
        <SimpleChart 
          data={historicalData} 
          dataKey="memory" 
          color="#10B981" 
          label="Memory Usage (%)" 
        />
        <SimpleChart 
          data={historicalData} 
          dataKey="disk" 
          color="#8B5CF6" 
          label="Disk Usage (%)" 
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Response Time</span>
              <span className="font-semibold">{metrics?.performance?.avgResponseTime || 0}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Requests per Minute</span>
              <span className="font-semibold">{metrics?.performance?.requestsPerMinute || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Error Rate</span>
              <span className={`font-semibold ${(metrics?.performance?.errorRate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {(metrics?.performance?.errorRate || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Connections</span>
              <span className="font-semibold">{metrics?.performance?.activeConnections || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Connection Pool</span>
              <span className="font-semibold">
                {metrics?.database?.activeConnections || 0} / {metrics?.database?.maxConnections || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Query Time</span>
              <span className="font-semibold">{metrics?.database?.avgQueryTime || 0}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Slow Queries</span>
              <span className={`font-semibold ${(metrics?.database?.slowQueries || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics?.database?.slowQueries || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database Size</span>
              <span className="font-semibold">{formatBytes(metrics?.database?.size || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoring;