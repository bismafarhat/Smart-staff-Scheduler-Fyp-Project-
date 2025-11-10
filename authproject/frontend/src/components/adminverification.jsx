import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './adminverification.css';

const AdminVerificationPage = () => {
  const [completedTasks, setCompletedTasks] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedVerifiers, setSelectedVerifiers] = useState([]);
  
  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5000'; // Updated to match AdminTaskManagement

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      alert('Admin access required');
      navigate('/admin/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('adminToken');
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch all tasks and filter completed ones needing verification
      const tasksResponse = await fetch(`${API_BASE}/api/tasks/admin/all`, {
        headers
      });
      
      // Fetch available staff
      const usersResponse = await fetch(`${API_BASE}/api/admin/all-staff`, {
        headers
      });
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        if (tasksData.success) {
          // Filter tasks that are completed but don't have verification assigned
          const needsVerification = (tasksData.tasks || []).filter(task => 
            task.status === 'completed' && 
            (!task.verificationStatus || task.verificationStatus === 'none')
          );
          setCompletedTasks(needsVerification);
          console.log('Tasks needing verification:', needsVerification);
        } else {
          setError('Failed to fetch tasks: ' + tasksData.message);
        }
      } else {
        setError('Failed to fetch tasks: HTTP ' + tasksResponse.status);
      }
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        if (usersData.success) {
          setAvailableUsers(usersData.staff || []);
        } else {
          setError('Failed to fetch users: ' + usersData.message);
        }
      } else {
        setError('Failed to fetch users: HTTP ' + usersResponse.status);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const assignVerifiers = async () => {
    if (selectedVerifiers.length !== 1) {
      alert('Please select exactly 1 verifier');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      // Get selected user details for display
      const selectedUsers = availableUsers.filter(user => 
        selectedVerifiers.includes(user.userId || user._id)
      );

      // Create verification assignment using the UPDATED endpoint
      const response = await fetch(`${API_BASE}/api/tasks/assign-verifier/${selectedTask._id || selectedTask.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verifierId: selectedVerifiers[0] // Send single verifier ID instead of array
        })
      });

      const data = await response.json();
      
      console.log('API Response:', data); // Debug log
      
      if (response.ok && data.success) {
        alert(`✅ Verifier assigned successfully!
        
Task: ${selectedTask.title}
Location: ${selectedTask.location}
Verifier: ${selectedUsers.map(u => u.name || u.username).join(', ')}

The selected verifier will physically visit the location to verify the completed work.`);
        
        setShowAssignModal(false);
        setSelectedTask(null);
        setSelectedVerifiers([]);
        fetchData(); // Refresh data
      } else {
        console.error('API Error:', data); // Debug log
        alert(`Failed to assign verifier: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error assigning verifier:', error);
      alert(`Failed to assign verifier: ${error.message}`);
    }
  };

  // Helper function to format user display
  const formatUserDisplay = (user) => {
    if (!user) return 'Unknown User';
    const name = user.name || user.username || 'Unknown User';
    const department = user.department || 'No Department';
    const jobTitle = user.jobTitle || '';
    const shift = user.shift || '';
    
    let displayText = `${name} - ${department}`;
    if (jobTitle) displayText += ` (${jobTitle})`;
    if (shift) displayText += ` | ${shift} Shift`;
    
    return displayText;
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'admin-verification-priority-urgent';
      case 'high':
        return 'admin-verification-priority-high';
      case 'medium':
        return 'admin-verification-priority-medium';
      case 'low':
        return 'admin-verification-priority-low';
      default:
        return 'admin-verification-priority-medium';
    }
  };

  if (loading) {
    return (
      <div className="admin-verification-loading">
        <div className="admin-verification-loading-text">Loading verification assignments...</div>
      </div>
    );
  }

  return (
    <div className="admin-verification-container">
      {/* Header */}
      <div className="admin-verification-header">
        <h1 className="admin-verification-title">🔍 Task Verification Assignment</h1>
        <div className="admin-verification-header-buttons">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="admin-verification-btn admin-verification-btn-secondary"
          >
            ← Back to Tasks
          </button>
          <button
            onClick={fetchData}
            className="admin-verification-btn admin-verification-btn-success"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="admin-verification-error">
          <span>⚠️</span>
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="admin-verification-debug">
        <strong>Debug Info:</strong><br/>
        Tasks needing verification: {completedTasks.length}<br/>
        Available staff: {availableUsers.length}<br/>
        {completedTasks.length > 0 && (
          <>
            Sample task: {completedTasks[0].title} (Status: {completedTasks[0].status}, VerificationStatus: {completedTasks[0].verificationStatus || 'none'})
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="admin-verification-instructions">
        <h3 className="admin-verification-instructions-title">📋 How Verification Works:</h3>
        <ol>
          <li>Select a completed task that needs verification</li>
          <li>Choose 1 staff member to verify the work</li>
          <li>The selected verifier will physically visit the location</li>
          <li>They will inspect the completed work and provide quality scores</li>
          <li>You'll receive the verification report with scores and feedback</li>
        </ol>
      </div>

      {/* Tasks Needing Verification */}
      <div className="admin-verification-card">
        <div className="admin-verification-card-header">
          ✅ Completed Tasks Needing Verification ({completedTasks.length})
        </div>
        
        {completedTasks.length === 0 ? (
          <div className="admin-verification-empty-state">
            <span className="admin-verification-empty-icon">🎉</span>
            <div className="admin-verification-empty-title">All completed tasks have been verified!</div>
            <div className="admin-verification-empty-subtitle">No verification assignments needed at this time.</div>
          </div>
        ) : (
          <div className="admin-verification-table-container">
            <table className="admin-verification-table">
              <thead>
                <tr>
                  <th>Task Details</th>
                  <th>Staff</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Completed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task) => (
                  <tr key={task._id || task.id}>
                    <td>
                      <div className="admin-verification-task-title">{task.title}</div>
                      <div className="admin-verification-task-category">{task.category}</div>
                      {task.description && (
                        <div className="admin-verification-task-description">
                          {task.description.slice(0, 100)}{task.description.length > 100 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="admin-verification-staff-name">
                        {task.assignedTo?.username || task.assignedTo?.name || 'Unknown'}
                      </div>
                      <div className="admin-verification-staff-department">
                        {task.assignedTo?.department || 'N/A'}
                      </div>
                      {task.assignedTo?.jobTitle && (
                        <div className="admin-verification-staff-title">
                          {task.assignedTo.jobTitle}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="admin-verification-location">{task.location || 'Not specified'}</div>
                    </td>
                    <td>
                      <span className={`admin-verification-priority-badge ${getPriorityClass(task.priority)}`}>
                        {task.priority || 'medium'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-verification-completed-date">
                        {task.completedAt ? new Date(task.completedAt).toLocaleString() : 
                         task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'Unknown'}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowAssignModal(true);
                          setSelectedVerifiers([]);
                        }}
                        className="admin-verification-btn admin-verification-btn-primary"
                      >
                        👤 Assign 1 Verifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Verifiers Modal */}
      {showAssignModal && selectedTask && (
        <div className="admin-verification-modal-overlay">
          <div className="admin-verification-modal">
            <h3 className="admin-verification-modal-title">
              👤 Assign 1 Verifier for Quality Check
            </h3>
            
            {/* Task Info */}
            <div className="admin-verification-task-info">
              <div className="admin-verification-task-info-item">
                <span className="admin-verification-task-info-label">Task:</span>
                {selectedTask.title}
              </div>
              <div className="admin-verification-task-info-item">
                <span className="admin-verification-task-info-label">📍 Location:</span>
                {selectedTask.location || 'Not specified'}
              </div>
              <div className="admin-verification-task-info-item">
                <span className="admin-verification-task-info-label">👤 Completed by:</span>
                {selectedTask.assignedTo?.username || selectedTask.assignedTo?.name || 'Unknown'}
              </div>
              <div className="admin-verification-task-info-item">
                <span className="admin-verification-task-info-label">🏷️ Category:</span>
                {selectedTask.category || 'Not specified'}
              </div>
            </div>
            
            <div>
              <label className="admin-verification-user-selection-label">
                Select 1 staff member to verify this work:
              </label>
              <div className="admin-verification-user-list">
                {availableUsers.map(user => {
                  const userId = user.userId || user._id;
                  const isSelected = selectedVerifiers.includes(userId);
                  const isCurrentAssignee = userId === (selectedTask.assignedTo?._id || selectedTask.assignedTo?.id);
                  
                  return (
                    <div 
                      key={userId} 
                      className={`admin-verification-user-item ${
                        isSelected ? 'admin-verification-user-item-selected' : ''
                      } ${isCurrentAssignee ? 'admin-verification-user-item-disabled' : ''}`}
                      onClick={() => {
                        if (isCurrentAssignee) return; // Don't allow selecting task assignee as verifier
                        
                        if (isSelected) {
                          setSelectedVerifiers(selectedVerifiers.filter(id => id !== userId));
                        } else if (selectedVerifiers.length < 1) {
                          setSelectedVerifiers([...selectedVerifiers, userId]);
                        } else {
                          // Replace existing selection with new one
                          setSelectedVerifiers([userId]);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isCurrentAssignee}
                        onChange={() => {}} // Handled by onClick above
                        className="admin-verification-user-checkbox"
                      />
                      <div className="admin-verification-user-info">
                        <div className="admin-verification-user-name">
                          {user.name || user.username || 'Unknown'}
                          {isCurrentAssignee && (
                            <span className="admin-verification-user-assignee-badge">
                              Task Assignee
                            </span>
                          )}
                        </div>
                        <div className="admin-verification-user-department">
                          {user.department || 'No Department'} {user.jobTitle && `- ${user.jobTitle}`}
                        </div>
                        {user.shift && (
                          <div className="admin-verification-user-shift">
                            Shift: {user.shift} {user.workingHours?.start && user.workingHours?.end && 
                            `(${user.workingHours.start} - ${user.workingHours.end})`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={`admin-verification-selection-status ${
                selectedVerifiers.length === 1 ? 'admin-verification-selection-valid' : 'admin-verification-selection-invalid'
              }`}>
                Selected: {selectedVerifiers.length}/1 verifier
                {selectedVerifiers.length === 1 && ' ✓ Ready to assign!'}
                {selectedVerifiers.length === 0 && ' (Please select 1 verifier)'}
              </div>
            </div>
            
            {/* Instructions */}
            <div className="admin-verification-modal-instructions">
              <strong>📋 Verification Instructions:</strong>
              <br />
              The selected verifier will receive this task and must physically visit <strong>{selectedTask.location || 'the specified location'}</strong> to inspect and verify the completed work. They will provide quality scores and feedback.
            </div>
            
            <div className="admin-verification-modal-actions">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTask(null);
                  setSelectedVerifiers([]);
                }}
                className="admin-verification-btn admin-verification-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={assignVerifiers}
                disabled={selectedVerifiers.length !== 1}
                className={`admin-verification-btn admin-verification-btn-primary ${
                  selectedVerifiers.length !== 1 ? 'admin-verification-btn-disabled' : ''
                }`}
              >
                👤 Assign 1 Verifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="admin-verification-help">
        <h3 className="admin-verification-help-title">❓ Need Help?</h3>
        <div className="admin-verification-help-content">
          <p><strong>How to assign verifier:</strong></p>
          <ul>
            <li>Click "Assign 1 Verifier" on any completed task</li>
            <li>Select 1 staff member from your team</li>
            <li>The selected verifier will receive the verification task</li>
            <li>They will physically visit the location to verify the work quality</li>
            <li>You'll receive their verification report with scores and feedback</li>
          </ul>
          
          <p><strong>Verification Process:</strong></p>
          <ul>
            <li>🔍 Verifiers inspect the completed work on-site</li>
            <li>📊 They rate quality on cleanliness, completeness, and standards</li>
            <li>📝 They provide written feedback and note any issues</li>
            <li>✅ Final verification report is submitted to admin</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminVerificationPage;