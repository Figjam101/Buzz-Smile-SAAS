import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

// Helper to safely build API URLs without duplicating '/api'
const buildApiUrl = (path) => {
  const baseRaw = process.env.REACT_APP_API_URL || '';
  const base = baseRaw.replace(/\/$/, ''); // trim trailing slash
  const hasApiSuffix = /\/api$/.test(base);
  const prefix = hasApiSuffix ? '' : '/api';
  return `${base}${prefix}${path}`;
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userStats, setUserStats] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    isActive: true,
    password: '',
    confirmPassword: ''
  });

  // Credits modal state
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditTarget, setCreditTarget] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState('');

  const passwordInputRef = useRef(null);
  const [focusPassword, setFocusPassword] = useState(false);

  // Add Escape-to-close for modal(s)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showUserModal) handleModalClose();
        if (showCreditsModal) handleCreditsClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showUserModal, showCreditsModal]);

  useEffect(() => {
    if (focusPassword && showUserModal && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [focusPassword, showUserModal]);

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching users with token:', token ? 'Token exists' : 'No token');
      console.log('API URL:', process.env.REACT_APP_API_URL);
      
      const response = await fetch(buildApiUrl('/admin/users'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Users API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setUsers(data.users || data || []);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error('Users API error:', response.status, errorText);
        setError(`Failed to fetch users: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching user stats with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(buildApiUrl('/admin/stats'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('User stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('User stats data received:', data);
        setUserStats(data);
      } else {
        const errorText = await response.text();
        console.error('User stats API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`/admin/users/${userId}/role`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        fetchUsers();
        fetchUserStats();
      } else {
        setError('Failed to update user role');
      }
    } catch (error) {
      setError('Error updating user role: ' + error.message);
    }
  };

  const updateUserStatus = async (userId, isActive) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`/admin/users/${userId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });
      
      if (response.ok) {
        fetchUsers();
        fetchUserStats();
      } else {
        setError('Failed to update user status');
      }
    } catch (error) {
      setError('Error updating user status: ' + error.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`/admin/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchUsers();
        fetchUserStats();
      } else {
        setError('Failed to delete user');
      }
    } catch (error) {
      setError('Error deleting user: ' + error.message);
    }
  };

  const bulkUpdateUsers = async (action) => {
    if (selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('/admin/users/bulk'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userIds: selectedUsers,
          action: action
        })
      });
      
      if (response.ok) {
        fetchUsers();
        fetchUserStats();
        setSelectedUsers([]);
      } else {
        setError(`Failed to ${action} users`);
      }
    } catch (error) {
      setError(`Error ${action} users: ` + error.message);
    }
  };

  const exportUsers = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Email,Role,Status,Joined,Last Active\n"
      + users.map(user => 
          `${user.name || 'N/A'},${user.email},${user.role},${user.status || (user.isActive ? 'active' : 'inactive')},${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'},${user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleModalClose = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'user',
      isActive: true,
      password: '',
      confirmPassword: ''
    });
  };

  const handleModalOpen = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        isActive: user.status === 'active' || user.isActive,
        password: '',
        confirmPassword: ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'user',
        isActive: true,
        password: '',
        confirmPassword: ''
      });
    }
    setFocusPassword(false);
    setShowUserModal(true);
  };

  // Credits modal open/close
  const handleCreditsOpen = (user) => {
    setCreditTarget(user);
    setCreditAmount('');
    setCreditsError('');
    setShowCreditsModal(true);
  };
  const handleCreditsClose = () => {
    setShowCreditsModal(false);
    setCreditTarget(null);
    setCreditAmount('');
    setCreditsError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match if password is provided
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setModalLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const submitData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.isActive ? 'active' : 'inactive'
      };

      // Only include password if it's provided
      if (formData.password) {
        submitData.password = formData.password;
      }

      let response;
      if (editingUser) {
        // Update existing user
        response = await fetch(buildApiUrl(`/admin/users/${editingUser._id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(submitData)
        });
      } else {
        // Create new user
        response = await fetch(buildApiUrl('/admin/users'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(submitData)
        });
      }

      if (response.ok) {
        handleModalClose();
        fetchUsers(); // Refresh the user list
        fetchUserStats(); // Refresh stats
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Failed to save user');
    } finally {
      setModalLoading(false);
    }
  };

  const resetUserPassword = async (userId) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password? They will receive an email with a new temporary password.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`/admin/users/${userId}/reset-password`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Password reset email sent successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Failed to reset password');
    }
  };



  const openChangePassword = (user) => {
    handleModalOpen(user);
    setFocusPassword(true);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 0);
  };

  // Replace old addCredits prompt-based function with modal submit handler
  const submitAddCredits = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(creditAmount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setCreditsError('Please enter a valid positive number.');
      return;
    }
    if (!creditTarget?._id) {
      setCreditsError('No user selected.');
      return;
    }
    try {
      setCreditsLoading(true);
      setCreditsError('');
      const token = localStorage.getItem('token');
      const url = buildApiUrl(`/admin/users/${creditTarget._id}/credits`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amountNum })
      });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        handleCreditsClose();
        // Success notification with amount and (optional) new balance
        const newBalance = data?.user?.credits?.balance;
        const targetEmail = data?.user?.email || creditTarget?.email;
        const msg = newBalance !== undefined
          ? `${amountNum} credits added to ${targetEmail}. New balance: ${newBalance}.`
          : `${amountNum} credits added to ${targetEmail}.`;
        toast.success(msg);
        fetchUsers();
      } else {
        const err = await response.json().catch(() => ({}));
        setCreditsError(err.message || 'Failed to add credits');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
      setCreditsError('Failed to add credits');
    } finally {
      setCreditsLoading(false);
    }
  };


  // Filter and search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-yellow-100 text-yellow-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
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
    <> 
      <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportUsers}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <span>📊</span>
            <span>Export</span>
          </button>
          <button
            onClick={() => handleModalOpen()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Add User</span>
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

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.users || 0}</p>
            </div>
            <span className="text-3xl">👥</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Videos</p>
              <p className="text-2xl font-bold text-green-600">{userStats.videos || 0}</p>
            </div>
            <span className="text-3xl">🎥</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admin Users</p>
              <p className="text-2xl font-bold text-purple-600">{userStats.admins || 0}</p>
            </div>
            <span className="text-3xl">⭐</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <p className="text-2xl font-bold text-blue-600">Online</p>
            </div>
            <span className="text-3xl">📈</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="premium">Premium</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRole('all');
                setFilterStatus('all');
              }}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => bulkUpdateUsers('activate')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => bulkUpdateUsers('deactivate')}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(currentUsers.map(user => user._id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user._id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user._id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}
                    >
                      <option value="user">User</option>
                      <option value="premium">Premium</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {typeof user?.credits?.balance === 'number' ? user.credits.balance : 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => updateUserStatus(user._id, !user.isActive)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(user.isActive)}`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowUserModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        title="Edit user"
                      >
                        <span>✏️</span>
                        <span className="sr-only">Edit</span>
                      </button>
                      <button
                        onClick={() => openChangePassword(user)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                        title="Change password"
                      >
                        <span>🔒</span>
                        <span className="sr-only">Change Password</span>
                      </button>
                      <button
                        onClick={() => handleCreditsOpen(user)}
                        className="text-amber-600 hover:text-amber-900 flex items-center space-x-1"
                        title="Add credits"
                      >
                        <span>🪙</span>
                        <span className="sr-only">Add Credits</span>
                      </button>
                      <button
                        onClick={() => resetUserPassword(user._id)}
                        className="text-yellow-600 hover:text-yellow-900 flex items-center space-x-1"
                        title="Reset password"
                      >
                        <span>♻️</span>
                        <span className="sr-only">Reset Password</span>
                      </button>
                      <button
                        onClick={() => deleteUser(user._id)}
                        className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                        title="Delete user"
                      >
                        <span>🗑️</span>
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{' '}
                  <span className="font-medium">{filteredUsers.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-500 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl">👥</span>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first user.'}
          </p>
        </div>
      )}
    </div>

      {showCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCreditsClose}></div>
          <div className="relative w-full max-w-md mx-auto px-6 py-5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-xl bg-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 text-xl">🪙</span>
                <h3 className="text-lg font-semibold text-gray-900">Add Credits</h3>
              </div>
              <button onClick={handleCreditsClose} className="p-2 rounded-full hover:bg-white/20" aria-label="Close">✕</button>
            </div>
            <p className="text-sm text-gray-700 mb-4">Add credits to <span className="font-medium">{creditTarget?.email}</span></p>
            {creditsError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{creditsError}</div>
            )}
            <form onSubmit={submitAddCredits} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="flex items-center gap-2 bg-white/30 border border-white/30 rounded-lg px-3 py-2">
                  <span className="text-amber-600">🪙</span>
                  <input type="number" min="1" step="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="Enter credits, e.g., 10" className="w-full bg-transparent outline-none placeholder-gray-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleCreditsClose} className="px-4 py-2 rounded-lg bg-white/30 hover:bg-white/40 text-gray-800">Cancel</button>
                <button type="submit" disabled={creditsLoading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{creditsLoading ? 'Adding…' : 'Add Credits'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleModalClose}></div>
          <div className="relative w-full max-w-lg mx-auto px-6 py-5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-xl bg-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 text-xl">👤</span>
                <h3 className="text-lg font-semibold text-gray-900">{editingUser ? 'Edit User' : 'Add User'}</h3>
              </div>
              <button onClick={handleModalClose} className="p-2 rounded-full hover:bg-white/20" aria-label="Close">✕</button>
            </div>
            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full name" className="w-full bg-white/30 border border-white/30 rounded-lg px-3 py-2 outline-none placeholder-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@example.com" className="w-full bg-white/30 border border-white/30 rounded-lg px-3 py-2 outline-none placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full bg-white/30 border border-white/30 rounded-lg px-3 py-2 outline-none">
                    <option value="user">User</option>
                    <option value="premium">Premium</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input id="isActive" type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input ref={passwordInputRef} type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Optional" className="w-full bg-white/30 border border-white/30 rounded-lg px-3 py-2 outline-none placeholder-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Optional" className="w-full bg-white/30 border border-white/30 rounded-lg px-3 py-2 outline-none placeholder-gray-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={handleModalClose} className="px-4 py-2 rounded-lg bg-white/30 hover:bg-white/40 text-gray-800">Cancel</button>
                <button type="submit" disabled={modalLoading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{editingUser ? (modalLoading ? 'Saving…' : 'Save') : (modalLoading ? 'Creating…' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;