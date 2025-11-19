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
    <div className="rounded-2xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 ring-2 ring-white/30 shadow-[0_10px_25px_rgba(255,255,255,0.10),0_2px_6px_rgba(255,255,255,0.06)] max-w-4xl mx-auto text-white">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Social Media Calendar</h2>
              <p className="text-xs text-white/70">Manage your scheduled posts</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-base font-medium text-white min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-white/80">
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
                  className={`min-h-[72px] p-2 border border-white/20 ${
                    day ? 'cursor-pointer hover:bg-white/15' : ''
                  } ${isToday ? 'bg-blue-600/10 border-blue-300/40' : ''} ${
                    isSelected ? 'bg-white/15 border-white/40 shadow-[0_6px_16px_rgba(255,255,255,0.12)]' : ''
                  }`}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <div className="flex items-center mb-1">
                        <div
                          className={`w-7 h-7 rounded-md border -ml-1 flex items-center justify-center text-base font-semibold ${
                            isToday ? 'bg-blue-600/20 border-blue-300/50 text-blue-200' : 'bg-white/10 border-white/30 text-white'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {posts.slice(0, 3).map((post, postIndex) => {
                          const platformData = platforms[post.platforms[0]];
                          const Icon = platformData?.icon;
                          
                          return (
                            <div
                              key={postIndex}
                              className="flex items-center space-x-1 text-[10px] bg-white/10 rounded px-1 py-0.5 border border-white/30 text-white/90"
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
                          <div className="text-xs text-white/60 text-center">
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
        <div className="border-t border-white/10 p-4">
          <h3 className="text-base font-medium text-white mb-3">
            Posts for {selectedDate.toLocaleDateString()}
          </h3>
          
          {getPostsForDate(selectedDate).length === 0 ? (
            <p className="text-white/60 text-center py-8">No posts scheduled for this date</p>
          ) : (
            <div className="space-y-3">
              {getPostsForDate(selectedDate).map((post) => (
                <div key={post.id} className="bg-white/7 border border-white/15 rounded-lg p-4 shadow-[0_6px_18px_rgba(255,255,255,0.10)]">
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
                        <span className="text-sm font-medium text-white">
                          {new Date(post.scheduledAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {getStatusIcon(post.status)}
                      </div>
                      
                      <p className="text-sm text-white/80 mb-2">{post.caption}</p>
                      
                      {post.video && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Video: {post.video.title}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
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