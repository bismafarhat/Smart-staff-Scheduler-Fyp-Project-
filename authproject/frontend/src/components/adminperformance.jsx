import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './adminperformance.css'; // Import the CSS file

const AdminPerformanceManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [userPerformance, setUserPerformance] = useState(null);
  const [allPerformance, setAllPerformance] = useState([]);
  const [departmentSummary, setDepartmentSummary] = useState([]);
  const [employeesNeedingAttention, setEmployeesNeedingAttention] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);
  
  // New state for enhanced functionality
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionModalType, setActionModalType] = useState(''); // 'achievement', 'improvement', 'issue', 'warning', 'plan'
  const [actionFormData, setActionFormData] = useState({});

  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5000';

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        setError('Admin token not found. Please login again.');
        return;
      }

      // Load users for dropdown
      try {
        const usersRes = await axios.get(`${API_BASE}/api/admin/all-staff`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (usersRes.data.success) {
          setUsers(usersRes.data.staff);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }

      // Load all performance data
      await Promise.all([
        loadAllPerformance(adminToken),
        loadDepartmentSummary(adminToken),
        loadAnalytics(adminToken),
        loadEmployeesNeedingAttention(adminToken)
      ]);

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllPerformance = async (adminToken) => {
    try {
      const response = await axios.get(`${API_BASE}/api/performance/admin/all-users`, {
        params: { 
          month: selectedMonth.toString().padStart(2, '0'), 
          year: selectedYear
        },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        setAllPerformance(response.data.performance || []);
      }
    } catch (error) {
      console.error('All performance error:', error);
    }
  };

  const loadDepartmentSummary = async (adminToken) => {
    try {
      const response = await axios.get(`${API_BASE}/api/performance/departments`, {
        params: { 
          month: selectedMonth.toString().padStart(2, '0'), 
          year: selectedYear 
        },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        setDepartmentSummary(response.data.departments || []);
      }
    } catch (error) {
      console.error('Department summary error:', error);
    }
  };

  // NEW: Load analytics data
  const loadAnalytics = async (adminToken) => {
    try {
      const response = await axios.get(`${API_BASE}/api/performance/admin/analytics`, {
        params: { 
          month: selectedMonth.toString().padStart(2, '0'), 
          year: selectedYear 
        },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        setAnalytics(response.data.analytics || {});
      }
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  // NEW: Load employees needing attention
  const loadEmployeesNeedingAttention = async (adminToken) => {
    try {
      const response = await axios.get(`${API_BASE}/api/performance/admin/employees-needing-attention`, {
        params: { 
          month: selectedMonth.toString().padStart(2, '0'), 
          year: selectedYear 
        },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        setEmployeesNeedingAttention(response.data.employees || []);
      }
    } catch (error) {
      console.error('Employees needing attention error:', error);
    }
  };

  const loadUserPerformance = async (userId) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE}/api/performance/admin/user/${userId}`, {
        params: { 
          month: selectedMonth.toString().padStart(2, '0'), 
          year: selectedYear 
        },
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        setUserPerformance(response.data);
      }
    } catch (error) {
      console.error('Error loading user performance:', error);
      alert('Failed to load user performance data.');
    }
  };

  const recalculateAll = async (autoWarnings = false) => {
    const message = autoWarnings 
      ? 'This will recalculate performance and create automatic warnings for poor performers. Continue?'
      : 'This will recalculate performance for all users. Continue?';
    
    if (!window.confirm(message)) return;
    
    setLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await axios.post(`${API_BASE}/api/performance/admin/recalculate`, {
        month: selectedMonth.toString().padStart(2, '0'),
        year: selectedYear,
        autoWarnings
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      alert(response.data.message + (response.data.warningsCreated > 0 ? ` (${response.data.warningsCreated} warnings created)` : ''));
      loadData();
    } catch (error) {
      console.error('Error with recalculate:', error);
      alert('Failed to recalculate performance data');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Auto check warnings
  const autoCheckWarnings = async (dryRun = true) => {
    const message = dryRun 
      ? 'This will preview warnings that would be created for poor performers.'
      : 'This will automatically create warnings for all poor performers. Continue?';
    
    if (!window.confirm(message)) return;
    
    setActionLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await axios.post(`${API_BASE}/api/performance/admin/auto-check-warnings`, {
        month: selectedMonth.toString().padStart(2, '0'),
        year: selectedYear,
        dryRun
      }, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        alert(response.data.message);
        if (!dryRun) {
          loadData(); // Reload data if warnings were actually created
        }
      }
    } catch (error) {
      console.error('Auto check warnings error:', error);
      alert('Failed to check warnings: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  // NEW: Open action modal
  const openActionModal = (type, userId = selectedUser) => {
    if (!userId) {
      alert('Please select an employee first.');
      return;
    }
    setActionModalType(type);
    setActionFormData({ 
      userId, 
      month: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}` 
    });
    setShowActionModal(true);
  };

  // NEW: Submit action
  const submitAction = async () => {
    setActionLoading(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      let endpoint = '';
      let data = { ...actionFormData };

      switch (actionModalType) {
        case 'achievement':
          endpoint = `${API_BASE}/api/performance/admin/add-achievement`;
          break;
        case 'improvement':
          endpoint = `${API_BASE}/api/performance/admin/add-improvement-area`;
          data.area = data.title; // Map title to area field
          break;
        case 'issue':
          endpoint = `${API_BASE}/api/performance/admin/add-performance-issue`;
          break;
        case 'warning':
          endpoint = `${API_BASE}/api/performance/admin/create-warning`;
          data.type = data.type || 'verbal_warning';
          data.reason = data.title;
          break;
        case 'plan':
          endpoint = `${API_BASE}/api/performance/admin/create-improvement-plan`;
          data.objectives = data.objectives || [{ description: data.description }];
          break;
        default:
          throw new Error('Invalid action type');
      }

      const response = await axios.post(endpoint, data, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (response.data.success) {
        alert(response.data.message);
        setShowActionModal(false);
        setActionFormData({});
        loadData(); // Reload data
        if (selectedUser) {
          loadUserPerformance(selectedUser); // Reload user data if selected
        }
      }
    } catch (error) {
      console.error('Submit action error:', error);
      alert('Failed to submit action: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Helper functions (EXISTING - UNCHANGED)
  const getScoreClass = (score) => {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-good';
    if (score >= 70) return 'score-average';
    if (score >= 60) return 'score-below';
    return 'score-poor';
  };

  const getCardValueClass = (score) => {
    if (score >= 90) return 'card-value excellent';
    if (score >= 80) return 'card-value good';
    if (score >= 70) return 'card-value average';
    if (score >= 60) return 'card-value below';
    return 'card-value poor';
  };

  const getGrade = (score) => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getRankBadgeClass = (index) => {
    if (index === 0) return 'rank-badge gold';
    if (index === 1) return 'rank-badge silver';
    if (index === 2) return 'rank-badge bronze';
    return 'rank-badge default';
  };

  const getStatusBadgeClass = (score) => {
    if (score >= 90) return 'status-badge status-excellent';
    if (score >= 80) return 'status-badge status-good';
    if (score >= 70) return 'status-badge status-average';
    if (score >= 60) return 'status-badge status-below';
    return 'status-badge status-poor';
  };

  // NEW: Get warning level badge
  const getWarningBadge = (warningLevel, hasActiveWarnings) => {
    if (!hasActiveWarnings || warningLevel === 'none') return null;
    
    const colors = {
      'first_warning': 'warning-badge yellow',
      'second_warning': 'warning-badge orange', 
      'final_warning': 'warning-badge red'
    };
    
    return (
      <span className={colors[warningLevel] || 'warning-badge gray'}>
        {warningLevel.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // NEW: Get risk level badge
  const getRiskBadge = (riskLevel) => {
    if (!riskLevel || riskLevel === 'none') return null;
    
    const colors = {
      'low': 'risk-badge green',
      'medium': 'risk-badge yellow',
      'high': 'risk-badge red'
    };
    
    return (
      <span className={colors[riskLevel] || 'risk-badge gray'}>
        {riskLevel.toUpperCase()} RISK
      </span>
    );
  };

  const getUserId = (user) => user.userId || user._id || user.id;
  const getUserDisplayName = (user) => {
    const name = user.name || user.username || user.email || 'Unknown User';
    const department = user.department || 'No Department';
    return `${name} (${department})`;
  };

  const calculateOverallScore = (perf) => {
    // Use the pre-calculated overallScore if available, otherwise calculate
    return perf.overallScore || Math.round(
      ((perf.attendanceScore || 0) * 0.4) + 
      ((perf.taskCompletionRate || 0) * 0.4) + 
      ((perf.punctualityScore || 0) * 0.2)
    );
  };

  if (loading) {
    return (
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <div className="header-top">
            <h1 className="dashboard-title">Performance Management Dashboard</h1>
            <button className="back-button" onClick={() => navigate('/admin-dashboard')}>
              Back to Admin Dashboard
            </button>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2 className="loading-text">Loading Performance Data...</h2>
          <p className="loading-subtext">Please wait while we fetch the performance information.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <div className="header-top">
            <h1 className="dashboard-title">Performance Management Dashboard</h1>
            <button className="back-button" onClick={() => navigate('/admin-dashboard')}>
              Back to Admin Dashboard
            </button>
          </div>
        </div>
        <div className="error-container">
          <h2 className="error-title">Error Loading Data</h2>
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={() => {
            setError(null);
            loadData();
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-top">
          <h1 className="dashboard-title">Performance Management Dashboard</h1>
          <button className="back-button" onClick={() => navigate('/admin-dashboard')}>
            Back to Admin Dashboard
          </button>
        </div>

        {/* Controls */}
        <div className="dashboard-controls">
          <div className="control-group">
            <label className="control-label">Month:</label>
            <select 
              className="control-select"
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>
                  {new Date(0, i).toLocaleString('default', {month: 'long'})}
                </option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label className="control-label">Year:</label>
            <select 
              className="control-select"
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <button className="recalculate-button" onClick={() => recalculateAll()}>
            Recalculate Performance
          </button>

          <button className="recalculate-button warning" onClick={() => recalculateAll(true)}>
            Recalculate + Auto Warnings
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="navigation-tabs">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${view === 'overview' ? 'active' : ''}`}
            onClick={() => setView('overview')}
          >
            📊 Company Overview
          </button>
          <button 
            className={`tab-button ${view === 'rankings' ? 'active' : ''}`}
            onClick={() => setView('rankings')}
          >
            🏆 Performance Rankings
          </button>
          <button 
            className={`tab-button ${view === 'departments' ? 'active' : ''}`}
            onClick={() => setView('departments')}
          >
            🏢 Department Analysis
          </button>
          <button 
            className={`tab-button ${view === 'attention' ? 'active' : ''}`}
            onClick={() => setView('attention')}
          >
            ⚠️ Needs Attention ({employeesNeedingAttention.length})
          </button>
          <button 
            className={`tab-button ${view === 'user' ? 'active' : ''}`}
            onClick={() => setView('user')}
          >
            👤 Individual Management
          </button>
          <button 
            className={`tab-button ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => setView('analytics')}
          >
            📈 Analytics
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {/* Company Overview (EXISTING - ENHANCED) */}
        {view === 'overview' && (
          <div>
            <h2 className="content-title">Company Performance Overview</h2>
            <h3 className="period-subtitle">
              Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            
            {allPerformance.length > 0 ? (
              <div>
                {/* Enhanced Summary Cards */}
                <div className="summary-cards">
                  <div className="summary-card">
                    <h3 className="card-title">Total Employees</h3>
                    <div className="card-value excellent">{allPerformance.length}</div>
                  </div>
                  
                  <div className="summary-card">
                    <h3 className="card-title">Average Attendance</h3>
                    <div className={getCardValueClass(Math.round(allPerformance.reduce((sum, p) => sum + (p.attendanceScore || 0), 0) / allPerformance.length))}>
                      {Math.round(allPerformance.reduce((sum, p) => sum + (p.attendanceScore || 0), 0) / allPerformance.length)}%
                    </div>
                  </div>
                  
                  <div className="summary-card">
                    <h3 className="card-title">Average Task Completion</h3>
                    <div className={getCardValueClass(Math.round(allPerformance.reduce((sum, p) => sum + (p.taskCompletionRate || 0), 0) / allPerformance.length))}>
                      {Math.round(allPerformance.reduce((sum, p) => sum + (p.taskCompletionRate || 0), 0) / allPerformance.length)}%
                    </div>
                  </div>
                  
                  <div className="summary-card">
                    <h3 className="card-title">High Performers</h3>
                    <div className="card-value excellent">
                      {allPerformance.filter(p => (p.overallScore || calculateOverallScore(p)) >= 90).length}
                    </div>
                  </div>

                  {/* NEW: Enhanced summary cards */}
                  <div className="summary-card warning">
                    <h3 className="card-title">Active Warnings</h3>
                    <div className="card-value warning">
                      {allPerformance.filter(p => p.hasActiveWarnings).length}
                    </div>
                  </div>

                  <div className="summary-card danger">
                    <h3 className="card-title">High Risk</h3>
                    <div className="card-value poor">
                      {allPerformance.filter(p => p.riskLevel === 'high').length}
                    </div>
                  </div>

                  <div className="summary-card info">
                    <h3 className="card-title">Needs Attention</h3>
                    <div className="card-value below">
                      {employeesNeedingAttention.length}
                    </div>
                  </div>

                  <div className="summary-card success">
                    <h3 className="card-title">Excellent Grade</h3>
                    <div className="card-value excellent">
                      {allPerformance.filter(p => (p.grade === 'A+' || p.grade === 'A')).length}
                    </div>
                  </div>
                </div>

                {/* Top 10 Performers (EXISTING - ENHANCED) */}
                <div>
                  <h3 className="content-title">Top 10 Performers</h3>
                  <table className="performance-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Attendance</th>
                        <th>Tasks</th>
                        <th>Punctuality</th>
                        <th>Overall Score</th>
                        <th>Grade</th>
                        <th>Status</th>
                        <th>Warnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPerformance
                        .sort((a, b) => calculateOverallScore(b) - calculateOverallScore(a))
                        .slice(0, 10)
                        .map((perf, index) => {
                          const overallScore = calculateOverallScore(perf);
                          return (
                            <tr key={perf.userId || index}>
                              <td>
                                <div className={getRankBadgeClass(index)}>
                                  #{index + 1}
                                </div>
                              </td>
                              <td><strong>{perf.userInfo?.name || 'Unknown'}</strong></td>
                              <td>{perf.userInfo?.department || 'N/A'}</td>
                              <td>
                                <span className={`score-display ${getScoreClass(perf.attendanceScore || 0)}`}>
                                  {perf.attendanceScore || 0}%
                                </span>
                              </td>
                              <td>
                                <span className={`score-display ${getScoreClass(perf.taskCompletionRate || 0)}`}>
                                  {perf.taskCompletionRate || 0}%
                                </span>
                              </td>
                              <td>
                                <span className={`score-display ${getScoreClass(perf.punctualityScore || 0)}`}>
                                  {perf.punctualityScore || 0}%
                                </span>
                              </td>
                              <td>
                                <span className={`score-display ${getScoreClass(overallScore)}`}>
                                  {overallScore}
                                </span>
                              </td>
                              <td>
                                <span className={getStatusBadgeClass(overallScore)}>
                                  {getGrade(overallScore)}
                                </span>
                              </td>
                              <td>
                                {getRiskBadge(perf.riskLevel)}
                                {overallScore >= 90 ? '⭐ Excellent' : 
                                 overallScore >= 80 ? '✅ Good' : 
                                 overallScore >= 70 ? '⚠️ Average' : 
                                 overallScore >= 60 ? '🔄 Below Average' : 
                                 '❌ Poor'}
                              </td>
                              <td>
                                {getWarningBadge(perf.warningLevel, perf.hasActiveWarnings)}
                                {perf.warningsCount > 0 && (
                                  <span className="warning-count">({perf.warningsCount})</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3 className="empty-title">No Performance Data Available</h3>
                <p className="empty-description">
                  Performance data will appear here once calculated for the selected period.
                </p>
                <button className="calculate-button" onClick={() => recalculateAll()}>
                  Calculate Performance Data
                </button>
              </div>
            )}
          </div>
        )}

        {/* Performance Rankings (EXISTING - ENHANCED) */}
        {view === 'rankings' && (
          <div>
            <h2 className="content-title">Complete Performance Rankings</h2>
            <h3 className="period-subtitle">
              Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            
            {allPerformance.length > 0 ? (
              <div>
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Job Title</th>
                      <th>Attendance</th>
                      <th>Task Completion</th>
                      <th>Punctuality</th>
                      <th>Overall Score</th>
                      <th>Grade</th>
                      <th>Performance Level</th>
                      <th>Risk Level</th>
                      <th>Warnings</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPerformance
                      .sort((a, b) => calculateOverallScore(b) - calculateOverallScore(a))
                      .map((perf, index) => {
                        const overallScore = calculateOverallScore(perf);
                        return (
                          <tr key={perf.userId || index}>
                            <td>
                              <div className={getRankBadgeClass(index)}>
                                #{index + 1}
                              </div>
                            </td>
                            <td><strong>{perf.userInfo?.name || 'Unknown'}</strong></td>
                            <td>{perf.userInfo?.department || 'N/A'}</td>
                            <td>{perf.userInfo?.jobTitle || 'N/A'}</td>
                            <td>
                              <span className={`score-display ${getScoreClass(perf.attendanceScore || 0)}`}>
                                {perf.attendanceScore || 0}%
                              </span>
                            </td>
                            <td>
                              <span className={`score-display ${getScoreClass(perf.taskCompletionRate || 0)}`}>
                                {perf.taskCompletionRate || 0}%
                              </span>
                            </td>
                            <td>
                              <span className={`score-display ${getScoreClass(perf.punctualityScore || 0)}`}>
                                {perf.punctualityScore || 0}%
                              </span>
                            </td>
                            <td>
                              <span className={`score-display ${getScoreClass(overallScore)}`}>
                                {overallScore}
                              </span>
                            </td>
                            <td>
                              <span className={getStatusBadgeClass(overallScore)}>
                                {getGrade(overallScore)}
                              </span>
                            </td>
                            <td>
                              <span className={`performance-level ${perf.performanceLevel || 'poor'}`}>
                                {(perf.performanceLevel || 'poor').replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {getRiskBadge(perf.riskLevel)}
                            </td>
                            <td>
                              {getWarningBadge(perf.warningLevel, perf.hasActiveWarnings)}
                              {perf.warningsCount > 0 && (
                                <span className="warning-count">({perf.warningsCount})</span>
                              )}
                            </td>
                            <td>
                              {perf.status === 'needs_attention' ? '🚨 Attention Required' :
                               perf.status === 'under_review' ? '👁️ Under Review' :
                               perf.status === 'reviewed' ? '✅ Reviewed' : 
                               '📝 ' + (perf.status || 'draft').replace('_', ' ')}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏆</div>
                <h3 className="empty-title">No Rankings Available</h3>
                <p className="empty-description">
                  Performance rankings will appear here once data is calculated.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Department Analysis (EXISTING - ENHANCED) */}
        {view === 'departments' && (
          <div>
            <h2 className="content-title">Department Performance Analysis</h2>
            <h3 className="period-subtitle">
              Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            
            {departmentSummary.length > 0 ? (
              <div>
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total Employees</th>
                      <th>Avg Attendance</th>
                      <th>Avg Task Completion</th>
                      <th>Avg Punctuality</th>
                      <th>Avg Overall Score</th>
                      <th>Active Warnings</th>
                      <th>Improvement Plans</th>
                      <th>Top Performer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentSummary
                      .sort((a, b) => (b.averageOverall || 0) - (a.averageOverall || 0))
                      .map(dept => {
                        const deptOverallScore = dept.averageOverall || Math.round((dept.averageAttendance + dept.averageTaskCompletion + dept.averagePunctuality) / 3);
                        return (
                          <tr key={dept.department}>
                            <td><strong>{dept.department}</strong></td>
                            <td>{dept.employeeCount || dept.totalEmployees}</td>
                            <td>
                              <span className={`score-display ${getScoreClass(dept.averageAttendance)}`}>
                                {dept.averageAttendance}%
                              </span>
                            </td>
                            <td>
                              <span className={`score-display ${getScoreClass(dept.averageTaskCompletion)}`}>
                                {dept.averageTaskCompletion}%
                              </span>
                            </td>
                            <td>
                              <span className={`score-display ${getScoreClass(dept.averagePunctuality)}`}>
                                {dept.averagePunctuality}%
                              </span>
                            </td>
                            <td>
                              <span className={`score-display ${getScoreClass(deptOverallScore)}`}>
                                {deptOverallScore} ({getGrade(deptOverallScore)})
                              </span>
                            </td>
                            <td>
                              <span className={dept.warningsCount > 0 ? 'text-danger' : 'text-success'}>
                                {dept.warningsCount || 0}
                              </span>
                            </td>
                            <td>
                              <span className={dept.improvementPlansCount > 0 ? 'text-warning' : 'text-muted'}>
                                {dept.improvementPlansCount || 0}
                              </span>
                            </td>
                            <td>{dept.topPerformer?.userInfo?.name || 'N/A'}</td>
                            <td>
                              {deptOverallScore >= 85 ? '🌟 Excellent' :
                               deptOverallScore >= 75 ? '✅ Good' :
                               deptOverallScore >= 65 ? '⚠️ Average' :
                               '🚨 Needs Attention'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3 className="empty-title">No Department Data Available</h3>
                <p className="empty-description">
                  Department analysis will appear here once performance data is calculated.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NEW: Employees Needing Attention */}
        {view === 'attention' && (
          <div>
            <h2 className="content-title">Employees Needing Attention</h2>
            <h3 className="period-subtitle">
              Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>

            {/* Action Buttons */}
            <div className="attention-actions">
              <button 
                className="action-button warning"
                onClick={() => autoCheckWarnings(true)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Checking...' : 'Preview Auto Warnings'}
              </button>
              <button 
                className="action-button danger"
                onClick={() => autoCheckWarnings(false)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Creating...' : 'Create Auto Warnings'}
              </button>
            </div>
            
            {employeesNeedingAttention.length > 0 ? (
              <div>
                <div className="attention-summary">
                  <div className="attention-stats">
                    <span className="stat-item">
                      <strong>Total:</strong> {employeesNeedingAttention.length}
                    </span>
                    <span className="stat-item high-risk">
                      <strong>High Risk:</strong> {employeesNeedingAttention.filter(emp => emp.riskLevel === 'high').length}
                    </span>
                    <span className="stat-item warnings">
                      <strong>Active Warnings:</strong> {employeesNeedingAttention.filter(emp => emp.hasActiveWarnings).length}
                    </span>
                    <span className="stat-item poor">
                      <strong>Poor Performance:</strong> {employeesNeedingAttention.filter(emp => emp.overallScore < 60).length}
                    </span>
                  </div>
                </div>

                <table className="performance-table attention-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Overall Score</th>
                      <th>Performance Level</th>
                      <th>Risk Level</th>
                      <th>Active Warnings</th>
                      <th>Warning Level</th>
                      <th>Issues</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeesNeedingAttention
                      .sort((a, b) => {
                        // Sort by risk level first, then by score
                        const riskOrder = { 'high': 3, 'medium': 2, 'low': 1, 'none': 0 };
                        return (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0) || 
                               (a.overallScore || 0) - (b.overallScore || 0);
                      })
                      .map((emp, index) => (
                        <tr key={emp.userId || emp._id || index} className={emp.riskLevel === 'high' ? 'high-risk-row' : ''}>
                          <td><strong>{emp.userId?.username || emp.userInfo?.name || 'Unknown'}</strong></td>
                          <td>{emp.userId?.profile?.department || emp.userInfo?.department || 'N/A'}</td>
                          <td>
                            <span className={`score-display ${getScoreClass(emp.overallScore || 0)}`}>
                              {emp.overallScore || 0}%
                            </span>
                          </td>
                          <td>
                            <span className={`performance-level ${emp.performanceLevel || 'poor'}`}>
                              {(emp.performanceLevel || 'poor').replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {getRiskBadge(emp.riskLevel)}
                          </td>
                          <td>
                            <span className={emp.hasActiveWarnings ? 'text-danger' : 'text-success'}>
                              {emp.hasActiveWarnings ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td>
                            {getWarningBadge(emp.warningLevel, emp.hasActiveWarnings)}
                          </td>
                          <td>
                            <span className="issues-count">
                              {emp.activeIssuesCount || 0}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-inline">
                              <button 
                                className="action-btn small warning"
                                onClick={() => {
                                  setSelectedUser(emp.userId?._id || emp.userId);
                                  openActionModal('warning');
                                }}
                              >
                                Warning
                              </button>
                              <button 
                                className="action-btn small info"
                                onClick={() => {
                                  setSelectedUser(emp.userId?._id || emp.userId);
                                  openActionModal('plan');
                                }}
                              >
                                PIP
                              </button>
                              <button 
                                className="action-btn small secondary"
                                onClick={() => {
                                  setSelectedUser(emp.userId?._id || emp.userId);
                                  setView('user');
                                  loadUserPerformance(emp.userId?._id || emp.userId);
                                }}
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3 className="empty-title">No Employees Need Attention</h3>
                <p className="empty-description">
                  All employees are performing well and don't require immediate attention.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Individual Management (EXISTING - ENHANCED) */}
        {view === 'user' && (
          <div>
            <h2 className="content-title">Individual Performance Management</h2>
            <h3 className="period-subtitle">
              Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            
            <div className="employee-selection">
              <label className="selection-label">Select Employee:</label>
              <select 
                className="employee-select"
                value={selectedUser} 
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  if (e.target.value) loadUserPerformance(e.target.value);
                }}
              >
                <option value="">Choose an employee...</option>
                {users.length > 0 ? (
                  users.map(user => {
                    const userId = getUserId(user);
                    const displayName = getUserDisplayName(user);
                    return (
                      <option key={userId} value={userId}>
                        {displayName}
                      </option>
                    );
                  })
                ) : (
                  <option value="">No employees found</option>
                )}
              </select>
            </div>

            {userPerformance && userPerformance.performance && (
              <div>
                <h3 className="content-title">
                  Performance Details for {userPerformance.userInfo?.name || 'Unknown Employee'}
                </h3>
                <p className="period-subtitle">
                  <strong>Department:</strong> {userPerformance.userInfo?.department || 'Not Set'} | 
                  <strong> Job Title:</strong> {userPerformance.userInfo?.jobTitle || 'Not Set'}
                </p>

                {/* Enhanced Status Indicators */}
                <div className="status-indicators">
                  {getRiskBadge(userPerformance.performance.riskLevel)}
                  {getWarningBadge(userPerformance.performance.warningLevel, userPerformance.performance.hasActiveWarnings)}
                  <span className={`performance-level-badge ${userPerformance.performance.performanceLevel || 'poor'}`}>
                    {(userPerformance.performance.performanceLevel || 'poor').replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`status-badge ${userPerformance.performance.status || 'draft'}`}>
                    {(userPerformance.performance.status || 'draft').replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Performance Summary Cards (EXISTING - ENHANCED) */}
                <div className="performance-detail-cards">
                  <div className="detail-card">
                    <h4 className="detail-card-title">Overall Score</h4>
                    <div className={`detail-card-value ${getScoreClass(calculateOverallScore(userPerformance.performance))}`}>
                      {calculateOverallScore(userPerformance.performance)}%
                    </div>
                    <div className="detail-card-subtitle">
                      Grade: {getGrade(calculateOverallScore(userPerformance.performance))}
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="detail-card-title">Attendance Score</h4>
                    <div className={`detail-card-value ${getScoreClass(userPerformance.performance.attendanceScore || 0)}`}>
                      {userPerformance.performance.attendanceScore || 0}%
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="detail-card-title">Task Completion</h4>
                    <div className={`detail-card-value ${getScoreClass(userPerformance.performance.taskCompletionRate || 0)}`}>
                      {userPerformance.performance.taskCompletionRate || 0}%
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="detail-card-title">Punctuality</h4>
                    <div className={`detail-card-value ${getScoreClass(userPerformance.performance.punctualityScore || 0)}`}>
                      {userPerformance.performance.punctualityScore || 0}%
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="detail-card-title">Working Hours</h4>
                    <div className="detail-card-value excellent">
                      {userPerformance.performance.totalWorkingHours || 0}h
                    </div>
                  </div>

                  {/* NEW: Enhanced cards */}
                  <div className="detail-card">
                    <h4 className="detail-card-title">Active Issues</h4>
                    <div className={`detail-card-value ${userPerformance.performance.activeIssuesCount > 0 ? 'poor' : 'excellent'}`}>
                      {userPerformance.performance.activeIssuesCount || 0}
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="detail-card-title">Goals Progress</h4>
                    <div className={`detail-card-value ${getScoreClass(userPerformance.performance.goalsCompletionRate || 0)}`}>
                      {userPerformance.performance.goalsCompletionRate || 0}%
                    </div>
                  </div>

                  <div className="detail-card">
                    <h4 className="detail-card-title">Warning Count</h4>
                    <div className={`detail-card-value ${userPerformance.performance.warningsCount > 0 ? 'poor' : 'excellent'}`}>
                      {userPerformance.performance.warningsCount || 0}
                    </div>
                  </div>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="action-buttons">
                  <button 
                    className="action-button success"
                    onClick={() => openActionModal('achievement')}
                  >
                    Add Achievement
                  </button>
                  
                  <button 
                    className="action-button warning"
                    onClick={() => openActionModal('improvement')}
                  >
                    Add Improvement Area
                  </button>

                  <button 
                    className="action-button info"
                    onClick={() => openActionModal('issue')}
                  >
                    Report Issue
                  </button>

                  <button 
                    className="action-button danger"
                    onClick={() => openActionModal('warning')}
                  >
                    Create Warning
                  </button>

                  <button 
                    className="action-button primary"
                    onClick={() => openActionModal('plan')}
                  >
                    Create Improvement Plan
                  </button>
                </div>

                {/* NEW: Enhanced Information Sections */}
                {userPerformance.achievements && userPerformance.achievements.length > 0 && (
                  <div className="info-section">
                    <h4 className="content-title">Achievements ({userPerformance.achievements.length})</h4>
                    <div className="achievements-list">
                      {userPerformance.achievements.slice(0, 5).map((achievement, index) => (
                        <div key={index} className="achievement-item">
                          <h5>{achievement.title}</h5>
                          <p>{achievement.description}</p>
                          <small>Added on {new Date(achievement.date).toLocaleDateString()}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userPerformance.disciplinaryActions && userPerformance.disciplinaryActions.length > 0 && (
                  <div className="info-section warning-section">
                    <h4 className="content-title">Disciplinary Actions ({userPerformance.disciplinaryActions.length})</h4>
                    <div className="disciplinary-list">
                      {userPerformance.disciplinaryActions.slice(0, 5).map((action, index) => (
                        <div key={index} className="disciplinary-item">
                          <h5>{action.type.replace('_', ' ').toUpperCase()}</h5>
                          <p><strong>Reason:</strong> {action.reason}</p>
                          <p>{action.description}</p>
                          <small>
                            Issued on {new Date(action.effectiveDate).toLocaleDateString()}
                            {action.acknowledgedByEmployee && ' • Acknowledged'}
                          </small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userPerformance.areas_for_improvement && userPerformance.areas_for_improvement.length > 0 && (
                  <div className="info-section">
                    <h4 className="content-title">Areas for Improvement ({userPerformance.areas_for_improvement.length})</h4>
                    <div className="improvement-list">
                      {userPerformance.areas_for_improvement.slice(0, 5).map((area, index) => (
                        <div key={index} className="improvement-item">
                          <h5>{area.area}</h5>
                          <p>{area.description}</p>
                          <div className="improvement-meta">
                            <span className={`priority-badge ${area.priority}`}>
                              {area.priority.toUpperCase()}
                            </span>
                            <span className={`progress-badge ${area.progress}`}>
                              {area.progress.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <small>Added on {new Date(area.date).toLocaleDateString()}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userPerformance.improvementPlan && userPerformance.improvementPlan.isActive && (
                  <div className="info-section plan-section">
                    <h4 className="content-title">Active Improvement Plan</h4>
                    <div className="improvement-plan">
                      <p><strong>Duration:</strong> {new Date(userPerformance.improvementPlan.startDate).toLocaleDateString()} - {new Date(userPerformance.improvementPlan.endDate).toLocaleDateString()}</p>
                      <h5>Objectives:</h5>
                      <ul>
                        {userPerformance.improvementPlan.objectives.map((obj, index) => (
                          <li key={index} className={obj.completed ? 'completed' : ''}>
                            {obj.description}
                            {obj.targetDate && ` (Due: ${new Date(obj.targetDate).toLocaleDateString()})`}
                            {obj.completed && ' ✅'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Detailed Metrics (EXISTING - UNCHANGED) */}
                <div>
                  <h4 className="content-title">Detailed Metrics</h4>
                  <table className="performance-table">
                    <tbody>
                      <tr>
                        <td><strong>Overall Performance Score</strong></td>
                        <td>
                          <span className={`score-display ${getScoreClass(calculateOverallScore(userPerformance.performance))}`}>
                            {calculateOverallScore(userPerformance.performance)}/100
                          </span>
                        </td>
                        <td>
                          <span className={getStatusBadgeClass(calculateOverallScore(userPerformance.performance))}>
                            Grade: {getGrade(calculateOverallScore(userPerformance.performance))}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Total Work Days</strong></td>
                        <td>{userPerformance.performance.totalWorkDays || 0}</td>
                        <td><strong>Present Days:</strong> {userPerformance.performance.presentDays || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Late Arrivals</strong></td>
                        <td>{userPerformance.performance.lateArrivals || 0}</td>
                        <td><strong>Absences:</strong> {userPerformance.performance.absences || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Tasks</strong></td>
                        <td>{userPerformance.performance.totalTasks || 0}</td>
                        <td><strong>Completed:</strong> {userPerformance.performance.completedTasks || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Pending Tasks</strong></td>
                        <td>{userPerformance.performance.pendingTasks || 0}</td>
                        <td><strong>In Progress:</strong> {userPerformance.performance.inProgressTasks || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Average Task Rating</strong></td>
                        <td>{userPerformance.performance.averageTaskRating || 0}/5 ⭐</td>
                        <td><strong>Cancelled:</strong> {userPerformance.performance.cancelledTasks || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Performance History (EXISTING - UNCHANGED) */}
                {userPerformance.performanceHistory && userPerformance.performanceHistory.length > 0 && (
                  <div>
                    <h4 className="content-title">Performance History (Last 6 Months)</h4>
                    <table className="performance-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Attendance</th>
                          <th>Task Completion</th>
                          <th>Punctuality</th>
                          <th>Working Hours</th>
                          <th>Overall Score</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPerformance.performanceHistory.map((record, index) => {
                          const overallHistoryScore = calculateOverallScore(record);
                          return (
                            <tr key={index}>
                              <td><strong>{record.month}</strong></td>
                              <td>
                                <span className={`score-display ${getScoreClass(record.attendanceScore || 0)}`}>
                                  {record.attendanceScore || 0}%
                                </span>
                              </td>
                              <td>
                                <span className={`score-display ${getScoreClass(record.taskCompletionRate || 0)}`}>
                                  {record.taskCompletionRate || 0}%
                                </span>
                              </td>
                              <td>
                                <span className={`score-display ${getScoreClass(record.punctualityScore || 0)}`}>
                                  {record.punctualityScore || 0}%
                                </span>
                              </td>
                              <td>{record.totalWorkingHours || 0}h</td>
                              <td>
                                <span className={`score-display ${getScoreClass(overallHistoryScore)}`}>
                                  {overallHistoryScore}
                                </span>
                              </td>
                              <td>
                                <span className={getStatusBadgeClass(overallHistoryScore)}>
                                  {getGrade(overallHistoryScore)}
                                </span>
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

            {!selectedUser && (
              <div className="empty-state">
                <div className="empty-icon">👤</div>
                <h3 className="empty-title">Select an Employee</h3>
                <p className="empty-description">
                  Choose an employee from the dropdown above to view their detailed performance data.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NEW: Analytics Dashboard */}
        {view === 'analytics' && (
          <div>
            <h2 className="content-title">Advanced Analytics Dashboard</h2>
            <h3 className="period-subtitle">
              Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>

            {analytics.totalEmployees ? (
              <div>
                {/* Analytics Summary Cards */}
                <div className="analytics-cards">
                  <div className="analytics-card">
                    <h4>Performance Distribution</h4>
                    <div className="performance-breakdown">
                      <div className="breakdown-item excellent">
                        <span className="label">Excellent (A+, A)</span>
                        <span className="value">{analytics.excellentPerformers || 0}</span>
                      </div>
                      <div className="breakdown-item good">
                        <span className="label">Good (B)</span>
                        <span className="value">{analytics.goodPerformers || 0}</span>
                      </div>
                      <div className="breakdown-item average">
                        <span className="label">Average (C)</span>
                        <span className="value">{analytics.averagePerformers || 0}</span>
                      </div>
                      <div className="breakdown-item below">
                        <span className="label">Below Average (D)</span>
                        <span className="value">{analytics.belowAveragePerformers || 0}</span>
                      </div>
                      <div className="breakdown-item poor">
                        <span className="label">Poor (F)</span>
                        <span className="value">{analytics.poorPerformers || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-card">
                    <h4>Warning Statistics</h4>
                    <div className="warning-stats">
                      <div className="stat-row">
                        <span className="stat-label">Total Active Warnings</span>
                        <span className="stat-value danger">{analytics.totalWarnings || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Employees with Warnings</span>
                        <span className="stat-value warning">{analytics.employeesWithWarnings || 0}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Active Improvement Plans</span>
                        <span className="stat-value info">{analytics.activeImprovementPlans || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-card">
                    <h4>Overall Health</h4>
                    <div className="health-metrics">
                      <div className="health-item">
                        <span className="health-label">Company Average</span>
                        <div className={`health-score ${getScoreClass(Math.round(analytics.averageOverallScore || 0))}`}>
                          {Math.round(analytics.averageOverallScore || 0)}%
                        </div>
                      </div>
                      <div className="health-item">
                        <span className="health-label">Total Employees</span>
                        <div className="health-score excellent">
                          {analytics.totalEmployees}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Distribution Chart Placeholder */}
                <div className="chart-container">
                  <h4>Performance Distribution Visualization</h4>
                  <div className="chart-placeholder">
                    <div className="chart-bars">
                      <div className="bar-group">
                        <div className="bar excellent" style={{height: `${((analytics.excellentPerformers || 0) / analytics.totalEmployees) * 100}px`}}></div>
                        <span className="bar-label">Excellent</span>
                        <span className="bar-value">{analytics.excellentPerformers || 0}</span>
                      </div>
                      <div className="bar-group">
                        <div className="bar good" style={{height: `${((analytics.goodPerformers || 0) / analytics.totalEmployees) * 100}px`}}></div>
                        <span className="bar-label">Good</span>
                        <span className="bar-value">{analytics.goodPerformers || 0}</span>
                      </div>
                      <div className="bar-group">
                        <div className="bar average" style={{height: `${((analytics.averagePerformers || 0) / analytics.totalEmployees) * 100}px`}}></div>
                        <span className="bar-label">Average</span>
                        <span className="bar-value">{analytics.averagePerformers || 0}</span>
                      </div>
                      <div className="bar-group">
                        <div className="bar below" style={{height: `${((analytics.belowAveragePerformers || 0) / analytics.totalEmployees) * 100}px`}}></div>
                        <span className="bar-label">Below Avg</span>
                        <span className="bar-value">{analytics.belowAveragePerformers || 0}</span>
                      </div>
                      <div className="bar-group">
                        <div className="bar poor" style={{height: `${((analytics.poorPerformers || 0) / analytics.totalEmployees) * 100}px`}}></div>
                        <span className="bar-label">Poor</span>
                        <span className="bar-value">{analytics.poorPerformers || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📈</div>
                <h3 className="empty-title">No Analytics Data Available</h3>
                <p className="empty-description">
                  Analytics will appear here once performance data is calculated and processed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {actionModalType === 'achievement' && 'Add Achievement'}
                {actionModalType === 'improvement' && 'Add Improvement Area'}
                {actionModalType === 'issue' && 'Report Performance Issue'}
                {actionModalType === 'warning' && 'Create Disciplinary Warning'}
                {actionModalType === 'plan' && 'Create Improvement Plan'}
              </h3>
              <button className="modal-close" onClick={() => setShowActionModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Title/Summary:</label>
                <input
                  type="text"
                  value={actionFormData.title || ''}
                  onChange={(e) => setActionFormData({...actionFormData, title: e.target.value})}
                  placeholder="Enter title..."
                />
              </div>

              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={actionFormData.description || ''}
                  onChange={(e) => setActionFormData({...actionFormData, description: e.target.value})}
                  placeholder="Enter description..."
                  rows="4"
                />
              </div>

              {actionModalType === 'achievement' && (
                <>
                  <div className="form-group">
                    <label>Category:</label>
                    <select
                      value={actionFormData.category || 'performance'}
                      onChange={(e) => setActionFormData({...actionFormData, category: e.target.value})}
                    >
                      <option value="performance">Performance</option>
                      <option value="attendance">Attendance</option>
                      <option value="teamwork">Teamwork</option>
                      <option value="innovation">Innovation</option>
                      <option value="customer_service">Customer Service</option>
                      <option value="leadership">Leadership</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Points:</label>
                    <input
                      type="number"
                      value={actionFormData.points || ''}
                      onChange={(e) => setActionFormData({...actionFormData, points: parseInt(e.target.value)})}
                      placeholder="0"
                    />
                  </div>
                </>
              )}

              {actionModalType === 'improvement' && (
                <>
                  <div className="form-group">
                    <label>Priority:</label>
                    <select
                      value={actionFormData.priority || 'medium'}
                      onChange={(e) => setActionFormData({...actionFormData, priority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Date:</label>
                    <input
                      type="date"
                      value={actionFormData.targetDate || ''}
                      onChange={(e) => setActionFormData({...actionFormData, targetDate: e.target.value})}
                    />
                  </div>
                </>
              )}

              {actionModalType === 'issue' && (
                <>
                  <div className="form-group">
                    <label>Category:</label>
                    <select
                      value={actionFormData.category || 'performance'}
                      onChange={(e) => setActionFormData({...actionFormData, category: e.target.value})}
                    >
                      <option value="attendance">Attendance</option>
                      <option value="punctuality">Punctuality</option>
                      <option value="task_completion">Task Completion</option>
                      <option value="quality">Quality</option>
                      <option value="behavior">Behavior</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Severity:</label>
                    <select
                      value={actionFormData.severity || 'moderate'}
                      onChange={(e) => setActionFormData({...actionFormData, severity: e.target.value})}
                    >
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="major">Major</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </>
              )}

              {actionModalType === 'warning' && (
                <>
                  <div className="form-group">
                    <label>Warning Type:</label>
                    <select
                      value={actionFormData.type || 'verbal_warning'}
                      onChange={(e) => setActionFormData({...actionFormData, type: e.target.value})}
                    >
                      <option value="verbal_warning">Verbal Warning</option>
                      <option value="written_warning">Written Warning</option>
                      <option value="final_warning">Final Warning</option>
                      <option value="suspension">Suspension</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Expiry Date (Optional):</label>
                    <input
                      type="date"
                      value={actionFormData.expiryDate || ''}
                      onChange={(e) => setActionFormData({...actionFormData, expiryDate: e.target.value})}
                    />
                  </div>
                </>
              )}

              {actionModalType === 'plan' && (
                <div className="form-group">
                  <label>Duration (Months):</label>
                  <select
                    value={actionFormData.duration || 3}
                    onChange={(e) => setActionFormData({...actionFormData, duration: parseInt(e.target.value)})}
                  >
                    <option value="1">1 Month</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                  </select>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="modal-button secondary" 
                onClick={() => setShowActionModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="modal-button primary" 
                onClick={submitAction}
                disabled={actionLoading || !actionFormData.title}
              >
                {actionLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="dashboard-footer">
        <p><strong>Performance Calculation:</strong> Overall Score = (Attendance × 40%) + (Task Completion × 40%) + (Punctuality × 20%)</p>
        <p><strong>Grades:</strong> A+ (95-100%), A (90-94%), B (80-89%), C (70-79%), D (60-69%), F (0-59%)</p>
        <p><strong>Warning Levels:</strong> First Warning → Second Warning → Final Warning</p>
        <p><strong>Data Period:</strong> {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  );
};

export default AdminPerformanceManagement;