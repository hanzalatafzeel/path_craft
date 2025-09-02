import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Target, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  Calendar,
  Award
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentGoals, setRecentGoals] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, goalsResponse, tasksResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/dashboard`),
        axios.get(`${BACKEND_URL}/api/goals`),
        axios.get(`${BACKEND_URL}/api/tasks/today`)
      ]);

      setStats(statsResponse.data);
      setRecentGoals(goalsResponse.data.slice(0, 5)); // Show latest 5 goals
      setTodayTasks(tasksResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const getTaskStatusBadge = (status) => {
    const variants = {
      pending: 'outline',
      in_progress: 'warning',
      completed: 'success',
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your progress overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Goals</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_goals || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active_goals || 0}</p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.completed_tasks || 0}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.completion_rate || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Goals and Today's Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Recent Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentGoals.length > 0 ? (
              <div className="space-y-4">
                {recentGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{goal.goal_name}</h4>
                      <p className="text-sm text-gray-600">{goal.weeks} weeks • {goal.description?.substring(0, 50)}...</p>
                    </div>
                    <Badge variant={getStatusBadge(goal.status)}>
                      {goal.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No goals yet. Create your first goal to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length > 0 ? (
              <div className="space-y-4">
                {todayTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600">Week {task.week_number}</p>
                    </div>
                    <Badge variant={getTaskStatusBadge(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No tasks scheduled for today. Enjoy your day!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats?.total_tasks || 0}</div>
              <div className="text-sm text-gray-600">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{stats?.pending_tasks || 0}</div>
              <div className="text-sm text-gray-600">Pending Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{stats?.completed_tasks || 0}</div>
              <div className="text-sm text-gray-600">Completed Tasks</div>
            </div>
          </div>
          
          {stats?.total_tasks > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{stats.completion_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.completion_rate}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      
    </div>
  );
};

export default Dashboard;