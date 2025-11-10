import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './admintask.css';

const AdminTaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('all');
  const [summary, setSummary] = useState(null);
  const [reassignmentStats, setReassignmentStats] = useState(null);
  const [verificationTasks, setVerificationTasks] = useState([]);
  const [verificationOverdue, setVerificationOverdue] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    date: '',
    priority: 'medium',
    category: '',
    department: '',
    location: '',
    estimatedDuration: 60
  });
  const navigate = useNavigate();

  // Use the same API base as schedule management
  const API_BASE = 'https://staff-management-upgraded.onrender.com';
  const categories = ['Security', 'Maintenance', 'Cleaning', 'Administrative', 'Customer Service', 'Inspection', 'Training', 'Emergency Response'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  // Mapping from jobTitle to task category
  const jobTitleToCategoryMapping = {
    'Classroom Cleaner': 'Cleaning',
    'Restroom Cleaner': 'Cleaning',
    'Floor Care Team': 'Cleaning',
    'Meeting Attendant': 'Customer Service',
    'Event Setup Helper': 'Administrative',
    'Document Runner': 'Administrative',
    'Tea Server': 'Customer Service',
    'Refreshment Helper': 'Customer Service',
    'Key Handler': 'Security',
    'Repair Technician': 'Maintenance',
    'Waste Collector': 'Cleaning',
    'Gardener': 'Maintenance',
    'Outdoor Cleaner': 'Cleaning',
    'Supply Assistant': 'Administrative',
    'General Helper': 'Administrative'
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
      alert('Admin access required');
      navigate('/admin/login');
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminToken = localStorage.getItem('adminToken');
      
      // Load tasks and users
      const [tasksRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/tasks/admin/all`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }),
        // Use the same user endpoint as schedule management
        fetch(`${API_BASE}/api/admin/all-staff`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })
      ]);

      if (tasksRes.status === 403) {
        const errorData = await tasksRes.json();
        console.error('403 Error details:', errorData);
        throw new Error(`Access forbidden - ${errorData.message}. Check admin token role.`);
      }

      if (!tasksRes.ok) {
        const errorText = await tasksRes.text();
        console.error('Tasks API error response:', errorText);
        throw new Error(`Tasks API failed: HTTP ${tasksRes.status}: ${tasksRes.statusText}`);
      }

      if (!usersRes.ok) {
        const errorText = await usersRes.text();
        console.error('Users API error response:', errorText);
        throw new Error(`Users API failed: HTTP ${usersRes.status}: ${usersRes.statusText}`);
      }

      const tasksData = await tasksRes.json();
      const usersData = await usersRes.json();

      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
      } else {
        setError(tasksData.message || 'Failed to fetch tasks');
      }

      if (usersData.success) {
        setUsers(usersData.staff || []); // Note: property name is 'staff' not 'users'
      } else {
        setError(usersData.message || 'Failed to fetch users');
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Use the same formatting functions as AdminScheduleManagement
  const formatUserDisplay = (user) => {
    const name = user.name || user.username || 'Unknown User';
    const department = user.department || 'No Department';
    const jobTitle = user.jobTitle || '';
    const shift = user.shift || '';
    const workingHours = user.workingHours;
    
    let displayText = `${name} - ${department}`;
    if (jobTitle) displayText += ` (${jobTitle})`;
    if (shift) displayText += ` | ${shift} Shift`;
    if (workingHours && workingHours.start && workingHours.end) {
      displayText += ` [${workingHours.start} - ${workingHours.end}]`;
    }
    
    return displayText;
  };

  const formatUserForTable = (user) => {
    const name = user.name || user.username || 'Unknown';
    const details = [];
    
    if (user.department) details.push(user.department);
    if (user.jobTitle) details.push(user.jobTitle);
    if (user.shift) details.push(`${user.shift} Shift`);
    if (user.workingHours && user.workingHours.start && user.workingHours.end) {
      details.push(`${user.workingHours.start}-${user.workingHours.end}`);
    }
    
    return {
      name,
      details: details.join(' • ')
    };
  };

  const formatTime = (time) => {
    if (!time) return 'Not set';
    const [hours, minutes] = time.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getVerificationStatus = (task) => {
    if (!task.verificationStatus || task.verificationStatus === 'none') {
      if (task.status === 'completed') {
        return { status: 'pending_assignment', color: '#ffc107', text: 'Awaiting Assignment' };
      }
      return { status: 'not_needed', color: '#6c757d', text: 'Complete Task First' };
    }

    switch (task.verificationStatus) {
      case 'pending_verification':
        return { status: 'under_review', color: '#17a2b8', text: 'Under Review' };
      case 'completed':
        if (task.finalVerificationStatus === 'approved') {
          return { status: 'approved', color: '#28a745', text: `✅ Approved (${task.verificationScore || 'N/A'}/5)` };
        } else if (task.finalVerificationStatus === 'rejected') {
          return { status: 'rejected', color: '#dc3545', text: `❌ Failed (${task.verificationScore || 'N/A'}/5)` };
        } else {
          return { status: 'pending_review', color: '#fd7e14', text: 'Pending Final Review' };
        }
      default:
        return { status: 'unknown', color: '#6c757d', text: 'Unknown' };
    }
  };

  const handleUserSelect = (userId) => {
    if (!userId) {
      setSelectedUserDetails(null);
      setFormData({...formData, assignedTo: '', category: '', department: ''});
      return;
    }

    // Find user directly from users array (since they now have embedded profile data)
    const user = users.find(u => (u.userId || u._id) === userId);

    if (user) {
      // Auto-select category based on job title
      const category = jobTitleToCategoryMapping[user.jobTitle] || '';
      // Auto-select department from user
      const department = user.department || '';
      
      setFormData({
        ...formData, 
        assignedTo: userId, 
        category: category,
        department: department
      });

      setSelectedUserDetails(user);
    } else {
      // Fallback
      setFormData({...formData, assignedTo: userId, category: '', department: ''});
      setSelectedUserDetails(null);
    }
  };

  const loadDashboard = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const [dashboardRes, overdue] = await Promise.all([
        fetch(`${API_BASE}/api/tasks/admin/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/api/verification/overdue`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }).catch(() => ({ ok: false })) // Fallback if verification endpoint not available
      ]);

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        if (dashboardData.success) {
          setSummary(dashboardData);
        }
      }

      if (overdue.ok) {
        const overdueData = await overdue.json();
        if (overdueData.success) {
          setVerificationOverdue(overdueData.overdueTasks || []);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadReassignmentStats = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/tasks/reassignment-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReassignmentStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error loading reassignment stats:', error);
    }
  };

  const loadVerificationTasks = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/tasks/needs-verification`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVerificationTasks(data.tasks || []);
        }
      }
    } catch (error) {
      console.error('Error loading verification tasks:', error);
    }
  };

  const assignVerification = async (taskId) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/tasks/assign-verification/${taskId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Verification assigned successfully to team ${data.teamCode}`);
        loadData();
        loadVerificationTasks();
      } else {
        alert(`Failed to assign verification: ${data.message}`);
      }
    } catch (error) {
      console.error('Assign verification error:', error);
      alert(`Failed to assign verification: ${error.message}`);
    }
  };

  const checkTodayReassignments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/api/tasks/check-reassignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: today })
      });

      const data = await response.json();
      
      if (data.success) {
        const { successful, failed } = data.summary;
        if (successful > 0 || failed > 0) {
          alert(`Reassignment check completed:\n✅ ${successful} tasks reassigned successfully\n❌ ${failed} tasks failed to reassign`);
        } else {
          alert('No reassignments needed - all assigned users are available!');
        }
        loadData();
        if (view === 'dashboard') loadDashboard();
      } else {
        alert(`Reassignment check failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error checking reassignments:', error);
      setError(`Failed to check reassignments: ${error.message}`);
    }
  };

  const manualReassignTask = async (taskId, newUserId) => {
    if (!window.confirm('Are you sure you want to reassign this task?')) return;
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/tasks/manual-reassign/${taskId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          newUserId: newUserId,
          reason: 'manual_override' 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        loadData();
      } else {
        alert(`Reassignment failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Manual reassign error:', error);
      alert(`Failed to reassign task: ${error.message}`);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/api/tasks/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        let message = 'Task created successfully';
        
        if (data.reassignmentDetails) {
          message += `\n\n🔄 Auto-reassigned from ${data.reassignmentDetails.from.username} to ${data.reassignmentDetails.to.username} due to absence.`;
        }
        
        alert(message);
        setFormData({
          title: '', description: '', assignedTo: '', date: '',
          priority: 'medium', category: '', department: '', location: '', estimatedDuration: 60
        });
        setSelectedUserDetails(null);
        loadData();
      } else {
        alert(data.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Create task error:', error);
      setError(`Failed to create task: ${error.message}`);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/api/tasks/delete/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Task deleted successfully');
        loadData();
      } else {
        alert(data.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Delete task error:', error);
      setError(`Failed to delete task: ${error.message}`);
    }
  };

  return (
    <div className="admin-task-container">
      {/* Header */}
      <div className="admin-header">
        <h1>Task Management & Quality Verification</h1>
        <div className="header-buttons">
          <button onClick={loadData} className="btn btn-success">
            Refresh
          </button>
          <button onClick={() => navigate('/admin-dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button 
          onClick={() => setView('all')}
          className={`nav-tab ${view === 'all' ? 'active' : ''}`}
        >
          All Tasks ({tasks.length})
        </button>
        <button 
          onClick={() => setView('create')}
          className={`nav-tab ${view === 'create' ? 'active' : ''}`}
        >
          Create Task
        </button>
        <button 
          onClick={() => { 
            setView('verification');
            loadVerificationTasks();
          }}
          className={`nav-tab ${view === 'verification' ? 'active' : ''}`}
        >
          🔍 Verification Queue
        </button>
        <button 
          onClick={() => { 
            setView('dashboard'); 
            loadDashboard();
            loadReassignmentStats(); 
          }}
          className={`nav-tab ${view === 'dashboard' ? 'active' : ''}`}
        >
          📊 Dashboard
        </button>
        <button 
          onClick={checkTodayReassignments}
          className="btn btn-info"
        >
          🔄 Check Auto-Reassignments
        </button>
      </div>

      {/* All Tasks View */}
      {view === 'all' && (
        <div className="card">
          <div className="card-header">
            All Tasks ({tasks.length}) - {tasks.filter(t => t.isReassigned).length} Reassigned - {tasks.filter(t => t.verificationStatus === 'completed' && t.finalVerificationStatus === 'approved').length} Quality Approved
          </div>
          
          {loading ? (
            <div className="loading-state">
              <div>Loading tasks...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">No tasks found</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Current Assignee</th>
                    <th>Original Assignee</th>
                    <th>Date</th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Quality Check</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, index) => {
                    const verificationStatus = getVerificationStatus(task);
                    return (
                      <tr 
                        key={task._id} 
                        className={task.isReassigned ? 'table-row-reassigned' : ''}
                      >
                        <td>
                          <div>
                            {task.title}
                            {task.isReassigned && (
                              <span className="reassigned-badge">
                                REASSIGNED
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{fontWeight: '600', color: '#2d3748', marginBottom: '4px'}}>
                            {formatUserForTable(task.assignedTo || {}).name}
                          </div>
                          {formatUserForTable(task.assignedTo || {}).details && (
                            <div style={{fontSize: '12px', color: '#718096'}}>
                              {formatUserForTable(task.assignedTo || {}).details}
                            </div>
                          )}
                        </td>
                        <td>
                          {task.originalAssignee?.username || '-'}
                          {task.isReassigned && task.reassignmentReason && (
                            <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                              Reason: {task.reassignmentReason.replace('_', ' ')}
                            </div>
                          )}
                        </td>
                        <td>{new Date(task.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${task.priority}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td>{task.category}</td>
                        <td>
                          <span className={`badge badge-${task.status}`}>
                            {task.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ 
                            fontSize: '12px', 
                            color: verificationStatus.color,
                            fontWeight: '600'
                          }}>
                            {verificationStatus.text}
                            {task.verificationNotes && (
                              <div style={{ 
                                fontSize: '10px', 
                                color: '#6c757d',
                                marginTop: '2px',
                                fontStyle: 'italic'
                              }}>
                                "{task.verificationNotes.slice(0, 50)}{task.verificationNotes.length > 50 ? '...' : ''}"
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              onClick={() => deleteTask(task._id)}
                              className="btn btn-danger btn-small"
                            >
                              Delete
                            </button>
                            {(task.status === 'pending' || task.status === 'reassigned') && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    manualReassignTask(task._id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="form-select btn-small"
                              >
                                <option value="">Reassign to...</option>
                                {users
                                  .filter(user => {
                                    const userId = user.userId || user._id;
                                    const assignedUserId = task.assignedTo?._id || task.assignedTo?.id;
                                    return userId !== assignedUserId;
                                  })
                                  .map(user => (
                                    <option key={user.userId || user._id} value={user.userId || user._id}>
                                      {formatUserDisplay(user)}
                                    </option>
                                  ))}
                              </select>
                            )}
                            {task.status === 'completed' && task.verificationStatus === 'none' && (
                              <button
                                onClick={() => assignVerification(task._id)}
                                className="btn btn-info btn-small"
                              >
                                🔍 Assign Verification
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Verification Queue View */}
      {view === 'verification' && (
        <div className="card">
          <div className="card-header">
            🔍 Quality Verification Queue ({verificationTasks.length} tasks awaiting assignment)
          </div>
          <div className="card-body">
            {verificationOverdue.length > 0 && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#856404', margin: '0 0 10px 0' }}>⚠️ Overdue Verifications ({verificationOverdue.length})</h4>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Staff</th>
                        <th>Verifier</th>
                        <th>Team</th>
                        <th>Hours Overdue</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verificationOverdue.map(task => (
                        <tr key={task.id}>
                          <td>{task.taskTitle}</td>
                          <td>{task.staff}</td>
                          <td>{task.verifier}</td>
                          <td>{task.team}</td>
                          <td style={{ color: '#dc3545', fontWeight: 'bold' }}>{task.hoursOverdue}h</td>
                          <td>{task.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {verificationTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">No tasks awaiting verification assignment</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Priority</th>
                      <th>Completed At</th>
                      <th>Assigned To</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationTasks.map(task => (
                      <tr key={task.id}>
                        <td>{task.title}</td>
                        <td>{task.category}</td>
                        <td>{task.location}</td>
                        <td>
                          <span className={`badge badge-${task.priority}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td>{new Date(task.completedAt).toLocaleString()}</td>
                        <td>{task.assignedTo?.username || 'Unknown'}</td>
                        <td>
                          <button
                            onClick={() => assignVerification(task.id)}
                            className="btn btn-primary btn-small"
                          >
                            🔍 Assign Verification
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task View */}
      {view === 'create' && (
        <div className="card">
          <div className="card-body">
            <h2>Create New Task</h2>
            <div className="card-info">
              <strong>Auto-Features:</strong> 
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>Auto-reassignment if assigned user is absent</li>
                <li>Auto-verification assignment when task completed</li>
                <li>Quality scoring by secret verification teams</li>
              </ul>
            </div>

            {/* User Details Display */}
            {selectedUserDetails && (
              <div className="user-details-card">
                <div className="user-details-header">👤 Selected User Details</div>
                <div className="user-details-grid">
                  <div className="user-detail-item">
                    <div className="detail-label">Name</div>
                    <div className="detail-value">{selectedUserDetails.name}</div>
                  </div>
                  <div className="user-detail-item">
                    <div className="detail-label">Department</div>
                    <div className="detail-value">{selectedUserDetails.department}</div>
                  </div>
                  <div className="user-detail-item">
                    <div className="detail-label">Job Title</div>
                    <div className="detail-value">{selectedUserDetails.jobTitle}</div>
                  </div>
                  <div className="user-detail-item">
                    <div className="detail-label">Phone</div>
                    <div className="detail-value">{selectedUserDetails.phone || 'Not available'}</div>
                  </div>
                  <div className="user-detail-item">
                    <div className="detail-label">Shift</div>
                    <div className="detail-value">{selectedUserDetails.shift}</div>
                  </div>
                  <div className="user-detail-item shift-timing">
                    <div className="detail-label">🕐 Working Hours</div>
                    <div className="detail-value">
                      {formatTime(selectedUserDetails.workingHours?.start)} - {formatTime(selectedUserDetails.workingHours?.end)}
                    </div>
                  </div>
                  <div className="user-detail-item">
                    <div className="detail-label">Experience</div>
                    <div className="detail-value">{selectedUserDetails.yearsWorked || 0} years</div>
                  </div>
                  <div className="user-detail-item">
                    <div className="detail-label">Skills</div>
                    <div className="detail-value">
                      {selectedUserDetails.skills?.length > 0 
                        ? selectedUserDetails.skills.join(', ') 
                        : 'No skills listed'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={createTask}>
              <div className="form-group">
                <label className="form-label">Title:</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description:</label>
                <textarea 
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign To:</label>
                <select 
                  className="form-select"
                  value={formData.assignedTo} 
                  onChange={(e) => handleUserSelect(e.target.value)}
                  required
                >
                  <option value="">Select User ({users.length} available)</option>
                  {users.map(user => (
                    <option key={user.userId || user._id} value={user.userId || user._id}>
                      {formatUserDisplay(user)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date:</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority:</label>
                <select 
                  className="form-select"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Category:
                  {selectedUserDetails && formData.category && (
                    <span style={{color: '#28a745', marginLeft: '8px', fontSize: '12px'}}>
                      (Auto-selected based on user's job title)
                    </span>
                  )}
                </label>
                <select 
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Department (Always visible, auto-populated) */}
              <div className="form-group">
                <label className="form-label">
                  Department:
                  {selectedUserDetails && formData.department && (
                    <span style={{color: '#28a745', marginLeft: '8px', fontSize: '12px'}}>
                      (Auto-selected from user profile)
                    </span>
                  )}
                </label>
                <input 
                  type="text"
                  className="form-input"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  placeholder={selectedUserDetails ? "Auto-filled from user profile" : "Enter department or select user first"}
                  style={selectedUserDetails && formData.department ? {
                    backgroundColor: '#f8f9fa', 
                    cursor: 'not-allowed'
                  } : {}}
                  readOnly={selectedUserDetails && formData.department}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location:</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                  placeholder="Enter task location"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (minutes):</label>
                <input 
                  type="number" 
                  className="form-input"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({...formData, estimatedDuration: parseInt(e.target.value)})}
                  min="1"
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Create Task with Auto-Verification
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="card">
          <div className="card-body">
            <h2>📊 Task Management & Verification Dashboard</h2>
            
            {summary ? (
              <div>
                <h3>Overview for {summary.period}</h3>
                
                {/* Task Statistics */}
                <div className="summary-grid">
                  <div className="summary-item">
                    <div className="summary-value">{summary.taskStats.total}</div>
                    <div className="summary-label">Total Tasks</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-value completed">{summary.taskStats.completed}</div>
                    <div className="summary-label">Completed</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-value pending">{summary.taskStats.pending}</div>
                    <div className="summary-label">Pending</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-value in-progress">{summary.taskStats.inProgress}</div>
                    <div className="summary-label">In Progress</div>
                  </div>
                  <div className="summary-item reassigned">
                    <div className="summary-value reassigned">{summary.taskStats.autoReassigned || 0}</div>
                    <div className="summary-label">Auto Reassigned</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-value high-priority">{summary.taskStats.highPriority}</div>
                    <div className="summary-label">High Priority</div>
                  </div>
                </div>

                {/* Verification Statistics */}
                <h3 style={{ color: '#6f42c1', marginTop: '30px', marginBottom: '15px' }}>🔍 Quality Verification Statistics</h3>
                <div className="verification-stats-grid">
                  <div className="verification-stat-item needs-verification">
                    <div className="verification-stat-value">{summary.verificationStats.needsVerification || 0}</div>
                    <div className="verification-stat-label">Awaiting Assignment</div>
                  </div>
                  <div className="verification-stat-item pending-verification">
                    <div className="verification-stat-value">{summary.verificationStats.pendingVerification || 0}</div>
                    <div className="verification-stat-label">Under Review</div>
                  </div>
                  <div className="verification-stat-item verification-complete">
                    <div className="verification-stat-value">{summary.verificationStats.verificationComplete || 0}</div>
                    <div className="verification-stat-label">Review Complete</div>
                  </div>
                  <div className="verification-stat-item verification-approved">
                    <div className="verification-stat-value">{summary.verificationStats.verificationApproved || 0}</div>
                    <div className="verification-stat-label">Quality Approved</div>
                  </div>
                  <div className="verification-stat-item verification-rejected">
                    <div className="verification-stat-value">{summary.verificationStats.verificationRejected || 0}</div>
                    <div className="verification-stat-label">Quality Issues</div>
                  </div>
                  <div className="verification-stat-item average-score">
                    <div className="verification-stat-value">{summary.verificationStats.averageScore || '0.0'}</div>
                    <div className="verification-stat-label">Avg Score /5</div>
                  </div>
                </div>

                {/* Performance Summary */}
                <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>📈 Performance Rates</h3>
                <div className="performance-grid">
                  <div className="performance-item completion">
                    <div className="performance-label">Task Completion Rate</div>
                    <div className="performance-value">{summary.summary.completionRate}%</div>
                  </div>
                  <div className="performance-item verification">
                    <div className="performance-label">Verification Rate</div>
                    <div className="performance-value">{summary.summary.verificationRate}%</div>
                  </div>
                  <div className="performance-item approval">
                    <div className="performance-label">Quality Approval Rate</div>
                    <div className="performance-value">{summary.summary.approvalRate}%</div>
                  </div>
                  <div className="performance-item reassignment">
                    <div className="performance-label">Auto-Reassignment Rate</div>
                    <div className="performance-value">{summary.summary.reassignmentRate}%</div>
                  </div>
                </div>

                {/* Reassignment Statistics */}
                {reassignmentStats && reassignmentStats.total > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3>🔄 Reassignment Statistics</h3>
                    <div className="stats-grid">
                      <div className="stats-card total">
                        <div className="stats-title">Total Reassignments</div>
                        <div className="stats-value">{reassignmentStats.total}</div>
                      </div>
                      
                      {Object.keys(reassignmentStats.byReason || {}).length > 0 && (
                        <div className="stats-card reason">
                          <div className="stats-title">By Reason</div>
                          {Object.entries(reassignmentStats.byReason).map(([reason, count]) => (
                            <div key={reason} className="reason-item">
                              {reason.replace('_', ' ')}: {count}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Category Performance */}
                {Object.keys(summary.tasksByCategory || {}).length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3>📊 Performance by Category</h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Total Tasks</th>
                          <th>Completed</th>
                          <th>Verified</th>
                          <th>Avg Quality Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(summary.tasksByCategory || {}).map(([category, stats]) => (
                          <tr key={category}>
                            <td style={{ fontWeight: 'bold' }}>{category}</td>
                            <td style={{ textAlign: 'center' }}>{stats.total}</td>
                            <td style={{ textAlign: 'center' }}>{stats.completed}</td>
                            <td style={{ textAlign: 'center' }}>{stats.verified}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#6f42c1' }}>
                              {stats.avgScore ? `${stats.avgScore}/5` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Recent Tasks */}
                {summary.recentTasks && summary.recentTasks.length > 0 && (
                  <div style={{ marginTop: '30px' }}>
                    <h3>📝 Recent Tasks</h3>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Assigned To</th>
                            <th>Quality Status</th>
                            <th>Quality Score</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.recentTasks.map(task => {
                            const verificationStatus = getVerificationStatus(task);
                            return (
                              <tr key={task.id}>
                                <td>{task.title}</td>
                                <td>{task.category}</td>
                                <td>
                                  <span className={`badge badge-${task.status}`}>
                                    {task.status}
                                  </span>
                                </td>
                                <td>{task.assignedTo}</td>
                                <td style={{ 
                                  color: verificationStatus.color,
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}>
                                  {verificationStatus.text}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {task.verificationScore ? (
                                    <span style={{ 
                                      fontWeight: 'bold',
                                      color: task.verificationScore >= 4 ? '#28a745' : 
                                             task.verificationScore >= 3 ? '#ffc107' : '#dc3545'
                                    }}>
                                      {task.verificationScore}/5
                                    </span>
                                  ) : '-'}
                                </td>
                                <td>{new Date(task.date).toLocaleDateString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text">No dashboard data available</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTaskManagement;