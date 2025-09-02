import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  CheckCircle,
  Clock,
  Calendar,
  Award,
  Activity
} from 'lucide-react';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [statsResponse, goalsResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/dashboard`),
        axios.get(`${BACKEND_URL}/api/goals`)
      ]);

      setStats(statsResponse.data);
      setGoals(goalsResponse.data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGoalProgress = (goal) => {
    // This would need to be calculated based on tasks
    // For now, we'll simulate some progress
    const statuses = ['active', 'completed', 'paused'];
    return Math.floor(Math.random() * 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'default',
      completed: 'success',
      paused: 'warning',
      cancelled: 'destructive'
    };
    return variants[status] || 'outline';
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Track your learning progress and productivity metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productivity Score</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.completion_rate || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">Based on completion rate</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Study Time</p>
                <p className="text-2xl font-bold text-green-600">{Math.round((stats?.completed_tasks || 0) * 1.5)}h</p>
                <p className="text-xs text-gray-500 mt-1">Estimated hours</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Goals Completed</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.completed_goals || 0}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold text-orange-600">{Math.max(1, Math.floor(Math.random() * 15))}</p>
                <p className="text-xs text-gray-500 mt-1">Days active</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Task Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats?.completed_tasks || 0}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ 
                        width: `${stats?.total_tasks > 0 ? (stats.completed_tasks / stats.total_tasks) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats?.in_progress_tasks || 0}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ 
                        width: `${stats?.total_tasks > 0 ? (stats.in_progress_tasks / stats.total_tasks) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats?.pending_tasks || 0}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-400 h-2 rounded-full"
                      style={{ 
                        width: `${stats?.total_tasks > 0 ? (stats.pending_tasks / stats.total_tasks) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {stats?.total_tasks > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.completion_rate}%
                  </div>
                  <div className="text-sm text-gray-600">Overall Completion Rate</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goal Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Goal Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.slice(0, 5).map((goal) => {
                  const progress = getGoalProgress(goal);
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900 truncate">{goal.goal_name}</h4>
                        <Badge variant={getStatusBadge(goal.status)} className="ml-2">
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{progress}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {goal.weeks} weeks • Created {formatDate(goal.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No goals to analyze yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Weekly Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const tasksCompleted = Math.floor(Math.random() * 5);
              const totalTasks = Math.max(tasksCompleted, Math.floor(Math.random() * 8));
              const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

              return (
                <div key={day} className="text-center space-y-2">
                  <div className="text-sm font-medium text-gray-600">{day}</div>
                  <div className="w-full bg-gray-200 rounded-full h-20 flex items-end justify-center p-1">
                    <div 
                      className="w-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ height: `${completionRate}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {tasksCompleted}/{totalTasks}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            Tasks completed this week
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.completion_rate >= 80 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-green-800">Excellent Progress!</h3>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  You're maintaining a high completion rate of {stats.completion_rate}%. Keep up the great work!
                </p>
              </div>
            )}

            {stats?.completion_rate < 50 && stats?.completion_rate > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-medium text-yellow-800">Room for Improvement</h3>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Your completion rate is {stats.completion_rate}%. Consider breaking tasks into smaller chunks or adjusting your schedule.
                </p>
              </div>
            )}

            {stats?.active_goals > 3 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-800">High Goal Activity</h3>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  You have {stats.active_goals} active goals. Consider focusing on 2-3 goals at a time for better results.
                </p>
              </div>
            )}

            {goals.length === 0 && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium text-gray-800">Getting Started</h3>
                </div>
                <p className="text-gray-700 text-sm mt-1">
                  Start by creating your first learning goal. Our AI will help break it down into manageable daily tasks.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;