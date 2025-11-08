import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Instagram, Facebook, Twitter, Youtube, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SocialMediaCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const platforms = {
    instagram: { icon: Instagram, color: 'bg-pink-500', name: 'Instagram' },
    facebook: { icon: Facebook, color: 'bg-blue-600', name: 'Facebook' },
    twitter: { icon: Twitter, color: 'bg-black', name: 'Twitter/X' },
    youtube: { icon: Youtube, color: 'bg-red-600', name: 'YouTube' },
  };

  const fetchScheduledPosts = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await fetch(`/api/social/scheduled?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const posts = await response.json();
        setScheduledPosts(posts);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      toast.error('Failed to load scheduled posts');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchScheduledPosts();
  }, [fetchScheduledPosts]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getPostsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toDateString();
    return scheduledPosts.filter(post => 
      new Date(post.scheduledAt).toDateString() === dateStr
    );
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled post?')) return;
    
    try {
      const response = await fetch(`/api/social/scheduled/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        toast.success('Scheduled post deleted');
        fetchScheduledPosts();
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'posted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Social Media Calendar</h2>
              <p className="text-sm text-gray-600">Manage your scheduled posts</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-medium text-gray-900 min-w-[140px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {days.map((day, index) => {
              const posts = day ? getPostsForDate(day) : [];
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isSelected = selectedDate && day && day.toDateString() === selectedDate.toDateString();
              
              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-gray-100 ${
                    day ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${isToday ? 'bg-blue-50 border-blue-200' : ''} ${
                    isSelected ? 'bg-blue-100 border-blue-300' : ''
                  }`}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {posts.slice(0, 3).map((post, postIndex) => {
                          const platformData = platforms[post.platforms[0]];
                          const Icon = platformData?.icon;
                          
                          return (
                            <div
                              key={postIndex}
                              className="flex items-center space-x-1 text-xs bg-white rounded px-1 py-0.5 border"
                            >
                              {Icon && (
                                <div className={`w-3 h-3 ${platformData.color} rounded-sm flex items-center justify-center`}>
                                  <Icon className="w-2 h-2 text-white" />
                                </div>
                              )}
                              <span className="truncate flex-1">{post.caption.slice(0, 15)}...</span>
                              {getStatusIcon(post.status)}
                            </div>
                          );
                        })}
                        {posts.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{posts.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Posts for {selectedDate.toLocaleDateString()}
          </h3>
          
          {getPostsForDate(selectedDate).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No posts scheduled for this date</p>
          ) : (
            <div className="space-y-3">
              {getPostsForDate(selectedDate).map((post) => (
                <div key={post.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-1">
                          {post.platforms.map((platformId) => {
                            const platformData = platforms[platformId];
                            const Icon = platformData?.icon;
                            return Icon ? (
                              <div
                                key={platformId}
                                className={`w-6 h-6 ${platformData.color} rounded flex items-center justify-center`}
                              >
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                            ) : null;
                          })}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(post.scheduledAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {getStatusIcon(post.status)}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{post.caption}</p>
                      
                      {post.video && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Video: {post.video.title}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialMediaCalendar;