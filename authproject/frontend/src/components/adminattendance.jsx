import React, { useState, useEffect } from 'react';

const AdminAttendanceDashboard = () => {
  const [todaySummary, setTodaySummary] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const API_BASE = 'http://localhost:5000';

  useEffect(() => {
    // Load initial data
    fetchTodaysSummary();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTodaysSummary();
      setLastRefresh(new Date());
    }, 30000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const fetchTodaysSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/api/auth/attendance/admin/today-summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTodaySummary(data.summary);
        setAttendanceData(data.attendance || []);
      } else {
        setError(data.message || 'Failed to fetch attendance summary');
      }
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      setError(`Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter attendance data based on search and status (excluding leave records)
  const filteredAttendance = attendanceData.filter(record => {
    // Exclude all leave records since we don't want leave management
    if (record.status === 'leave') return false;
    
    const matchesSearch = !searchTerm || 
      record.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatTime = (dateString) => {
    return dateString ? new Date(dateString).toLocaleTimeString() : '-';
  };

  const formatWorkingHours = (minutes) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#28a745';
      case 'late': return '#ffc107';
      case 'absent': return '#dc3545';
      case 'half-day': return '#6f42c1';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Staff Attendance Dashboard</h1>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            Last updated: {lastRefresh.toLocaleTimeString()} | Auto-refresh: 30s
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchTodaysSummary}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              if (window.location.hash) {
                window.location.hash = '/admin/dashboard';
              } else {
                window.history.back();
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{
        backgroundColor: error ? '#f8d7da' : (todaySummary ? '#d4edda' : '#fff3cd'),
        color: error ? '#721c24' : (todaySummary ? '#155724' : '#856404'),
        padding: '12px',
        borderRadius: '4px',
        marginBottom: '20px',
        border: `1px solid ${error ? '#f5c6cb' : (todaySummary ? '#c3e6cb' : '#ffeaa7')}`,
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '16px' }}>
          {error ? '❌' : (todaySummary ? '✅' : '⏳')}
        </span>
        <span>
          {error 
            ? `Connection Error: ${error}` 
            : (todaySummary 
              ? 'Attendance data loaded successfully' 
              : 'Loading attendance data...')
          }
        </span>
      </div>

      {/* Debug Information */}
      {error && (
        <div style={{
          backgroundColor: '#e2e3e5',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#495057'
        }}>
          <strong>Debug Information:</strong>
          <br />API Endpoint: {API_BASE}/api/auth/attendance/admin/today-summary
          <br />Error: {error}
          <br />Timestamp: {new Date().toISOString()}
          <br />
          <br /><strong>Troubleshooting:</strong>
          <br />1. Check if backend server is running on port 5000
          <br />2. Verify the route exists and authentication is removed
          <br />3. Check browser network tab for detailed error
        </div>
      )}

      {/* Summary Cards - Only show attendance-related stats */}
      {todaySummary && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '15px', 
          marginBottom: '30px' 
        }}>
          <div style={{ backgroundColor: '#e7f3ff', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#004085' }}>Total Staff</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
              {todaySummary.totalEmployees}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#d4edda', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>Present</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
              {todaySummary.present}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>Late Arrivals</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
              {todaySummary.late}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#f8d7da', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>Absent</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
              {todaySummary.absent}
            </div>
          </div>
          
          <div style={{ backgroundColor: '#d1ecf1', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Still Working</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#17a2b8' }}>
              {todaySummary.stillWorking}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '120px'
              }}
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half-day">Half Day</option>
            </select>
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            Showing {filteredAttendance.length} records
          </div>
        </div>
      </div>

      {/* Main Attendance Table */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Today's Attendance - {new Date().toLocaleDateString()}</h2>
        
        {filteredAttendance.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '18px' }}>
              {error ? 'Unable to load attendance data' : 
               searchTerm || statusFilter !== 'all' ? 'No matching records found' : 'No attendance data available'}
            </div>
            {error && (
              <div style={{ fontSize: '14px', marginTop: '10px', color: '#dc3545' }}>
                Please check the connection and try refreshing the page.
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Employee</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Check-in</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Check-out</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Working Hours</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.map((record, index) => (
                  <tr key={record._id} style={{ 
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <strong>{record.username}</strong>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {record.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{
                        color: record.checkIn?.time ? '#155724' : '#6c757d',
                        fontWeight: record.checkIn?.time ? 'bold' : 'normal'
                      }}>
                        {formatTime(record.checkIn?.time)}
                      </div>
                      {record.checkIn?.location && (
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {record.checkIn.location}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{
                        color: record.checkOut?.time ? '#721c24' : '#6c757d',
                        fontWeight: record.checkOut?.time ? 'bold' : 'normal'
                      }}>
                        {formatTime(record.checkOut?.time)}
                      </div>
                      {record.checkOut?.location && (
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {record.checkOut.location}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: record.workingHours > 0 ? '#495057' : '#6c757d' }}>
                        {formatWorkingHours(record.workingHours)}
                      </strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: getStatusColor(record.status) + '20',
                          color: getStatusColor(record.status),
                          border: `1px solid ${getStatusColor(record.status)}40`
                        }}>
                          {getStatusText(record.status)}
                        </span>
                        {!record.isManualEntry && record.status === 'absent' && (
                          <span style={{
                            padding: '2px 4px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: '#ffc107',
                            color: '#212529'
                          }}>
                            AUTO
                          </span>
                        )}
                        {record.checkIn?.time && !record.checkOut?.time && (
                          <span style={{
                            padding: '2px 4px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: '#17a2b8',
                            color: 'white'
                          }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      fontSize: '12px', 
                      color: '#6c757d', 
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={record.notes || record.absentReason}>
                      {record.absentReason || record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      {todaySummary && (
        <div style={{
          backgroundColor: '#e9ecef',
          padding: '15px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '15px',
          fontSize: '14px'
        }}>
          <div><strong>Attendance Rate:</strong> {todaySummary.attendanceRate || 0}%</div>
          <div><strong>Punctuality Rate:</strong> {todaySummary.insights?.punctualityRate || 0}%</div>
          <div><strong>Still Working:</strong> {todaySummary.stillWorking || 0}</div>
          <div><strong>Checked Out:</strong> {todaySummary.checkedOut || 0}</div>
          <div><strong>Auto-Absent:</strong> {todaySummary.autoAbsent || 0}</div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceDashboard;