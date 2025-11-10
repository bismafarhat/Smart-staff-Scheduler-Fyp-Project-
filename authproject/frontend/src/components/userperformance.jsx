import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './userperformance.css'; // Import the CSS file

const UserPerformanceDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [historyData, setHistoryData] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  
  // NEW: Enhanced state for warnings and achievements
  const [view, setView] = useState('performance'); // performance, warnings, achievements, goals
  const [warnings, setWarnings] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [goals, setGoals] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [acknowledgeForm, setAcknowledgeForm] = useState({
    comments: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Fetching performance data for month:', month, 'year:', year);

      const response = await fetch(`http://localhost:5000/api/performance/my-performance?month=${month.toString().padStart(2, '0')}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response Status:', response.status);

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const result = await response.json();
      console.log('API Response Data:', result);

      if (result.success) {
        setData(result.performance);
        setHistoryData(result.performanceHistory || []);
        setUserInfo(result.userInfo);
        
        // NEW: Set enhanced data
        setAchievements(result.achievements || []);
        setGoals(result.goals || []);
        setAlerts(result.alerts || {});
      } else {
        setError(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch warnings data
  const fetchWarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/performance/user/my-warnings?month=${month.toString().padStart(2, '0')}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWarnings(result);
        }
      }
    } catch (err) {
      console.error('Fetch warnings error:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchWarnings();
  }, [month, year]);

  // NEW: Acknowledge warning
  const acknowledgeWarning = async () => {
    if (!selectedWarning) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/performance/user/acknowledge-warning`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          month: `${year}-${month.toString().padStart(2, '0')}`,
          warningId: selectedWarning._id,
          comments: acknowledgeForm.comments
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Warning acknowledged successfully');
          setShowAcknowledgeModal(false);
          setSelectedWarning(null);
          setAcknowledgeForm({ comments: '' });
          fetchWarnings(); // Reload warnings
        }
      } else {
        throw new Error('Failed to acknowledge warning');
      }
    } catch (err) {
      console.error('Acknowledge warning error:', err);
      alert('Failed to acknowledge warning: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const calculateOverallScore = () => {
    if (!data) return 0;
    // Use pre-calculated score if available, otherwise calculate
    return data.overallScore || Math.round(
      (data.attendanceScore * 0.4) + 
      (data.taskCompletionRate * 0.4) + 
      (data.punctualityScore * 0.2)
    );
  };

  const getGrade = (score) => {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

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

  const getStatusBadgeClass = (score) => {
    if (score >= 90) return 'status-badge status-excellent';
    if (score >= 80) return 'status-badge status-good';
    if (score >= 70) return 'status-badge status-average';
    if (score >= 60) return 'status-badge status-below';
    return 'status-badge status-poor';
  };

  const getStatusText = (score, type = 'general') => {
    if (type === 'punctuality') {
      if (score >= 95) return 'Excellent';
      if (score >= 90) return 'Very Good';
      if (score >= 80) return 'Good';
      return 'Needs Improvement';
    }
    
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Below Average';
    return 'Needs Improvement';
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

  // NEW: Get performance level badge
  const getPerformanceLevelBadge = (level) => {
    const colors = {
      'excellent': 'performance-level-badge excellent',
      'good': 'performance-level-badge good',
      'satisfactory': 'performance-level-badge average',
      'needs_improvement': 'performance-level-badge below',
      'poor': 'performance-level-badge poor'
    };
    
    return (
      <span className={colors[level] || colors.poor}>
        {(level || 'poor').replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <div className="header-top">
            <h1 className="dashboard-title">My Performance Dashboard</h1>
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2 className="loading-text">Loading Performance Data...</h2>
          <p className="loading-subtext">Please wait while we fetch your performance information.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <div className="header-top">
            <h1 className="dashboard-title">My Performance Dashboard</h1>
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="error-container">
          <h2 className="error-title">Error Loading Data</h2>
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={fetchData}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <div className="header-top">
            <h1 className="dashboard-title">My Performance Dashboard</h1>
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3 className="empty-title">No Performance Data Available</h3>
          <p className="empty-description">
            Performance data will be available once you start working and completing tasks.
          </p>
          <button className="calculate-button" onClick={fetchData}>Refresh</button>
        </div>
      </div>
    );
  }

  const overallScore = calculateOverallScore();

  return (
    <div className="performance-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-top">
          <h1 className="dashboard-title">My Performance Dashboard</h1>
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {/* User Info */}
        {userInfo && (
          <div className="user-info-section">
            <h2 className="user-greeting">Hello, {userInfo.name || userInfo.username}!</h2>
            <div className="user-details">
              <span><strong>Department:</strong> {userInfo.department || 'Not Set'}</span>
              <span><strong>Job Title:</strong> {userInfo.jobTitle || 'Not Set'}</span>
            </div>
            
            {/* NEW: Status Indicators */}
            <div className="status-indicators">
              {getPerformanceLevelBadge(data.performanceLevel)}
              {getRiskBadge(data.riskLevel)}
              {getWarningBadge(data.warningLevel, data.hasActiveWarnings)}
              {data.grade && (
                <span className={`grade-badge ${getScoreClass(overallScore)}`}>
                  Grade: {data.grade}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Period Selection */}
        <div className="dashboard-controls">
          <div className="control-group">
            <label className="control-label">Month:</label>
            <select 
              className="control-select"
              value={month} 
              onChange={(e) => setMonth(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label className="control-label">Year:</label>
            <select 
              className="control-select"
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const yearOption = new Date().getFullYear() - 2 + i;
                return (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* NEW: Alert Notifications */}
        {(alerts.lowPerformance || alerts.attendanceIssue || alerts.taskDelay || alerts.improvementRequired || data.hasActiveWarnings) && (
          <div className="alert-notifications">
            {alerts.lowPerformance && (
              <div className="alert-item critical">
                🚨 Performance Alert: Your overall performance is below expectations. Please review improvement areas.
              </div>
            )}
            {alerts.attendanceIssue && (
              <div className="alert-item warning">
                ⚠️ Attendance Alert: Your attendance rate needs improvement to meet company standards.
              </div>
            )}
            {alerts.taskDelay && (
              <div className="alert-item warning">
                📋 Task Alert: Focus on completing assigned tasks on time to improve your performance rating.
              </div>
            )}
            {data.hasActiveWarnings && (
              <div className="alert-item danger">
                🚫 Active Warning: You have {data.warningsCount || 1} active warning(s). Please acknowledge and take corrective action.
                <button 
                  className="alert-action-btn"
                  onClick={() => setView('warnings')}
                >
                  View Warnings
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW: Navigation Tabs */}
      <div className="navigation-tabs">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${view === 'performance' ? 'active' : ''}`}
            onClick={() => setView('performance')}
          >
            📊 Performance
          </button>
          <button 
            className={`tab-button ${view === 'warnings' ? 'active' : ''} ${data.hasActiveWarnings ? 'has-notification' : ''}`}
            onClick={() => setView('warnings')}
          >
            ⚠️ Warnings {data.hasActiveWarnings && `(${data.warningsCount || 1})`}
          </button>
          <button 
            className={`tab-button ${view === 'achievements' ? 'active' : ''}`}
            onClick={() => setView('achievements')}
          >
            🏆 Achievements {achievements.length > 0 && `(${achievements.length})`}
          </button>
          <button 
            className={`tab-button ${view === 'goals' ? 'active' : ''}`}
            onClick={() => setView('goals')}
          >
            🎯 Goals {goals.length > 0 && `(${goals.length})`}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        {/* Performance View (EXISTING - ENHANCED) */}
        {view === 'performance' && (
          <div>
            {/* Overall Performance Score */}
            <div className="overall-performance-section">
              <h2 className="content-title">Overall Performance Score</h2>
              <div className="overall-score-card">
                <div className={getCardValueClass(overallScore)}>
                  {overallScore}/100
                </div>
                <div className={`grade-display ${getScoreClass(overallScore)}`}>
                  Grade: {getGrade(overallScore)}
                </div>
                <p className="performance-level">
                  <strong>Performance Level:</strong> {getStatusText(overallScore)}
                </p>
                {/* NEW: Enhanced metrics */}
                <div className="enhanced-metrics">
                  {data.activeIssuesCount > 0 && (
                    <div className="metric-item warning">
                      <span className="metric-label">Active Issues:</span>
                      <span className="metric-value">{data.activeIssuesCount}</span>
                    </div>
                  )}
                  {data.goalsCompletionRate !== undefined && (
                    <div className="metric-item">
                      <span className="metric-label">Goals Progress:</span>
                      <span className="metric-value">{data.goalsCompletionRate}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Breakdown (EXISTING - UNCHANGED) */}
            <div className="performance-breakdown">
              <h2 className="content-title">Performance Breakdown</h2>
              
              {/* Summary Cards */}
              <div className="summary-cards">
                <div className="summary-card">
                  <h3 className="card-title">Attendance Score</h3>
                  <div className={getCardValueClass(data.attendanceScore || 0)}>
                    {data.attendanceScore || 0}%
                  </div>
                  <span className={getStatusBadgeClass(data.attendanceScore || 0)}>
                    {getStatusText(data.attendanceScore || 0)}
                  </span>
                </div>
                
                <div className="summary-card">
                  <h3 className="card-title">Task Completion</h3>
                  <div className={getCardValueClass(data.taskCompletionRate || 0)}>
                    {data.taskCompletionRate || 0}%
                  </div>
                  <span className={getStatusBadgeClass(data.taskCompletionRate || 0)}>
                    {getStatusText(data.taskCompletionRate || 0)}
                  </span>
                </div>
                
                <div className="summary-card">
                  <h3 className="card-title">Punctuality Score</h3>
                  <div className={getCardValueClass(data.punctualityScore || 0)}>
                    {data.punctualityScore || 0}%
                  </div>
                  <span className={getStatusBadgeClass(data.punctualityScore || 0)}>
                    {getStatusText(data.punctualityScore || 0, 'punctuality')}
                  </span>
                </div>
                
                <div className="summary-card">
                  <h3 className="card-title">Working Hours</h3>
                  <div className="card-value excellent">
                    {data.totalWorkingHours || 0}h
                  </div>
                  <span className="status-badge status-excellent">
                    This Month
                  </span>
                </div>
              </div>

              {/* Detailed Metrics Tables (EXISTING - UNCHANGED) */}
              <div className="metrics-tables">
                <div className="metrics-section">
                  <h3 className="content-title">Attendance Metrics</h3>
                  <table className="performance-table">
                    <tbody>
                      <tr>
                        <td><strong>Attendance Score</strong></td>
                        <td>
                          <span className={`score-display ${getScoreClass(data.attendanceScore || 0)}`}>
                            {data.attendanceScore || 0}%
                          </span>
                        </td>
                        <td>{getStatusText(data.attendanceScore || 0)}</td>
                      </tr>
                      <tr>
                        <td><strong>Punctuality Score</strong></td>
                        <td>
                          <span className={`score-display ${getScoreClass(data.punctualityScore || 0)}`}>
                            {data.punctualityScore || 0}%
                          </span>
                        </td>
                        <td>{getStatusText(data.punctualityScore || 0, 'punctuality')}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Working Hours</strong></td>
                        <td><strong>{data.totalWorkingHours || 0}h</strong></td>
                        <td>This month</td>
                      </tr>
                      <tr>
                        <td><strong>Late Arrivals</strong></td>
                        <td><strong>{data.lateArrivals || 0}</strong></td>
                        <td>{data.lateArrivals === 0 ? 'Perfect!' : 'Try to improve'}</td>
                      </tr>
                      <tr>
                        <td><strong>Absences</strong></td>
                        <td><strong>{data.absences || 0}</strong></td>
                        <td>{data.absences === 0 ? 'Perfect!' : 'Days absent'}</td>
                      </tr>
                      <tr>
                        <td><strong>Present Days</strong></td>
                        <td><strong>{data.presentDays || 0}</strong></td>
                        <td>Out of {data.totalWorkDays || 0} work days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="metrics-section">
                  <h3 className="content-title">Task Performance</h3>
                  <table className="performance-table">
                    <tbody>
                      <tr>
                        <td><strong>Task Completion Rate</strong></td>
                        <td>
                          <span className={`score-display ${getScoreClass(data.taskCompletionRate || 0)}`}>
                            {data.taskCompletionRate || 0}%
                          </span>
                        </td>
                        <td>{getStatusText(data.taskCompletionRate || 0)}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Tasks Assigned</strong></td>
                        <td><strong>{data.totalTasks || 0}</strong></td>
                        <td>This month</td>
                      </tr>
                      <tr>
                        <td><strong>Completed Tasks</strong></td>
                        <td><strong>{data.completedTasks || 0}</strong></td>
                        <td>Successfully finished</td>
                      </tr>
                      <tr>
                        <td><strong>Pending Tasks</strong></td>
                        <td><strong>{data.pendingTasks || 0}</strong></td>
                        <td>Still to do</td>
                      </tr>
                      <tr>
                        <td><strong>In Progress Tasks</strong></td>
                        <td><strong>{data.inProgressTasks || 0}</strong></td>
                        <td>Currently working on</td>
                      </tr>
                      <tr>
                        <td><strong>Average Task Rating</strong></td>
                        <td><strong>{data.averageTaskRating || 0}/5 ⭐</strong></td>
                        <td>
                          {data.averageTaskRating >= 4.5 ? 'Excellent' : 
                           data.averageTaskRating >= 4 ? 'Very Good' : 
                           data.averageTaskRating >= 3.5 ? 'Good' : 
                           data.averageTaskRating >= 3 ? 'Average' : 
                           data.averageTaskRating > 0 ? 'Needs Improvement' : 'No ratings yet'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Monthly Summary (EXISTING - UNCHANGED) */}
            <div className="monthly-summary">
              <h2 className="content-title">
                Monthly Summary - {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Score/Value</th>
                    <th>Status</th>
                    <th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Overall Performance</strong></td>
                    <td>
                      <span className={`score-display ${getScoreClass(overallScore)}`}>
                        {overallScore}/100 ({getGrade(overallScore)})
                      </span>
                    </td>
                    <td>{getStatusText(overallScore)}</td>
                    <td>Combined Score</td>
                  </tr>
                  <tr>
                    <td>Attendance</td>
                    <td>
                      <span className={`score-display ${getScoreClass(data.attendanceScore || 0)}`}>
                        {data.attendanceScore || 0}%
                      </span>
                    </td>
                    <td>{getStatusText(data.attendanceScore || 0)}</td>
                    <td>40% of total</td>
                  </tr>
                  <tr>
                    <td>Task Completion</td>
                    <td>
                      <span className={`score-display ${getScoreClass(data.taskCompletionRate || 0)}`}>
                        {data.taskCompletionRate || 0}%
                      </span>
                    </td>
                    <td>{getStatusText(data.taskCompletionRate || 0)}</td>
                    <td>40% of total</td>
                  </tr>
                  <tr>
                    <td>Punctuality</td>
                    <td>
                      <span className={`score-display ${getScoreClass(data.punctualityScore || 0)}`}>
                        {data.punctualityScore || 0}%
                      </span>
                    </td>
                    <td>{getStatusText(data.punctualityScore || 0, 'punctuality')}</td>
                    <td>20% of total</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Performance History (EXISTING - UNCHANGED) */}
            {historyData && historyData.length > 0 && (
              <div className="performance-history">
                <h2 className="content-title">Performance History (Last 6 Months)</h2>
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Attendance</th>
                      <th>Tasks</th>
                      <th>Punctuality</th>
                      <th>Working Hours</th>
                      <th>Overall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((record, index) => {
                      const overallHistoryScore = Math.round(
                        (record.attendanceScore * 0.4) + 
                        (record.taskCompletionRate * 0.4) + 
                        (record.punctualityScore * 0.2)
                      );
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
                              {overallHistoryScore} ({getGrade(overallHistoryScore)})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tips for Improvement (EXISTING - UNCHANGED) */}
            <div className="improvement-tips">
              <h2 className="content-title">Tips for Improvement</h2>
              <div className="tips-list">
                {data.attendanceScore < 90 && (
                  <div className="tip-card warning">
                    <strong>Attendance:</strong> Try to maintain regular attendance. Current: {data.attendanceScore}% - Aim for 95%+
                  </div>
                )}
                {data.punctualityScore < 95 && (
                  <div className="tip-card warning">
                    <strong>Punctuality:</strong> Arrive on time to improve your punctuality score. Current: {data.punctualityScore}% - Aim for 98%+
                  </div>
                )}
                {data.taskCompletionRate < 90 && (
                  <div className="tip-card warning">
                    <strong>Tasks:</strong> Focus on completing assigned tasks. Current: {data.taskCompletionRate}% - Aim for 95%+
                  </div>
                )}
                {data.averageTaskRating < 4 && data.averageTaskRating > 0 && (
                  <div className="tip-card warning">
                    <strong>Quality:</strong> Work on improving task quality. Current rating: {data.averageTaskRating}/5 - Aim for 4.5+
                  </div>
                )}
                {overallScore >= 90 && (
                  <div className="tip-card success">
                    <strong>Great Job!</strong> You're performing excellently. Keep up the good work!
                  </div>
                )}
                {overallScore >= 80 && overallScore < 90 && (
                  <div className="tip-card good">
                    <strong>Good Performance:</strong> You're doing well. Small improvements can make you excellent!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NEW: Warnings View */}
        {view === 'warnings' && (
          <div>
            <h2 className="content-title">Performance Warnings & Disciplinary Actions</h2>
            <h3 className="period-subtitle">
              Current Status: {data.hasActiveWarnings ? 
                `${data.warningsCount || 1} Active Warning(s) - ${data.warningLevel.replace('_', ' ').toUpperCase()}` :
                'No Active Warnings'
              }
            </h3>

            {warnings.hasActiveWarnings && warnings.disciplinaryActions && warnings.disciplinaryActions.length > 0 ? (
              <div className="warnings-section">
                <div className="warnings-summary">
                  <div className="summary-card warning">
                    <h3 className="card-title">Warning Level</h3>
                    <div className="card-value warning">
                      {warnings.warningLevel.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div className="summary-card danger">
                    <h3 className="card-title">Risk Level</h3>
                    <div className="card-value poor">
                      {warnings.riskLevel.toUpperCase()}
                    </div>
                  </div>
                  <div className="summary-card info">
                    <h3 className="card-title">Total Warnings</h3>
                    <div className="card-value below">
                      {warnings.warningsCount}
                    </div>
                  </div>
                </div>

                <div className="disciplinary-actions">
                  <h3 className="content-title">Disciplinary Actions</h3>
                  {warnings.disciplinaryActions.map((action, index) => (
                    <div key={index} className={`disciplinary-card ${action.type}`}>
                      <div className="disciplinary-header">
                        <h4>{action.type.replace('_', ' ').toUpperCase()}</h4>
                        <span className="disciplinary-date">
                          {new Date(action.effectiveDate).toLocaleDateString()}
                        </span>
                        {!action.acknowledgedByEmployee && (
                          <span className="acknowledgment-required">
                            Acknowledgment Required
                          </span>
                        )}
                      </div>
                      <div className="disciplinary-content">
                        <p><strong>Reason:</strong> {action.reason}</p>
                        {action.description && (
                          <p><strong>Details:</strong> {action.description}</p>
                        )}
                        {action.expiryDate && (
                          <p><strong>Expires:</strong> {new Date(action.expiryDate).toLocaleDateString()}</p>
                        )}
                        {action.acknowledgedByEmployee && (
                          <div className="acknowledgment-info">
                            <p><strong>Acknowledged:</strong> {new Date(action.acknowledgedAt).toLocaleDateString()}</p>
                            {action.employeeComments && (
                              <p><strong>Your Comments:</strong> {action.employeeComments}</p>
                            )}
                          </div>
                        )}
                      </div>
                      {!action.acknowledgedByEmployee && (
                        <div className="disciplinary-actions">
                          <button 
                            className="acknowledge-btn"
                            onClick={() => {
                              setSelectedWarning(action);
                              setShowAcknowledgeModal(true);
                            }}
                          >
                            Acknowledge Warning
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {warnings.performanceIssues && warnings.performanceIssues.length > 0 && (
                  <div className="performance-issues">
                    <h3 className="content-title">Active Performance Issues</h3>
                    {warnings.performanceIssues.map((issue, index) => (
                      <div key={index} className={`issue-card ${issue.severity}`}>
                        <h4>{issue.category.replace('_', ' ').toUpperCase()}</h4>
                        <p>{issue.description}</p>
                        <div className="issue-meta">
                          <span className={`severity-badge ${issue.severity}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="issue-date">
                            Reported: {new Date(issue.reportedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {warnings.improvementPlan && warnings.improvementPlan.isActive && (
                  <div className="improvement-plan-section">
                    <h3 className="content-title">Active Improvement Plan</h3>
                    <div className="improvement-plan-card">
                      <div className="plan-header">
                        <h4>Performance Improvement Plan</h4>
                        <span className="plan-duration">
                          {new Date(warnings.improvementPlan.startDate).toLocaleDateString()} - 
                          {new Date(warnings.improvementPlan.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="plan-objectives">
                        <h5>Objectives:</h5>
                        <ul>
                          {warnings.improvementPlan.objectives.map((obj, index) => (
                            <li key={index} className={obj.completed ? 'completed' : ''}>
                              {obj.description}
                              {obj.targetDate && (
                                <span className="objective-date">
                                  (Due: {new Date(obj.targetDate).toLocaleDateString()})
                                </span>
                              )}
                              {obj.completed && <span className="completed-badge">✓ Completed</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3 className="empty-title">No Active Warnings</h3>
                <p className="empty-description">
                  You have no active performance warnings or disciplinary actions. Keep up the good work!
                </p>
              </div>
            )}
          </div>
        )}

        {/* NEW: Achievements View */}
        {view === 'achievements' && (
          <div>
            <h2 className="content-title">My Achievements & Recognition</h2>
            <h3 className="period-subtitle">
              Total Achievements: {achievements.length}
            </h3>

            {achievements.length > 0 ? (
              <div className="achievements-section">
                <div className="achievements-grid">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="achievement-card">
                      <div className="achievement-header">
                        <h4>{achievement.title}</h4>
                        <span className="achievement-date">
                          {new Date(achievement.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="achievement-content">
                        <p>{achievement.description}</p>
                        <div className="achievement-meta">
                          <span className={`category-badge ${achievement.category || 'performance'}`}>
                            {(achievement.category || 'performance').replace('_', ' ').toUpperCase()}
                          </span>
                          {achievement.points > 0 && (
                            <span className="points-badge">
                              {achievement.points} Points
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏆</div>
                <h3 className="empty-title">No Achievements Yet</h3>
                <p className="empty-description">
                  Your achievements and recognition will appear here as you excel in your performance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NEW: Goals View */}
        {view === 'goals' && (
          <div>
            <h2 className="content-title">My Goals & Development</h2>
            <h3 className="period-subtitle">
              Goals Progress: {data.goalsCompletionRate || 0}% Complete
            </h3>

            {goals.length > 0 ? (
              <div className="goals-section">
                <div className="goals-summary">
                  <div className="summary-card info">
                    <h3 className="card-title">Total Goals</h3>
                    <div className="card-value excellent">{goals.length}</div>
                  </div>
                  <div className="summary-card success">
                    <h3 className="card-title">Completed</h3>
                    <div className="card-value excellent">
                      {goals.filter(g => g.status === 'completed').length}
                    </div>
                  </div>
                  <div className="summary-card warning">
                    <h3 className="card-title">In Progress</h3>
                    <div className="card-value average">
                      {goals.filter(g => g.status === 'in_progress').length}
                    </div>
                  </div>
                  <div className="summary-card danger">
                    <h3 className="card-title">Overdue</h3>
                    <div className="card-value poor">
                      {goals.filter(g => g.status === 'overdue').length}
                    </div>
                  </div>
                </div>

                <div className="goals-list">
                  {goals.map((goal, index) => (
                    <div key={index} className={`goal-card ${goal.status}`}>
                      <div className="goal-header">
                        <h4>{goal.title}</h4>
                        <span className={`status-badge goal-${goal.status}`}>
                          {goal.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="goal-content">
                        <p>{goal.description}</p>
                        <div className="goal-progress">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{width: `${goal.currentProgress || 0}%`}}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {goal.currentProgress || 0}% of {goal.target}
                          </span>
                        </div>
                        <div className="goal-meta">
                          <span className={`category-badge ${goal.category || 'productivity'}`}>
                            {(goal.category || 'productivity').replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`priority-badge ${goal.priority || 'medium'}`}>
                            {(goal.priority || 'medium').toUpperCase()}
                          </span>
                          {goal.deadline && (
                            <span className="deadline-badge">
                              Due: {new Date(goal.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {goal.milestones && goal.milestones.length > 0 && (
                          <div className="goal-milestones">
                            <h5>Milestones:</h5>
                            <ul>
                              {goal.milestones.map((milestone, mIndex) => (
                                <li key={mIndex} className={milestone.completed ? 'completed' : ''}>
                                  {milestone.description}
                                  {milestone.completed && <span className="completed-badge">✓</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <h3 className="empty-title">No Goals Set</h3>
                <p className="empty-description">
                  Your performance goals and development objectives will appear here when set by your supervisor.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW: Acknowledge Warning Modal */}
      {showAcknowledgeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Acknowledge Warning</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowAcknowledgeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {selectedWarning && (
                <div className="warning-details">
                  <h4>{selectedWarning.type.replace('_', ' ').toUpperCase()}</h4>
                  <p><strong>Reason:</strong> {selectedWarning.reason}</p>
                  <p><strong>Date:</strong> {new Date(selectedWarning.effectiveDate).toLocaleDateString()}</p>
                  {selectedWarning.description && (
                    <p><strong>Details:</strong> {selectedWarning.description}</p>
                  )}
                </div>
              )}
              <div className="form-group">
                <label>Your Comments (Optional):</label>
                <textarea
                  value={acknowledgeForm.comments}
                  onChange={(e) => setAcknowledgeForm({...acknowledgeForm, comments: e.target.value})}
                  placeholder="Add any comments or explanations..."
                  rows="4"
                />
              </div>
              <div className="acknowledgment-notice">
                <p><strong>Please note:</strong> By acknowledging this warning, you confirm that you have read and understood the disciplinary action. This acknowledgment will be recorded in your personnel file.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-button secondary" 
                onClick={() => setShowAcknowledgeModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                className="modal-button primary" 
                onClick={acknowledgeWarning}
                disabled={actionLoading}
              >
                {actionLoading ? 'Acknowledging...' : 'Acknowledge Warning'}
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
        <p><strong>Data for:</strong> {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  );
};

export default UserPerformanceDashboard;