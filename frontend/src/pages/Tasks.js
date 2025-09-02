import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  CheckSquare, 
  Clock, 
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  XCircle
} from 'lucide-react';

const Tasks = () => {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState({});
  const [subtasks, setSubtasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [loadingStates, setLoadingStates] = useState({});

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchTasksData();
  }, []);

  const fetchTasksData = async () => {
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
      console.error('Error fetching tasks data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubtasks = async (taskId) => {
    if (subtasks[taskId]) return; // Already loaded

    try {
      const response = await axios.get(`${BACKEND_URL}/api/tasks/${taskId}/subtasks`);
      setSubtasks(prev => ({
        ...prev,
        [taskId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching subtasks:', error);
    }
  };

  const toggleTaskExpansion = async (taskId) => {
    const newExpanded = new Set(expandedTasks);
    
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
      await fetchSubtasks(taskId);
    }
    
    setExpandedTasks(newExpanded);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    setLoadingStates(prev => ({ ...prev, [`task_${taskId}`]: true }));
    
    try {
      await axios.put(`${BACKEND_URL}/api/tasks/${taskId}`, {
        status: newStatus
      });
      
      // Refresh tasks data
      fetchTasksData();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`task_${taskId}`]: false }));
    }
  };

  const updateSubtaskStatus = async (subtaskId, newStatus) => {
    setLoadingStates(prev => ({ ...prev, [`subtask_${subtaskId}`]: true }));
    
    try {
      await axios.put(`${BACKEND_URL}/api/subtasks/${subtaskId}`, {
        status: newStatus
      });
      
      // Refresh subtasks for the parent task
      const parentTaskId = Object.keys(subtasks).find(taskId => 
        subtasks[taskId]?.some(st => st.id === subtaskId)
      );
      
      if (parentTaskId) {
        const response = await axios.get(`${BACKEND_URL}/api/tasks/${parentTaskId}/subtasks`);
        setSubtasks(prev => ({
          ...prev,
          [parentTaskId]: response.data
        }));
      }
    } catch (error) {
      console.error('Error updating subtask status:', error);
      alert('Failed to update subtask status. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`subtask_${subtaskId}`]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'outline',
      in_progress: 'warning',
      completed: 'success',
      cancelled: 'destructive'
    };
    return variants[status] || 'outline';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusActions = (currentStatus, onUpdate, isLoading) => {
    const actions = [];
    
    if (currentStatus !== 'completed') {
      actions.push(
        <Button
          key="complete"
          size="sm"
          variant="outline"
          onClick={() => onUpdate('completed')}
          disabled={isLoading}
          className="text-green-600 hover:text-green-700"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Button>
      );
    }
    
    if (currentStatus === 'pending') {
      actions.push(
        <Button
          key="start"
          size="sm"
          variant="outline"
          onClick={() => onUpdate('in_progress')}
          disabled={isLoading}
          className="text-yellow-600 hover:text-yellow-700"
        >
          <PlayCircle className="h-3 w-3 mr-1" />
          Start
        </Button>
      );
    }
    
    if (currentStatus === 'in_progress') {
      actions.push(
        <Button
          key="pause"
          size="sm"
          variant="outline"
          onClick={() => onUpdate('pending')}
          disabled={isLoading}
          className="text-gray-600 hover:text-gray-700"
        >
          <Clock className="h-3 w-3 mr-1" />
          Pause
        </Button>
      );
    }
    
    return actions;
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
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-600 mt-2">Track and manage all your learning tasks</p>
      </div>

      {goals.length > 0 ? (
        <div className="space-y-6">
          {goals.map((goal) => {
            const goalTasks = tasks[goal.id] || [];
            const totalTasks = goalTasks.length;
            const completedTasks = goalTasks.filter(t => t.status === 'completed').length;
            const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{goal.goal_name}</CardTitle>
                      <p className="text-gray-600 mt-1">{goal.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">
                        {completedTasks}/{totalTasks} tasks completed
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        {progressPercentage}%
                      </div>
                    </div>
                  </div>
                  {totalTasks > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {goalTasks.length > 0 ? (
                    <div className="space-y-3">
                      {goalTasks
                        .sort((a, b) => a.week_number - b.week_number)
                        .map((task) => (
                          <div key={task.id} className="border border-gray-200 rounded-lg">
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <button
                                    onClick={() => toggleTaskExpansion(task.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {expandedTasks.has(task.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                  
                                  {getStatusIcon(task.status)}
                                  
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                      <span>Week {task.week_number}</span>
                                      <span className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {formatDate(task.scheduled_date)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-3">
                                  <Badge variant={getStatusBadge(task.status)}>
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                  
                                  <div className="flex space-x-2">
                                    {getStatusActions(
                                      task.status, 
                                      (newStatus) => updateTaskStatus(task.id, newStatus),
                                      loadingStates[`task_${task.id}`]
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Subtasks */}
                            {expandedTasks.has(task.id) && subtasks[task.id] && (
                              <div className="border-t border-gray-200 bg-gray-50 p-4">
                                <h5 className="font-medium text-gray-700 mb-3">Daily Tasks</h5>
                                <div className="space-y-2">
                                  {subtasks[task.id].map((subtask) => (
                                    <div key={subtask.id} className="flex items-center justify-between p-3 bg-white rounded border">
                                      <div className="flex items-center space-x-3">
                                        {getStatusIcon(subtask.status)}
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">
                                            {subtask.description}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {formatDate(subtask.scheduled_date)}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center space-x-2">
                                        <Badge variant={getStatusBadge(subtask.status)} className="text-xs">
                                          {subtask.status.replace('_', ' ')}
                                        </Badge>
                                        
                                        <div className="flex space-x-1">
                                          {getStatusActions(
                                            subtask.status, 
                                            (newStatus) => updateSubtaskStatus(subtask.id, newStatus),
                                            loadingStates[`subtask_${subtask.id}`]
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No tasks generated yet. Tasks will appear here after goal creation.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-16">
            <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-6">
              Create goals first to automatically generate AI-powered task breakdowns
            </p>
            <Button onClick={() => window.location.href = '/goals'}>
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tasks;