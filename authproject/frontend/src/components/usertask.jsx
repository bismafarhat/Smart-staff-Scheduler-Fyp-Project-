import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const UserTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [verificationTasks, setVerificationTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('today');
  const [stats, setStats] = useState({});
  const [verificationStats, setVerificationStats] = useState({});
  const [verificationSummary, setVerificationSummary] = useState({});
  const [error, setError] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedVerificationTask, setSelectedVerificationTask] = useState(null);
  const [verificationForm, setVerificationForm] = useState({
    score: '',
    result: '',
    notes: ''
  });
  
  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5000'; // Updated to match your frontend

  useEffect(() => {
    loadTasks();
  }, [view]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      if (view === 'today') {
        const response = await axios.get(`${API_BASE}/api/tasks/today`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.success) {
          setTodayTasks(response.data.tasks);
          setVerificationStats(response.data.verificationStats || {});
        }
      } else if (view === 'all') {
        const response = await axios.get(`${API_BASE}/api/tasks/my-tasks?includeVerification=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.success) {
          setTasks(response.data.tasks);
          setVerificationStats(response.data.verificationStats || {});
        }
      } else if (view === 'verification') {
        // Load verification tasks assigned to me
        const response = await axios.get(`${API_BASE}/api/tasks/my-verification-tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.success) {
          setVerificationTasks(response.data.tasks);
          setVerificationSummary(response.data.summary || {});
        }
      } else if (view === 'stats') {
        // Load tasks with verification info for stats
        const response = await axios.get(`${API_BASE}/api/tasks/my-tasks?includeVerification=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.data.success) {
          const allTasks = response.data.tasks;
          const calculatedStats = {
            total: allTasks.length,
            completed: allTasks.filter(t => t.status === 'completed').length,
            pending: allTasks.filter(t => t.status === 'pending').length,
            inProgress: allTasks.filter(t => t.status === 'in-progress').length,
            reassignedToMe: allTasks.filter(t => t.isReassigned === true).length,
            originallyMine: allTasks.filter(t => !t.isReassigned || t.originalAssignee === undefined).length,
            completionRate: 0,
            averageRating: 0,
            // Verification stats
            verificationComplete: allTasks.filter(t => t.verificationStatus === 'completed').length,
            verificationPending: allTasks.filter(t => t.verificationStatus === 'pending_verification').length,
            verificationApproved: allTasks.filter(t => t.finalVerificationStatus === 'approved').length,
            verificationRejected: allTasks.filter(t => t.finalVerificationStatus === 'rejected').length,
            averageVerificationScore: 0
          };
          
          if (calculatedStats.total > 0) {
            calculatedStats.completionRate = Math.round((calculatedStats.completed / calculatedStats.total) * 100);
          }
          
          const ratedTasks = allTasks.filter(t => t.rating && t.rating > 0);
          if (ratedTasks.length > 0) {
            calculatedStats.averageRating = Math.round(
              (ratedTasks.reduce((sum, task) => sum + task.rating, 0) / ratedTasks.length) * 10
            ) / 10;
          }

          // Calculate average verification score
          const verifiedTasks = allTasks.filter(t => t.verificationScore && t.verificationScore > 0);
          if (verifiedTasks.length > 0) {
            calculatedStats.averageVerificationScore = Math.round(
              (verifiedTasks.reduce((sum, task) => sum + task.verificationScore, 0) / verifiedTasks.length) * 10
            ) / 10;
          }
          
          setStats(calculatedStats);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError(`Failed to load tasks: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status, notes = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE}/api/tasks/update-status/${taskId}`, 
        { status, completionNotes: notes }, 
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      if (response.data.success) {
        let message = 'Task status updated successfully!';
        
        // Check if verification was assigned
        if (response.data.verificationDetails && response.data.verificationDetails.assigned) {
          message += `\n\n🔍 Quality verification has been assigned to secret team ${response.data.verificationDetails.teamCode}`;
        }
        
        alert(message);
        loadTasks(); // Refresh data
      }
    } catch (error) {
      alert('Failed to update task status: ' + (error.response?.data?.message || error.message));
    }
  };

  const submitVerification = async () => {
    if (!verificationForm.score || !verificationForm.result) {
      alert('Please provide both score and result');
      return;
    }

    if (verificationForm.score < 1 || verificationForm.score > 5) {
      alert('Score must be between 1 and 5');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE}/api/tasks/submit-verification/${selectedVerificationTask.id}`,
        {
          score: parseInt(verificationForm.score),
          result: verificationForm.result,
          notes: verificationForm.notes
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`✅ Verification submitted successfully!
        
Task: ${selectedVerificationTask.title}
Score: ${verificationForm.score}/5
Result: ${verificationForm.result.toUpperCase()}

Thank you for completing the quality verification!`);
        
        setShowVerificationModal(false);
        setSelectedVerificationTask(null);
        setVerificationForm({ score: '', result: '', notes: '' });
        loadTasks(); // Refresh data
      }
    } catch (error) {
      console.error('Verification submission error:', error);
      alert('Failed to submit verification: ' + (error.response?.data?.message || error.message));
    }
  };

  const openVerificationModal = (task) => {
    setSelectedVerificationTask(task);
    setShowVerificationModal(true);
    setVerificationForm({ score: '', result: '', notes: '' });
  };

  const formatTaskTitle = (task) => {
    if (task.isReassigned && task.originalAssignee) {
      return `${task.title} (Reassigned from ${task.originalAssignee.username})`;
    }
    return task.title;
  };

  const getTaskBadges = (task) => {
    const badges = [];
    
    if (task.isReassigned) {
      badges.push(
        <span key="reassigned" style={{
          padding: '2px 8px',
          backgroundColor: '#17a2b8',
          color: 'white',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          marginLeft: '8px'
        }}>
          REASSIGNED TO YOU
        </span>
      );
    }
    
    if (task.priority === 'urgent' || task.priority === 'high') {
      badges.push(
        <span key="priority" style={{
          padding: '2px 8px',
          backgroundColor: task.priority === 'urgent' ? '#dc3545' : '#fd7e14',
          color: 'white',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          marginLeft: '8px'
        }}>
          {task.priority.toUpperCase()}
        </span>
      );
    }

    // Add verification badges
    if (task.verificationStatus === 'pending_verification') {
      badges.push(
        <span key="verification-pending" style={{
          padding: '2px 8px',
          backgroundColor: '#ffc107',
          color: 'black',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          marginLeft: '8px'
        }}>
          UNDER VERIFICATION
        </span>
      );
    }

    if (task.finalVerificationStatus === 'approved') {
      badges.push(
        <span key="verification-approved" style={{
          padding: '2px 8px',
          backgroundColor: '#28a745',
          color: 'white',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          marginLeft: '8px'
        }}>
          ✓ VERIFIED
        </span>
      );
    }

    if (task.finalVerificationStatus === 'rejected') {
      badges.push(
        <span key="verification-rejected" style={{
          padding: '2px 8px',
          backgroundColor: '#dc3545',
          color: 'white',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 'bold',
          marginLeft: '8px'
        }}>
          ✗ VERIFICATION FAILED
        </span>
      );
    }
    
    return badges;
  };

  const getVerificationInfo = (task) => {
    if (!task.verificationStatus || task.verificationStatus === 'none') {
      return null;
    }

    const verificationColors = {
      'pending_verification': { bg: '#fff3cd', text: '#856404', icon: '⏳' },
      'completed': { bg: task.finalVerificationStatus === 'approved' ? '#d4edda' : '#f8d7da', 
                    text: task.finalVerificationStatus === 'approved' ? '#155724' : '#721c24',
                    icon: task.finalVerificationStatus === 'approved' ? '✅' : '❌' }
    };

    const style = verificationColors[task.verificationStatus] || { bg: '#e9ecef', text: '#495057', icon: '❓' };

    return (
      <div style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        marginTop: '4px',
        display: 'inline-block'
      }}>
        <span style={{ marginRight: '4px' }}>{style.icon}</span>
        {task.verificationStatus === 'pending_verification' && 'Quality check in progress'}
        {task.verificationStatus === 'completed' && task.finalVerificationStatus === 'approved' && 
          `Quality approved${task.verificationScore ? ` (${task.verificationScore}/5)` : ''}`}
        {task.verificationStatus === 'completed' && task.finalVerificationStatus === 'rejected' && 
          `Quality check failed${task.verificationScore ? ` (${task.verificationScore}/5)` : ''}`}
        {task.verificationNotes && (
          <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>
            "{task.verificationNotes}"
          </div>
        )}
      </div>
    );
  };

  const getVerificationPriorityColor = (task) => {
    if (task.isOverdue) return '#dc3545';
    if (task.priority === 'urgent') return '#fd7e14';
    return '#007bff';
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading tasks...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Tasks & Quality Verification</h1>
        <button 
          onClick={() => navigate('/user/home')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Verification Stats Summary */}
      {Object.keys(verificationStats).length > 0 && (
        <div style={{
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d7ff',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>🔍 Quality Verification Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', fontSize: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#ffc107' }}>
                {verificationStats.pendingVerification || 0}
              </div>
              <div>Under Review</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#28a745' }}>
                {verificationStats.verificationApproved || 0}
              </div>
              <div>Quality Approved</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#17a2b8' }}>
                {verificationStats.verificationComplete || 0}
              </div>
              <div>Verification Complete</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#6f42c1' }}>
                {verificationStats.needsVerification || 0}
              </div>
              <div>Awaiting Assignment</div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Summary for Verifier */}
      {Object.keys(verificationSummary).length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>🔍 Your Verification Assignments</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px', fontSize: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc3545' }}>
                {verificationSummary.overdue || 0}
              </div>
              <div>Overdue</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#ffc107' }}>
                {verificationSummary.pending || 0}
              </div>
              <div>Pending</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#28a745' }}>
                {verificationSummary.completed || 0}
              </div>
              <div>Completed</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setView('today')}
          style={{
            padding: '10px 16px',
            backgroundColor: view === 'today' ? '#007bff' : '#f8f9fa',
            color: view === 'today' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Today's Tasks
        </button>
        <button 
          onClick={() => setView('all')}
          style={{
            padding: '10px 16px',
            backgroundColor: view === 'all' ? '#007bff' : '#f8f9fa',
            color: view === 'all' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          All My Tasks
        </button>
        <button 
          onClick={() => setView('verification')}
          style={{
            padding: '10px 16px',
            backgroundColor: view === 'verification' ? '#6f42c1' : '#f8f9fa',
            color: view === 'verification' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          🔍 Verification Tasks
          {verificationSummary.pending > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '10px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {verificationSummary.pending}
            </span>
          )}
        </button>
        <button 
          onClick={() => setView('stats')}
          style={{
            padding: '10px 16px',
            backgroundColor: view === 'stats' ? '#007bff' : '#f8f9fa',
            color: view === 'stats' ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          My Statistics
        </button>
      </div>

      {/* Verification Tasks View */}
      {view === 'verification' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#6f42c1',
            color: 'white',
            padding: '15px 20px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            🔍 Tasks Assigned for Verification ({verificationTasks.length})
            {verificationSummary.overdue > 0 && (
              <span style={{ fontSize: '14px', marginLeft: '10px', color: '#ffeb3b' }}>
                • {verificationSummary.overdue} OVERDUE
              </span>
            )}
          </div>
          
          {verificationTasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <div style={{ fontSize: '18px' }}>No verification tasks assigned</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>You will be notified when tasks need verification</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Task Details</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Original Staff</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Location</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Priority</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Assigned</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationTasks.map((task, index) => (
                    <tr 
                      key={task.id} 
                      style={{ 
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        borderLeft: task.isOverdue ? '4px solid #dc3545' : 'none'
                      }}
                    >
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{task.title}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>{task.category}</div>
                        {task.description && (
                          <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                            {task.description}
                          </div>
                        )}
                        {task.isOverdue && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#dc3545', 
                            fontWeight: 'bold',
                            marginTop: '4px'
                          }}>
                            ⚠️ OVERDUE (24+ hours)
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ fontWeight: '600' }}>
                          {task.assignedTo?.name || task.assignedTo?.username || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          Completed: {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Unknown'}
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ fontWeight: '600' }}>{task.location}</div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: getVerificationPriorityColor(task),
                          color: 'white'
                        }}>
                          {task.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ fontSize: '12px' }}>
                          {task.verificationAssignedAt 
                            ? new Date(task.verificationAssignedAt).toLocaleString()
                            : 'Unknown'}
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {task.verificationStatus === 'pending_verification' ? (
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: '#ffc107',
                            color: 'black',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Pending Review
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Completed ({task.verificationScore}/5)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {task.verificationStatus === 'pending_verification' ? (
                          <button
                            onClick={() => openVerificationModal(task)}
                            style={{
                              backgroundColor: '#6f42c1',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '14px'
                            }}
                          >
                            🔍 Verify Task
                          </button>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#28a745' }}>
                            ✅ Verification Complete
                            {task.verificationNotes && (
                              <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                                Notes: {task.verificationNotes}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedVerificationTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, color: '#6f42c1', marginBottom: '20px' }}>
              🔍 Verify Task Quality
            </h3>
            
            {/* Task Info */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                Task: {selectedVerificationTask.title}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                📍 Location: {selectedVerificationTask.location}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                👤 Completed by: {selectedVerificationTask.assignedTo?.name || selectedVerificationTask.assignedTo?.username}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>
                🏷️ Category: {selectedVerificationTask.category}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                ✅ Completed: {selectedVerificationTask.completedAt 
                  ? new Date(selectedVerificationTask.completedAt).toLocaleString()
                  : 'Unknown'}
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              backgroundColor: '#e7f3ff',
              border: '1px solid #b3d7ff',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              <strong>🔍 Verification Instructions:</strong>
              <br />Please physically visit <strong>{selectedVerificationTask.location}</strong> to inspect the completed work.
              Rate the overall quality and provide feedback based on your observations.
            </div>

            {/* Verification Form */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                  Quality Score (1-5): *
                </label>
                <select
                  value={verificationForm.score}
                  onChange={(e) => setVerificationForm({...verificationForm, score: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Score</option>
                  <option value="5">5 - Excellent (Perfect work, exceeds expectations)</option>
                  <option value="4">4 - Good (High quality, minor improvements possible)</option>
                  <option value="3">3 - Satisfactory (Meets requirements)</option>
                  <option value="2">2 - Needs Improvement (Below standard)</option>
                  <option value="1">1 - Poor (Significant issues, needs rework)</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                  Verification Result: *
                </label>
                <select
                  value={verificationForm.result}
                  onChange={(e) => setVerificationForm({...verificationForm, result: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Result</option>
                  <option value="pass">✅ PASS - Work meets or exceeds standards</option>
                  <option value="fail">❌ FAIL - Work does not meet standards</option>
                  <option value="recheck">🔄 RECHECK - Needs another verification</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                  Notes & Feedback:
                </label>
                <textarea
                  value={verificationForm.notes}
                  onChange={(e) => setVerificationForm({...verificationForm, notes: e.target.value})}
                  placeholder="Provide specific feedback about the work quality, any issues found, or recommendations..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Quality Guidelines */}
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '12px'
            }}>
              <strong>Quality Assessment Guidelines:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li><strong>Cleanliness:</strong> Is the area properly cleaned/organized?</li>
                <li><strong>Completeness:</strong> Was all required work completed?</li>
                <li><strong>Standards:</strong> Does it meet company quality standards?</li>
                <li><strong>Safety:</strong> Are safety protocols followed?</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setSelectedVerificationTask(null);
                  setVerificationForm({ score: '', result: '', notes: '' });
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitVerification}
                disabled={!verificationForm.score || !verificationForm.result}
                style={{
                  padding: '12px 24px',
                  backgroundColor: (verificationForm.score && verificationForm.result) ? '#6f42c1' : '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (verificationForm.score && verificationForm.result) ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                🔍 Submit Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Tasks View - keeping existing implementation */}
      {view === 'today' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '15px 20px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            Today's Tasks ({todayTasks.length})
            {todayTasks.filter(t => t.isReassigned).length > 0 && (
              <span style={{ fontSize: '14px', marginLeft: '10px' }}>
                • {todayTasks.filter(t => t.isReassigned).length} reassigned to you
              </span>
            )}
          </div>
          
          {todayTasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '18px' }}>No tasks for today</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>Enjoy your day!</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Title</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Priority</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Location</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Quality Check</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTasks.map((task, index) => (
                    <tr key={task._id} style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                      borderLeft: task.isReassigned ? '4px solid #17a2b8' : 'none'
                    }}>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div>
                          {formatTaskTitle(task)}
                          {getTaskBadges(task)}
                          {task.description && (
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                              {task.description}
                            </div>
                          )}
                          {task.isReassigned && task.reassignmentReason && (
                            <div style={{ fontSize: '11px', color: '#17a2b8', marginTop: '2px' }}>
                              Reason: {task.reassignmentReason.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: 
                            task.priority === 'urgent' ? '#dc3545' :
                            task.priority === 'high' ? '#fd7e14' :
                            task.priority === 'medium' ? '#ffc107' : '#28a745',
                          color: task.priority === 'medium' ? 'black' : 'white'
                        }}>
                          {task.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{task.category}</td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{task.location}</td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: 
                            task.status === 'completed' ? '#28a745' :
                            task.status === 'in-progress' ? '#17a2b8' :
                            task.status === 'cancelled' ? '#dc3545' : '#ffc107',
                          color: 'white'
                        }}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {getVerificationInfo(task) || (
                          <span style={{ color: '#6c757d', fontSize: '12px' }}>
                            {task.status === 'completed' ? 'Will be verified' : 'Complete task first'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {task.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateTaskStatus(task._id, 'in-progress')}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#17a2b8',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Start Task
                              </button>
                              <button 
                                onClick={() => {
                                  const notes = prompt('Completion notes (optional):');
                                  if (notes !== null) {
                                    updateTaskStatus(task._id, 'completed', notes || '');
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Mark Complete
                              </button>
                            </>
                          )}
                          {task.status === 'in-progress' && (
                            <button 
                              onClick={() => {
                                const notes = prompt('Completion notes (optional):');
                                if (notes !== null) {
                                  updateTaskStatus(task._id, 'completed', notes || '');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Complete Task
                            </button>
                          )}
                          {task.status === 'completed' && (
                            <span style={{
                              padding: '6px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              Completed ✓
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All Tasks View - keeping existing implementation */}
      {view === 'all' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '15px 20px',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            All My Tasks ({tasks.length})
            {tasks.filter(t => t.isReassigned).length > 0 && (
              <span style={{ fontSize: '14px', marginLeft: '10px' }}>
                • {tasks.filter(t => t.isReassigned).length} reassigned to you
              </span>
            )}
          </div>
          
          {tasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <div style={{ fontSize: '18px' }}>No tasks assigned</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Title</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Priority</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Rating</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Quality Check</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => (
                    <tr key={task._id} style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                      borderLeft: task.isReassigned ? '4px solid #17a2b8' : 'none'
                    }}>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {new Date(task.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div>
                          {formatTaskTitle(task)}
                          {getTaskBadges(task)}
                          {task.isReassigned && task.reassignmentReason && (
                            <div style={{ fontSize: '11px', color: '#17a2b8', marginTop: '2px' }}>
                              Reason: {task.reassignmentReason.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: 
                            task.priority === 'urgent' ? '#dc3545' :
                            task.priority === 'high' ? '#fd7e14' :
                            task.priority === 'medium' ? '#ffc107' : '#28a745',
                          color: task.priority === 'medium' ? 'black' : 'white'
                        }}>
                          {task.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{task.category}</td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: 
                            task.status === 'completed' ? '#28a745' :
                            task.status === 'in-progress' ? '#17a2b8' :
                            task.status === 'cancelled' ? '#dc3545' : '#ffc107',
                          color: 'white'
                        }}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {task.rating ? (
                          <span style={{ color: '#ffc107' }}>
                            {'★'.repeat(task.rating)}{'☆'.repeat(5-task.rating)} ({task.rating}/5)
                          </span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>Not rated</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        {getVerificationInfo(task) || (
                          <span style={{ color: '#6c757d', fontSize: '12px' }}>
                            {task.status === 'completed' ? 'Pending assignment' : 'Complete first'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Statistics View - keeping existing implementation */}
      {view === 'stats' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '30px'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '30px' }}>My Task & Quality Statistics</h2>
          
          {/* Task Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>{stats.total}</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Tasks</div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{stats.completed}</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Completed</div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{stats.pending}</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Pending</div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>{stats.inProgress}</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>In Progress</div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#e1f5fe', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0277bd' }}>{stats.reassignedToMe}</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Reassigned to Me</div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>{stats.originallyMine}</div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>Originally Mine</div>
            </div>
          </div>

          {/* Quality Verification Statistics */}
          <h3 style={{ color: '#6f42c1', marginBottom: '20px' }}>🔍 Quality Verification Performance</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '15px',
            marginBottom: '30px'
          }}>
            <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '8px', textAlign: 'center', border: '1px solid #e1bee7' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7b1fa2' }}>{stats.verificationComplete}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Verification Complete</div>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px', textAlign: 'center', border: '1px solid #c8e6c9' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>{stats.verificationApproved}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Quality Approved</div>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '8px', textAlign: 'center', border: '1px solid #ffcdd2' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c62828' }}>{stats.verificationRejected}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Quality Issues</div>
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center', border: '1px solid #ffcc02' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef6c00' }}>{stats.verificationPending}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Under Review</div>
            </div>
          </div>

          {/* Performance Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ padding: '20px', backgroundColor: '#d4edda', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, color: '#155724' }}>Overall Performance</h3>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                Completion Rate: <strong>{stats.completionRate}%</strong>
              </div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                Average Rating: <strong>{stats.averageRating || 'N/A'}</strong>
                {stats.averageRating && <span>/5</span>}
              </div>
              <div style={{ fontSize: '18px' }}>
                Quality Score: <strong>{stats.averageVerificationScore || 'N/A'}</strong>
                {stats.averageVerificationScore && <span>/5</span>}
              </div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, color: '#7b1fa2' }}>Quality Verification</h3>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                Tasks verified: <strong>{stats.verificationComplete}</strong>
              </div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                Approval rate: <strong>
                  {stats.verificationComplete > 0 
                    ? Math.round((stats.verificationApproved / stats.verificationComplete) * 100) 
                    : 0}%
                </strong>
              </div>
              <div style={{ fontSize: '14px' }}>
                Currently under review: <strong>{stats.verificationPending}</strong>
              </div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, color: '#856404' }}>Task Reassignments</h3>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                Tasks reassigned to you: <strong>{stats.reassignedToMe}</strong>
              </div>
              <div style={{ fontSize: '14px' }}>
                Originally assigned to you: <strong>{stats.originallyMine}</strong>
              </div>
              {stats.reassignedToMe > 0 && (
                <div style={{ fontSize: '12px', color: '#856404', marginTop: '8px' }}>
                  You received tasks from absent colleagues
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#e9ecef',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#495057'
          }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>About Quality Verification System</h4>
            <p style={{ margin: '0 0 10px 0' }}>
              When you complete a task, it may be assigned to a quality verification team. 
              They inspect your work and provide a quality score from 1-5. This helps maintain high standards
              across all operations.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Quality Scores:</strong> 5 = Excellent, 4 = Good, 3 = Satisfactory, 2 = Needs Improvement, 1 = Poor
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTasks;