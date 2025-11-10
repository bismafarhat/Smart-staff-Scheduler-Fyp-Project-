import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './AdminDashboard.css';

const EnhancedAdminDashboard = () => {
  const [adminProfile, setAdminProfile] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [serverWaking, setServerWaking] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState({
    totalEmployees: 0,
    activeSchedules: 0,
    pendingTasks: 0,
    unreadNotifications: 0,
    pendingLeaveRequests: 0,
    systemStatus: 'operational'
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const API_BASE = 'https://staff-management-upgraded.onrender.com';

  // Enhanced API call with retry logic for server sleep
  const makeEnhancedApiCall = useCallback(async (url, options = {}, maxRetries = 3) => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      throw new Error('No admin token found');
    }

    const config = {
      ...options,
      timeout: 45000,
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt === 1) {
          setServerWaking(true);
        }

        const response = await axios(url, config);
        setServerWaking(false);
        return response;

      } catch (error) {
        if (attempt === maxRetries) {
          setServerWaking(false);
          throw error;
        }

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 2000));
        } else if (error.response?.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          setServerWaking(false);
          throw error;
        }
      }
    }
  }, []);

  // Load today's attendance data
  const loadTodaysAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);
      
      // Try the no-auth endpoint first (since you removed auth from backend)
      const response = await fetch(`${API_BASE}/api/auth/attendance/admin/today-summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAttendanceData(data.summary);
        }
      } else {
        // Fallback to authenticated endpoint if the above fails
        const authResponse = await makeEnhancedApiCall(`${API_BASE}/api/auth/attendance/admin/today-summary`);
        if (authResponse.data.success) {
          setAttendanceData(authResponse.data.summary);
        }
      }
    } catch (error) {
      console.log('Failed to load attendance data:', error.message);
      // Set default values if loading fails
      setAttendanceData({
        totalEmployees: 0,
        present: 0,
        late: 0,
        absent: 0,
        stillWorking: 0,
        attendanceRate: 0
      });
    } finally {
      setAttendanceLoading(false);
    }
  }, [makeEnhancedApiCall]);

  // Enhanced auth verification
  const verifyAdminAuthentication = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        navigate('/admin-login');
        return;
      }

      // Token expiration check
      try {
        const tokenPayload = JSON.parse(atob(adminToken.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (tokenPayload.exp < currentTime) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          toast.warn('Session expired. Please log in again.');
          navigate('/admin-login');
          return;
        }
      } catch (tokenError) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        navigate('/admin-login');
        return;
      }

      const response = await makeEnhancedApiCall(`${API_BASE}/api/admin/profile`);

      if (response.data.success) {
        setAdminProfile(response.data.admin);
      } else {
        throw new Error('Invalid admin session');
      }
    } catch (error) {
      console.error('Admin auth verification failed:', error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        toast.error('Authentication failed. Please log in again.');
        navigate('/admin-login');
      } else {
        toast.error('Connection issue. Retrying...');
        setTimeout(() => {
          verifyAdminAuthentication();
        }, 5000);
      }
    } finally {
      setDashboardLoading(false);
    }
  }, [navigate, makeEnhancedApiCall]);

  // Load system metrics
  const loadSystemMetrics = useCallback(async () => {
    try {
      const metrics = {
        totalEmployees: 0,
        activeSchedules: 0,
        pendingTasks: 0,
        unreadNotifications: 0,
        pendingLeaveRequests: 0,
        systemStatus: 'operational'
      };

      // Sequential API calls to avoid overwhelming server
      try {
        const staffResponse = await makeEnhancedApiCall(`${API_BASE}/api/admin/all-staff`);
        if (staffResponse.data.success) {
          metrics.totalEmployees = staffResponse.data.staff?.length || 0;
        }
      } catch (error) {
        console.log('Failed to load staff metrics:', error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const leavesResponse = await makeEnhancedApiCall(`${API_BASE}/api/auth/attendance/admin/pending-leaves`);
        if (leavesResponse.data.success) {
          metrics.pendingLeaveRequests = leavesResponse.data.pendingLeaves?.length || 0;
        }
      } catch (error) {
        console.log('Failed to load leave metrics:', error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const tasksResponse = await makeEnhancedApiCall(`${API_BASE}/api/tasks/admin/all`);
        if (tasksResponse.data.success) {
          const tasks = tasksResponse.data.tasks || [];
          metrics.pendingTasks = tasks.filter(task => task.status === 'pending').length;
          metrics.activeSchedules = tasks.length;
        }
      } catch (error) {
        console.log('Failed to load task metrics:', error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const alertsResponse = await makeEnhancedApiCall(`${API_BASE}/api/alerts/admin/statistics`);
        if (alertsResponse.data.success) {
          metrics.unreadNotifications = alertsResponse.data.stats?.totals?.unread || 0;
        }
      } catch (error) {
        console.log('Failed to load notification metrics:', error.message);
      }

      setSystemMetrics(metrics);
    } catch (error) {
      console.error('Failed to load system metrics:', error);
      toast.error('Some dashboard data may be unavailable');
    }
  }, [makeEnhancedApiCall]);

  // Manual refresh function
  const handleDashboardRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        verifyAdminAuthentication(),
        loadSystemMetrics(),
        loadTodaysAttendance()
      ]);
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      await verifyAdminAuthentication();
      if (localStorage.getItem('adminToken')) {
        await Promise.all([
          loadSystemMetrics(),
          loadTodaysAttendance()
        ]);
      }
    };

    initializeDashboard();
  }, [verifyAdminAuthentication, loadSystemMetrics, loadTodaysAttendance]);

  // Session monitoring
  useEffect(() => {
    const sessionMonitor = setInterval(() => {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken && adminProfile) {
        try {
          const tokenPayload = JSON.parse(atob(adminToken.split('.')[1]));
          const currentTime = Date.now() / 1000;
          
          if (tokenPayload.exp < (currentTime + 1800)) {
            toast.warn('Your session will expire soon. Please save any work.');
          }
          
          if (tokenPayload.exp < currentTime) {
            handleAdminLogout();
          }
        } catch (error) {
          console.log('Token validation error:', error);
          handleAdminLogout();
        }
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(sessionMonitor);
  }, [adminProfile]);

  const handleAdminLogout = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');

      if (adminToken) {
        const logoutPromise = makeEnhancedApiCall(`${API_BASE}/api/admin/logout`, { method: 'POST' });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Logout timeout')), 5000)
        );

        try {
          await Promise.race([logoutPromise, timeoutPromise]);
        } catch (error) {
          console.log('Logout API call failed, but continuing with local logout');
        }
      }

      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      toast.success('Logged out successfully!');
      navigate('/admin-login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      navigate('/admin-login');
    }
  };

  // Management modules configuration
  const managementModules = [
    {
      moduleId: 'employee-management',
      moduleTitle: 'Employee Management',
      moduleIcon: '👥',
      moduleDescription: 'Comprehensive employee management system with advanced profile management, department organization, and detailed employee analytics.',
      moduleFeatures: ['Employee Profiles', 'Department Management', 'Advanced Search', 'Performance Tracking'],
      navigationRoute: '/admin-management-staff',
      accentColor: '#059669',
      isActive: true
    },
    {
      moduleId: 'schedule-coordination',
      moduleTitle: 'Schedule Coordination',
      moduleIcon: '📅',
      moduleDescription: 'Advanced scheduling system for managing work shifts, tracking hours, and optimizing workforce allocation across departments.',
      moduleFeatures: ['Shift Management', 'Bulk Scheduling', 'Time Tracking', 'Resource Optimization'],
      navigationRoute: '/admin/schedule',
      accentColor: '#0284c7',
      isActive: true
    },
    {
      moduleId: 'task-orchestration',
      moduleTitle: 'Task Orchestration',
      moduleIcon: '📋',
      moduleDescription: 'Sophisticated task management platform for assignment distribution, progress monitoring, and productivity analysis.',
      moduleFeatures: ['Task Assignment', 'Progress Analytics', 'Priority Management', 'Team Collaboration'],
      navigationRoute: '/admin/tasks',
      accentColor: '#ca8a04',
      isActive: true
    },
    {
      moduleId: 'quality-verification',
      moduleTitle: 'Quality Verification',
      moduleIcon: '🔍',
      moduleDescription: 'Secret verification system for quality assurance through blind checks. Assign 3-person verification teams to inspect completed work.',
      moduleFeatures: ['Blind Quality Checks', '3-Person Teams', 'Location Inspections', 'Quality Scoring'],
      navigationRoute: '/admin/verification',
      accentColor: '#6f42c1',
      isActive: true
    },
    {
      moduleId: 'leave-administration',
      moduleTitle: 'Leave Administration',
      moduleIcon: '🏖️',
      moduleDescription: 'Streamlined leave management system for processing requests, tracking attendance, and maintaining compliance records.',
      moduleFeatures: ['Request Processing', 'Attendance Analytics', 'Compliance Tracking', 'Report Generation'],
      navigationRoute: '/admin-leave-management',
      accentColor: '#7c3aed',
      isActive: true
    },
    {
      moduleId: 'communication-hub',
      moduleTitle: 'Communication Hub',
      moduleIcon: '📢',
      moduleDescription: 'Centralized communication platform for broadcasting announcements, managing notifications, and team messaging.',
      moduleFeatures: ['Broadcast Messages', 'Notification Center', 'Team Messaging', 'Communication Analytics'],
      navigationRoute: '/admin/alerts',
      accentColor: '#dc2626',
      isActive: true
    },
    {
      moduleId: 'analytics-dashboard',
      moduleTitle: 'Analytics Dashboard',
      moduleIcon: '📊',
      moduleDescription: 'Comprehensive analytics platform with detailed reporting, data visualization, and business intelligence tools.',
      moduleFeatures: ['Performance Reports', 'Data Visualization', 'Business Intelligence', 'Custom Analytics'],
      navigationRoute: '/admin/performance',
      accentColor: '#0891b2',
      isActive: true
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  if (dashboardLoading) {
    return (
      <div className="enhanced-admin-dashboard">
        <div className="dashboard-loading-container">
          <motion.div 
            className="dashboard-loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <div className="dashboard-loading-text">
            {serverWaking ? 'Waking up server... This may take 30-60 seconds' : 'Initializing Dashboard...'}
          </div>
          {serverWaking && (
            <div className="server-status-notification">
              <p>The server was asleep and is now starting up.</p>
              <p>Please wait while we establish connection...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="enhanced-admin-dashboard">
        <div className="dashboard-loading-container">
          <div className="dashboard-loading-text">Redirecting to Authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-admin-dashboard">
      <motion.div 
        className="dashboard-main-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Server Status Banner */}
        <AnimatePresence>
          {serverWaking && (
            <motion.div 
              className="server-status-banner"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
            >
              🔄 Server is waking up... Some features may load slowly
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Header Section */}
        <motion.header className="dashboard-executive-header" variants={itemVariants}>
          <div className="header-primary-content">
            <div className="header-title-section">
              <h1 className="dashboard-main-title">Executive Dashboard</h1>
              <p className="dashboard-subtitle">Staff Management Control Center</p>
            </div>
            <div className="header-actions-section">
              <motion.button 
                className="dashboard-refresh-button"
                onClick={handleDashboardRefresh}
                disabled={refreshing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {refreshing ? '🔄' : '↻'} Refresh
              </motion.button>
            </div>
          </div>
          <div className="header-admin-profile">
            <div className="admin-profile-card">
              <div className="profile-avatar">
                {adminProfile.username.charAt(0).toUpperCase()}
              </div>
              <div className="profile-information">
                <h3 className="profile-name">Welcome, {adminProfile.username}</h3>
                <p className="profile-role">Administrator • {adminProfile.role}</p>
                <p className="profile-email">{adminProfile.email}</p>
                <p className="profile-session">
                  Last Login: {adminProfile.lastLogin ? new Date(adminProfile.lastLogin).toLocaleDateString() : 'First Session'}
                </p>
              </div>
              <motion.button 
                className="profile-logout-button"
                onClick={handleAdminLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign Out
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Enhanced System Metrics */}
        <motion.section className="system-metrics-overview" variants={itemVariants}>
          <div className="metrics-grid">
            <motion.div 
              className="metric-card employees"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="metric-icon-container">
                <span className="metric-icon">👥</span>
              </div>
              <div className="metric-data">
                <div className="metric-value">{systemMetrics.totalEmployees}</div>
                <div className="metric-label">Total Employees</div>
                <div className="metric-status active">Active Personnel</div>
              </div>
            </motion.div>
            
            <motion.div 
              className="metric-card schedules"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="metric-icon-container">
                <span className="metric-icon">📅</span>
              </div>
              <div className="metric-data">
                <div className="metric-value">{systemMetrics.activeSchedules}</div>
                <div className="metric-label">Active Schedules</div>
                <div className="metric-status operational">Currently Running</div>
              </div>
            </motion.div>
            
            <motion.div 
              className="metric-card tasks"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="metric-icon-container">
                <span className="metric-icon">📋</span>
              </div>
              <div className="metric-data">
                <div className="metric-value">{systemMetrics.pendingTasks}</div>
                <div className="metric-label">Pending Tasks</div>
                <div className="metric-status attention">Require Attention</div>
              </div>
            </motion.div>
            
            <motion.div 
              className="metric-card notifications"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="metric-icon-container">
                <span className="metric-icon">📢</span>
              </div>
              <div className="metric-data">
                <div className="metric-value">{systemMetrics.unreadNotifications}</div>
                <div className="metric-label">Notifications</div>
                <div className="metric-status review">Awaiting Review</div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Enhanced Quick Actions */}
        <motion.section className="executive-quick-actions" variants={itemVariants}>
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-matrix">
            <motion.button 
              className="quick-action-card primary-action"
              onClick={() => navigate('/admin-management-staff')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="action-icon">👥</span>
              <span className="action-text">Manage Employees</span>
            </motion.button>
            
            <motion.button 
              className="quick-action-card success-action"
              onClick={() => navigate('/admin/schedule')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="action-icon">📅</span>
              <span className="action-text">Create Schedule</span>
            </motion.button>
            
            <motion.button 
              className="quick-action-card warning-action"
              onClick={() => navigate('/admin-leave-management')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="action-icon">🏖️</span>
              <span className="action-text">Review Leaves ({systemMetrics.pendingLeaveRequests})</span>
            </motion.button>
            
            <motion.button 
              className="quick-action-card alert-action"
              onClick={() => navigate('/admin/alerts')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="action-icon">📢</span>
              <span className="action-text">Send Alert</span>
            </motion.button>
          </div>
        </motion.section>

        {/* Enhanced Management Modules */}
        <motion.section className="management-modules-grid" variants={itemVariants}>
          <div className="modules-container">
            {/* Today's Attendance Module */}
            <motion.div 
              className="management-module-card"
              onClick={() => navigate('/admin/attendance')}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
              style={{ cursor: 'pointer' }}
            >
              <div className="module-header-section">
                <div 
                  className="module-icon-badge"
                  style={{ backgroundColor: '#0ea5e915', color: '#0ea5e9' }}
                >
                  📊
                </div>
                <h3 className="module-title">Today's Attendance</h3>
              </div>
              
              <p className="module-description">Real-time staff attendance monitoring and tracking system for comprehensive workforce management and productivity analysis.</p>
              
              <div className="module-features-section">
                <h4 className="features-title">Core Features</h4>
                <div className="feature-tags-grid">
                  <span className="feature-tag">Attendance Overview</span>
                  <span className="feature-tag">Real-time Updates</span>
                  <span className="feature-tag">Staff Status</span>
                  <span className="feature-tag">Daily Reports</span>
                </div>
              </div>
              
              <motion.button 
                className="module-access-button"
                style={{ 
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0ea5e9dd 100%)' 
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                VIEW ATTENDANCE
              </motion.button>
            </motion.div>

            {managementModules.map((module, index) => (
              <motion.div 
                key={module.moduleId}
                className="management-module-card"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300 }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="module-header-section">
                  <div 
                    className="module-icon-badge"
                    style={{ backgroundColor: `${module.accentColor}15`, color: module.accentColor }}
                  >
                    {module.moduleIcon}
                  </div>
                  <h3 className="module-title">{module.moduleTitle}</h3>
                </div>
                
                <p className="module-description">{module.moduleDescription}</p>
                
                <div className="module-features-section">
                  <h4 className="features-title">Core Features</h4>
                  <div className="feature-tags-grid">
                    {module.moduleFeatures.map((feature, featureIndex) => (
                      <span key={featureIndex} className="feature-tag">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <motion.button 
                  className="module-access-button"
                  onClick={() => navigate(module.navigationRoute)}
                  style={{ 
                    background: `linear-gradient(135deg, ${module.accentColor} 0%, ${module.accentColor}dd 100%)` 
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Access {module.moduleTitle.replace(' Management', '').replace(' Administration', '').replace(' Hub', '').replace(' Dashboard', '')}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Enhanced System Health Monitor */}
        <motion.section className="system-health-monitor" variants={itemVariants}>
          <h2 className="section-title">System Health Monitor</h2>
          <div className="health-indicators-grid">
            <div className="health-indicator">
              <div className={`indicator-status ${serverWaking ? 'warning' : 'operational'}`}></div>
              <div className="indicator-details">
                <div className="indicator-name">API Gateway</div>
                <div className="indicator-value">{serverWaking ? 'Starting' : 'Operational'}</div>
              </div>
            </div>
            
            <div className="health-indicator">
              <div className="indicator-status operational"></div>
              <div className="indicator-details">
                <div className="indicator-name">Database</div>
                <div className="indicator-value">Connected</div>
              </div>
            </div>
            
            <div className="health-indicator">
              <div className="indicator-status operational"></div>
              <div className="indicator-details">
                <div className="indicator-name">Authentication</div>
                <div className="indicator-value">Secure</div>
              </div>
            </div>
            
            <div className="health-indicator">
              <div className="indicator-status warning"></div>
              <div className="indicator-details">
                <div className="indicator-name">Notifications</div>
                <div className="indicator-value">Processing</div>
              </div>
            </div>
            
            <div className="health-indicator">
              <div className="indicator-status operational"></div>
              <div className="indicator-details">
                <div className="indicator-name">File Storage</div>
                <div className="indicator-value">Available</div>
              </div>
            </div>
            
            <div className="health-indicator">
              <div className="indicator-status operational"></div>
              <div className="indicator-details">
                <div className="indicator-name">Backup System</div>
                <div className="indicator-value">Current</div>
              </div>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default EnhancedAdminDashboard;