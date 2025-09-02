import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  Target, 
  Calendar, 
  Edit, 
  Trash2, 
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [formData, setFormData] = useState({
    goal_name: '',
    description: '',
    weeks: 4
  });
  const [formLoading, setFormLoading] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/goals`);
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await axios.post(`${BACKEND_URL}/api/goals`, formData);
      setFormData({ goal_name: '', description: '', weeks: 4 });
      setShowCreateForm(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal? This will also delete all associated tasks.')) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/goals/${goalId}`);
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const viewGoalDetails = async (goalId) => {
    try {
      const [goalResponse, tasksResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/goals/${goalId}`),
        axios.get(`${BACKEND_URL}/api/goals/${goalId}/tasks`)
      ]);

      setSelectedGoal({
        ...goalResponse.data,
        tasks: tasksResponse.data
      });
    } catch (error) {
      console.error('Error fetching goal details:', error);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
          <p className="text-gray-600 mt-2">Manage your learning goals and track progress</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Create Goal Form */}
      {showCreateForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Create New Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Name *
                </label>
                <Input
                  value={formData.goal_name}
                  onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                  placeholder="e.g., Learn React Development"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what you want to achieve..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (weeks) *
                </label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={formData.weeks}
                  onChange={(e) => setFormData({ ...formData, weeks: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="flex space-x-3">
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Goal'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <Card key={goal.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
                  <Badge variant={getStatusBadge(goal.status)}>
                    {goal.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {goal.description || 'No description provided'}
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {goal.weeks} weeks
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Created {formatDate(goal.created_at)}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => viewGoalDetails(goal.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {/* Edit functionality */}}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-16">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first goal to start your learning journey with AI-powered task breakdown
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Goal Details Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedGoal.goal_name}</h2>
                <button
                  onClick={() => setSelectedGoal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{selectedGoal.description || 'No description provided'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Duration</h3>
                    <p className="text-gray-600">{selectedGoal.weeks} weeks</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Status</h3>
                    <Badge variant={getStatusBadge(selectedGoal.status)}>
                      {selectedGoal.status}
                    </Badge>
                  </div>
                </div>

                {selectedGoal.tasks && selectedGoal.tasks.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Tasks ({selectedGoal.tasks.length})</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedGoal.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                            <p className="text-sm text-gray-600">Week {task.week_number}</p>
                          </div>
                          <Badge variant={task.status === 'completed' ? 'success' : 'outline'}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;