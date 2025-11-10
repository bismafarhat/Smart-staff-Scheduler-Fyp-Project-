import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validCategories, setValidCategories] = useState([]);
  const [view, setView] = useState('all');
  const [selectedUserDetails, setSelectedUserDetails] = useState(null); // Add selected user details
  const [formData, setFormData] = useState({
    userId: '',
    date: '',
    shift: 'Morning',
    startTime: '09:00',
    endTime: '17:00',
    location: '',
    department: '',
    notes: ''
  });
  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5000';

  const departments = ['Cleaning Staff', 'Event Helpers', 'Tea and Snack Staff', 'Maintenance Staff', 'Outdoor Cleaners', 'Office Helpers'];
  
  // Professional styling
  const styles = {
    container: {
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    },
    header: {
      backgroundColor: '#ffffff',
      padding: '32px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '24px',
      border: '1px solid #e2e8f0'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1a202c',
      marginBottom: '8px',
      margin: '0'
    },
    subtitle: {
      fontSize: '1rem',
      color: '#718096',
      margin: '0'
    },
    buttonPrimary: {
      backgroundColor: '#3182ce',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      textDecoration: 'none',
      display: 'inline-block'
    },
    navTabs: {
      backgroundColor: '#ffffff',
      padding: '8px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '24px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      gap: '4px'
    },
    tabButton: {
      flex: '1',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: '#718096',
      transition: 'all 0.2s'
    },
    tabButtonActive: {
      backgroundColor: '#3182ce',
      color: 'white',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    },
    contentCard: {
      backgroundColor: '#ffffff',
      padding: '32px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    statCard: {
      backgroundColor: '#f7fafc',
      padding: '24px',
      borderRadius: '8px',
      textAlign: 'center',
      border: '1px solid #e2e8f0',
      transition: 'transform 0.2s'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    tableHeader: {
      backgroundColor: '#f7fafc',
      padding: '16px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '14px',
      color: '#2d3748',
      borderBottom: '1px solid #e2e8f0'
    },
    tableCell: {
      padding: '16px',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px',
      color: '#4a5568',
      verticalAlign: 'top'
    },
    formGroup: {
      marginBottom: '24px'
    },
    formLabel: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#2d3748'
    },
    formInput: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      transition: 'border-color 0.2s',
      backgroundColor: '#ffffff'
    },
    userDetailsCard: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '32px'
    },
    userDetailsHeader: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#2d3748',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    userDetailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px'
    },
    userDetailItem: {
      display: 'flex',
      flexDirection: 'column'
    },
    detailLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#718096',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    detailValue: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#2d3748'
    }
  };

  const getDepartmentCategory = (department, validCategories) => {
    const mapping = {
      'Cleaning Staff': 'Cleaning',
      'Event Helpers': 'Customer Service', 
      'Tea and Snack Staff': 'Customer Service',
      'Maintenance Staff': 'Maintenance',
      'Outdoor Cleaners': 'Cleaning',
      'Office Helpers': 'Administrative'
    };
    
    const mappedCategory = mapping[department];
    if (validCategories.includes(mappedCategory)) {
      return mappedCategory;
    }
    return validCategories[0] || 'Administrative';
  };

  // Add department mapping from user data (similar to task management)
  const getDepartmentFromUser = (user) => {
    if (user.department) {
      // Map department to our predefined departments if needed
      const deptMapping = {
        'Cleaning': 'Cleaning Staff',
        'Customer Service': 'Event Helpers', 
        'Maintenance': 'Maintenance Staff',
        'Administrative': 'Office Helpers'
      };
      return deptMapping[user.department] || user.department;
    }
    return '';
  };

  // Format user display with comprehensive information
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

  // Add formatTime function for user details display
  const formatTime = (time) => {
    if (!time) return 'Not set';
    const [hours, minutes] = time.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Add user selection handler
  const handleUserSelect = (userId) => {
    if (!userId) {
      setSelectedUserDetails(null);
      setFormData({...formData, userId: '', department: ''});
      return;
    }

    // Find user directly from users array
    const user = users.find(u => (u.userId || u._id) === userId);

    if (user) {
      // Auto-select department from user
      const department = getDepartmentFromUser(user) || departments[0] || '';
      
      setFormData({
        ...formData, 
        userId: userId, 
        department: department
      });

      setSelectedUserDetails(user);
    } else {
      // Fallback
      setFormData({...formData, userId: userId, department: ''});
      setSelectedUserDetails(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        setError('Admin token not found. Please login again.');
        setLoading(false);
        return;
      }
      
      const [schedulesRes, usersRes, categoriesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/tasks/admin/all`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }),
        axios.get(`${API_BASE}/api/admin/all-staff`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }),
        axios.get(`${API_BASE}/api/tasks/categories`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        }).catch(err => {
          console.warn('Failed to fetch categories:', err);
          return { data: { success: true, categories: ['Security', 'Maintenance', 'Cleaning', 'Administrative', 'Customer Service', 'Inspection', 'Training', 'Emergency Response'] } };
        })
      ]);

      if (schedulesRes.data && schedulesRes.data.success) {
        setSchedules(Array.isArray(schedulesRes.data.tasks) ? schedulesRes.data.tasks : []);
      } else {
        setSchedules([]);
      }
      
      if (usersRes.data && usersRes.data.success) {
        setUsers(Array.isArray(usersRes.data.staff) ? usersRes.data.staff : []);
      } else {
        setUsers([]);
      }
      
      if (categoriesRes.data && categoriesRes.data.success) {
        setValidCategories(Array.isArray(categoriesRes.data.categories) ? categoriesRes.data.categories : []);
      } else {
        setValidCategories(['Security', 'Maintenance', 'Cleaning', 'Administrative', 'Customer Service', 'Inspection', 'Training', 'Emergency Response']);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Failed to load data: ${error.response?.data?.message || error.message}`);
      setSchedules([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const adminToken = localStorage.getItem('adminToken');
      const userToken = localStorage.getItem('token');
      const authToken = adminToken || userToken;
      
      if (!authToken) {
        alert('Authentication token not found. Please login again.');
        return;
      }
      
      const validCategory = getDepartmentCategory(formData.department, validCategories);
      
      const taskData = {
        title: `${formData.shift} Shift - ${formData.department}`,
        assignedTo: formData.userId,
        date: formData.date,
        category: validCategory,
        location: formData.location,
        description: `Shift: ${formData.shift} (${formData.startTime} - ${formData.endTime})\nDepartment: ${formData.department}\nNotes: ${formData.notes}`,
        priority: 'medium',
        estimatedDuration: calculateDuration(formData.startTime, formData.endTime)
      };
      
      const response = await axios.post(`${API_BASE}/api/tasks/create`, taskData, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        alert('Schedule created successfully!');
        setFormData({
          userId: '', date: '', shift: 'Morning', startTime: '09:00',
          endTime: '17:00', location: '', department: '', notes: ''
        });
        setSelectedUserDetails(null); // Clear selected user details
        await loadData();
        setView('all');
      } else {
        alert(`Failed to create schedule: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Create schedule error:', error);
      alert(`Failed to create schedule: ${error.response?.data?.message || error.message}`);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    return Math.abs(end - start) / (1000 * 60);
  };

  const updateScheduleStatus = async (scheduleId, status) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        alert('Admin token not found. Please login again.');
        return;
      }
      
      const response = await axios.put(`${API_BASE}/api/tasks/update-status/${scheduleId}`, 
        { status }, 
        { headers: { 'Authorization': `Bearer ${adminToken}` }}
      );
      
      if (response.data.success) {
        alert('Schedule status updated successfully!');
        await loadData();
      } else {
        alert(`Failed to update status: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Update status error:', error);
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        alert('Admin token not found. Please login again.');
        return;
      }
      
      const response = await axios.delete(`${API_BASE}/api/tasks/delete/${scheduleId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        alert('Schedule deleted successfully!');
        await loadData();
      } else {
        alert(`Failed to delete schedule: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Delete schedule error:', error);
      alert(`Failed to delete schedule: ${error.response?.data?.message || error.message}`);
    }
  };

  const bulkCreateSchedules = async () => {
    const scheduleData = prompt('Enter JSON array of schedules:');
    if (!scheduleData) return;
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        alert('Admin token not found. Please login again.');
        return;
      }
      
      const schedules = JSON.parse(scheduleData);
      if (!Array.isArray(schedules)) {
        alert('Please enter a valid JSON array');
        return;
      }
      
      const response = await axios.post(`${API_BASE}/api/tasks/bulk-create`, { tasks: schedules }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        alert(`Bulk schedules created successfully: ${response.data.message}`);
        await loadData();
      } else {
        alert(`Failed to create bulk schedules: ${response.data.message}`);
      }
    } catch (error) {
      if (error.name === 'SyntaxError') {
        alert('Invalid JSON format. Please check your input.');
      } else {
        console.error('Bulk create error:', error);
        alert(`Failed to create bulk schedules: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{...styles.contentCard, textAlign: 'center', padding: '60px'}}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3182ce',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h2 style={{fontSize: '1.5rem', color: '#2d3748', marginBottom: '8px'}}>Loading Schedule Manager</h2>
          <p style={{color: '#718096'}}>Please wait while we fetch your data...</p>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h1 style={styles.title}>Schedule Management</h1>
              <p style={styles.subtitle}>Professional staff scheduling system</p>
            </div>
            <button 
              style={styles.buttonPrimary}
              onClick={() => navigate('/admin-dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <div style={{...styles.contentCard, backgroundColor: '#fed7d7', borderColor: '#fc8181'}}>
          <h3 style={{color: '#c53030', marginBottom: '12px'}}>Error Loading Data</h3>
          <p style={{color: '#c53030', marginBottom: '20px'}}>{error}</p>
          <button 
            style={{...styles.buttonPrimary, backgroundColor: '#e53e3e'}}
            onClick={() => {
              setError(null);
              setLoading(true);
              loadData();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <h1 style={styles.title}>Schedule Management</h1>
            <p style={styles.subtitle}>Professional staff scheduling and workforce management</p>
          </div>
          <button 
            style={styles.buttonPrimary}
            onClick={() => navigate('/admin-dashboard')}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2c5282'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3182ce'}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.navTabs}>
        {[
          {key: 'all', label: 'All Schedules'},
          {key: 'create', label: 'Create Schedule'},
          {key: 'bulk', label: 'Bulk Operations'}
        ].map(tab => (
          <button 
            key={tab.key}
            style={{
              ...styles.tabButton,
              ...(view === tab.key ? styles.tabButtonActive : {})
            }}
            onClick={() => setView(tab.key)}
            onMouseOver={(e) => {
              if (view !== tab.key) {
                e.target.style.backgroundColor = '#edf2f7';
                e.target.style.color = '#2d3748';
              }
            }}
            onMouseOut={(e) => {
              if (view !== tab.key) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#718096';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.contentCard}>
        {view === 'all' && (
          <div>
            <h2 style={{fontSize: '1.875rem', fontWeight: '700', color: '#1a202c', marginBottom: '24px'}}>
              All Schedules
            </h2>
            
            {/* Stats Cards */}
            <div style={styles.statsGrid}>
              {[
                {label: 'Total Schedules', value: schedules?.length || 0, color: '#3182ce'},
                {label: 'Total Staff', value: users?.length || 0, color: '#38a169'},
                {label: 'Completed', value: schedules?.filter(s => s.status === 'completed').length || 0, color: '#00b894'},
                {label: 'Pending', value: schedules?.filter(s => s.status === 'pending').length || 0, color: '#fdcb6e'}
              ].map((stat, index) => (
                <div 
                  key={index}
                  style={styles.statCard}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px 0 rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{fontSize: '2rem', fontWeight: '700', color: stat.color, marginBottom: '8px'}}>
                    {stat.value}
                  </div>
                  <div style={{fontSize: '0.875rem', color: '#718096', fontWeight: '500'}}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            
            {schedules && schedules.length > 0 ? (
              <div style={{overflowX: 'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Staff Member</th>
                      <th style={styles.tableHeader}>Schedule Date</th>
                      <th style={styles.tableHeader}>Priority</th>
                      <th style={styles.tableHeader}>Duration</th>
                      <th style={styles.tableHeader}>Location</th>
                      <th style={styles.tableHeader}>Category</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule, index) => {
                      const userInfo = formatUserForTable(schedule.assignedTo || {});
                      return (
                        <tr key={schedule._id || `schedule-${index}`}>
                          <td style={styles.tableCell}>
                            <div style={{fontWeight: '600', color: '#2d3748', marginBottom: '4px'}}>
                              {userInfo.name}
                            </div>
                            {userInfo.details && (
                              <div style={{fontSize: '12px', color: '#718096'}}>
                                {userInfo.details}
                              </div>
                            )}
                          </td>
                          <td style={styles.tableCell}>
                            {schedule.date ? new Date(schedule.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: schedule.priority === 'high' ? '#fed7d7' : 
                                            schedule.priority === 'low' ? '#e6fffa' : '#fef5e7',
                              color: schedule.priority === 'high' ? '#c53030' : 
                                   schedule.priority === 'low' ? '#319795' : '#d69e2e'
                            }}>
                              {schedule.priority || 'Medium'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {schedule.estimatedDuration ? `${schedule.estimatedDuration} min` : 'N/A'}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{fontWeight: '500'}}>
                              {schedule.location || 'N/A'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: '#edf2f7',
                              color: '#2d3748'
                            }}>
                              {schedule.category || 'N/A'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'capitalize',
                              backgroundColor: schedule.status === 'completed' ? '#c6f6d5' : 
                                            schedule.status === 'in-progress' ? '#fef5e7' : 
                                            schedule.status === 'cancelled' ? '#fed7d7' : '#e2e8f0',
                              color: schedule.status === 'completed' ? '#22543d' : 
                                   schedule.status === 'in-progress' ? '#744210' : 
                                   schedule.status === 'cancelled' ? '#c53030' : '#2d3748'
                            }}>
                              {schedule.status || 'pending'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                              <select 
                                style={{
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  backgroundColor: '#fff',
                                  cursor: 'pointer'
                                }}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    updateScheduleStatus(schedule._id, e.target.value);
                                    e.target.value = '';
                                  }
                                }} 
                                defaultValue=""
                              >
                                <option value="">Update Status</option>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <button 
                                style={{
                                  backgroundColor: '#e53e3e',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s'
                                }}
                                onClick={() => deleteSchedule(schedule._id)}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#c53030'}
                                onMouseOut={(e) => e.target.style.backgroundColor = '#e53e3e'}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 32px',
                backgroundColor: '#f7fafc',
                borderRadius: '12px',
                border: '2px dashed #cbd5e0'
              }}>
                <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: '#2d3748', marginBottom: '12px'}}>
                  No Schedules Found
                </h3>
                <p style={{fontSize: '1rem', color: '#718096', marginBottom: '24px'}}>
                  Get started by creating your first schedule to organize your team.
                </p>
                <button 
                  style={styles.buttonPrimary}
                  onClick={() => setView('create')}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#2c5282'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#3182ce'}
                >
                  Create First Schedule
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'create' && (
          <div>
            <h2 style={{fontSize: '1.875rem', fontWeight: '700', color: '#1a202c', marginBottom: '32px'}}>
              Create New Schedule
            </h2>

            {/* User Details Display - Add this section */}
            {selectedUserDetails && (
              <div style={styles.userDetailsCard}>
                <div style={styles.userDetailsHeader}>
                  👤 Selected Staff Member Details
                </div>
                <div style={styles.userDetailsGrid}>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>Name</div>
                    <div style={styles.detailValue}>{selectedUserDetails.name}</div>
                  </div>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>Department</div>
                    <div style={styles.detailValue}>{selectedUserDetails.department}</div>
                  </div>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>Job Title</div>
                    <div style={styles.detailValue}>{selectedUserDetails.jobTitle}</div>
                  </div>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>Phone</div>
                    <div style={styles.detailValue}>{selectedUserDetails.phone || 'Not available'}</div>
                  </div>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>Shift</div>
                    <div style={styles.detailValue}>{selectedUserDetails.shift}</div>
                  </div>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>🕐 Working Hours</div>
                    <div style={styles.detailValue}>
                      {formatTime(selectedUserDetails.workingHours?.start)} - {formatTime(selectedUserDetails.workingHours?.end)}
                    </div>
                  </div>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>Experience</div>
                    <div style={styles.detailValue}>{selectedUserDetails.yearsWorked || 0} years</div>
                  </div>
                  <div style={styles.userDetailItem}>
                    <div style={styles.detailLabel}>Skills</div>
                    <div style={styles.detailValue}>
                      {selectedUserDetails.skills?.length > 0 
                        ? selectedUserDetails.skills.join(', ') 
                        : 'No skills listed'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSchedule} style={{maxWidth: '800px'}}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Select Staff Member:</label>
                <select 
                  value={formData.userId} 
                  onChange={(e) => handleUserSelect(e.target.value)} // Use the handler
                  required
                  style={{...styles.formInput, height: 'auto', minHeight: '48px'}}
                  onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="">Choose a staff member</option>
                  {users && users.map((user) => (
                    <option key={user.userId || user._id} value={user.userId || user._id}>
                      {formatUserDisplay(user)}
                    </option>
                  ))}
                </select>
                {users && users.length === 0 && (
                  <small style={{color: '#e53e3e', fontSize: '12px', marginTop: '4px', display: 'block'}}>
                    No staff members available. Please check user management.
                  </small>
                )}
              </div>

              <div style={{display: 'flex', gap: '20px', marginBottom: '24px'}}>
                <div style={{flex: '1'}}>
                  <label style={styles.formLabel}>Schedule Date:</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                    style={styles.formInput}
                    onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div style={{flex: '1'}}>
                  <label style={styles.formLabel}>Shift Type:</label>
                  <select 
                    value={formData.shift}
                    onChange={(e) => setFormData({...formData, shift: e.target.value})}
                    style={styles.formInput}
                    onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div style={{display: 'flex', gap: '20px', marginBottom: '24px'}}>
                <div style={{flex: '1'}}>
                  <label style={styles.formLabel}>Start Time:</label>
                  <input 
                    type="time" 
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    required
                    style={styles.formInput}
                    onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div style={{flex: '1'}}>
                  <label style={styles.formLabel}>End Time:</label>
                  <input 
                    type="time" 
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    required
                    style={styles.formInput}
                    onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              <div style={{display: 'flex', gap: '20px', marginBottom: '24px'}}>
                <div style={{flex: '1'}}>
                  <label style={styles.formLabel}>Work Location:</label>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Enter work location"
                    required
                    style={styles.formInput}
                    onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div style={{flex: '1'}}>
                  <label style={styles.formLabel}>
                    Department:
                    {selectedUserDetails && formData.department && (
                      <span style={{color: '#28a745', marginLeft: '8px', fontSize: '12px'}}>
                        (Auto-selected from user profile)
                      </span>
                    )}
                  </label>
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    required
                    style={{
                      ...styles.formInput,
                      ...(selectedUserDetails && formData.department ? {
                        backgroundColor: '#f8f9fa', 
                        cursor: 'not-allowed'
                      } : {})
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    disabled={selectedUserDetails && formData.department}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => {
                      const mappedCategory = getDepartmentCategory(dept, validCategories);
                      return (
                        <option key={dept} value={dept}>
                          {dept} → {mappedCategory}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Additional Notes:</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional information or special instructions for this schedule..."
                  rows="4"
                  style={{...styles.formInput, resize: 'vertical', minHeight: '100px'}}
                  onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {validCategories.length > 0 && (
                <div style={{
                  backgroundColor: '#ebf8ff',
                  border: '1px solid #90cdf4',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <small style={{color: '#2c5282', fontSize: '13px', fontWeight: '500'}}>
                    Available Task Categories: {validCategories.join(', ')}
                  </small>
                </div>
              )}

              <button 
                type="submit" 
                style={{
                  backgroundColor: '#38a169',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  width: '100%'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2f855a'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#38a169'}
              >
                Create Schedule
              </button>
            </form>
          </div>
        )}

        {view === 'bulk' && (
          <div>
            <h2 style={{fontSize: '1.875rem', fontWeight: '700', color: '#1a202c', marginBottom: '32px'}}>
              Bulk Operations
            </h2>
            
            <div style={{
              backgroundColor: '#f7fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              <h3 style={{fontSize: '1.25rem', fontWeight: '600', color: '#2d3748', marginBottom: '16px'}}>
                Mass Schedule Creation
              </h3>
              <p style={{color: '#718096', marginBottom: '24px', lineHeight: '1.6'}}>
                Create multiple schedules at once using JSON format. Perfect for recurring schedules or large-scale workforce management.
              </p>
              
              <button 
                style={{
                  backgroundColor: '#319795',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={bulkCreateSchedules}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2c7a7b'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#319795'}
              >
                Start Bulk Creation
              </button>
            </div>
            
            <div style={{
              backgroundColor: '#f7fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <h4 style={{fontSize: '1.125rem', fontWeight: '600', color: '#2d3748', marginBottom: '16px'}}>
                JSON Format Example:
              </h4>
              <pre style={{
                backgroundColor: '#1a202c',
                color: '#e2e8f0',
                padding: '20px',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '14px',
                lineHeight: '1.5',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace'
              }}>
{`[
  {
    "title": "Morning Shift - Cleaning Staff",
    "assignedTo": "user_id_here",
    "date": "2024-01-15",
    "category": "Cleaning",
    "location": "Office Building A",
    "description": "Shift: Morning (09:00 - 17:00)\\nNotes: Regular cleaning schedule",
    "priority": "medium",
    "estimatedDuration": 480
  }
]`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminScheduleManagement;