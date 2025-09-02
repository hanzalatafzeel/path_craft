import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Clock,
  Target
} from 'lucide-react';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const goalsResponse = await axios.get(`${BACKEND_URL}/api/goals`);
      const goalsData = goalsResponse.data;
      setGoals(goalsData);

      // Fetch tasks for each goal
      const tasksData = {};
      for (const goal of goalsData) {
        const tasksResponse = await axios.get(`${BACKEND_URL}/api/goals/${goal.id}/tasks`);
        tasksData[goal.id] = tasksResponse.data;
      }
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCalendar = async (goalId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/calendar/${goalId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `goal_${goalId}_calendar.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading calendar:', error);
      alert('Failed to download calendar. Please try again.');
    }
  };

  // Calendar utility functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const isSameDate = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getTasksForDate = (date) => {
    const allTasks = [];
    Object.values(tasks).flat().forEach(task => {
      const taskDate = new Date(task.scheduled_date);
      if (isSameDate(taskDate, date)) {
        allTasks.push(task);
      }
    });
    return allTasks;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const calendarDays = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600 mt-2">View and manage your scheduled tasks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  {formatDate(currentDate)}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={index} className="h-20"></div>;
                  }
                  
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dayTasks = getTasksForDate(date);
                  const isToday = isSameDate(date, new Date());
                  const isSelected = selectedDate && isSameDate(date, selectedDate);
                  
                  return (
                    <div
                      key={day}
                      className={`h-20 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
                        isToday ? 'bg-blue-50 border-blue-200' : ''
                      } ${isSelected ? 'bg-blue-100 border-blue-300' : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map((task, taskIndex) => (
                          <div
                            key={taskIndex}
                            className={`text-xs px-1 py-0.5 rounded truncate ${getStatusColor(task.status)}`}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Selected Date Tasks */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const dayTasks = getTasksForDate(selectedDate);
                  return dayTasks.length > 0 ? (
                    <div className="space-y-3">
                      {dayTasks.map((task) => (
                        <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">Week {task.week_number}</p>
                          <Badge variant={task.status === 'completed' ? 'success' : 'outline'} className="mt-2">
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No tasks scheduled for this day</p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Export Calendars */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Calendars</CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length > 0 ? (
                <div className="space-y-3">
                  {goals.map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{goal.goal_name}</h4>
                        <p className="text-sm text-gray-600">{goal.weeks} weeks</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCalendar(goal.id)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        .ics
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No goals to export</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-100 rounded"></div>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 rounded"></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 rounded"></div>
                  <span className="text-sm text-gray-600">Cancelled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;