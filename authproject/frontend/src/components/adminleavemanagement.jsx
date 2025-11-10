import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './adminleave.css';

const AdminLeaveManagement = () => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState(null);
  const navigate = useNavigate();

  const API_BASE = 'http://localhost:5000';

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

  const leaveItemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: (index) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.5
      }
    })
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.2 }
    }
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    
    if (!adminToken) {
      alert('Admin access required');
      navigate('/admin/login');
      return;
    }

    fetchPendingLeaves();
  }, [navigate]);

  const fetchPendingLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/api/auth/attendance/admin/pending-leaves`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const leavesWithUserDetails = await Promise.all(
          data.pendingLeaves.map(async (leave) => {
            try {
              const userResponse = await fetch(`${API_BASE}/api/auth/users`, {
                headers: {
                  'Authorization': `Bearer ${adminToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (userResponse.ok) {
                const userData = await userResponse.json();
                const user = userData.users.find(u => u.id === leave.userId);
                return {
                  ...leave,
                  userDetails: user || { username: leave.username, email: leave.email }
                };
              }
              return {
                ...leave,
                userDetails: { username: leave.username, email: leave.email }
              };
            } catch (err) {
              console.error('Error fetching user details:', err);
              return {
                ...leave,
                userDetails: { username: leave.username, email: leave.email }
              };
            }
          })
        );
        
        setPendingLeaves(leavesWithUserDetails);
      } else {
        setError(data.message || 'Failed to fetch pending leaves');
      }
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
      setError(`Failed to fetch pending leaves: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (leaveId, isApproved) => {
    try {
      setProcessingId(leaveId);
      setError(null);
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/api/auth/attendance/admin/approve-leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendanceId: leaveId,
          isApproved: isApproved,
          approvalNotes: approvalNotes.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        setPendingLeaves(prev => prev.filter(leave => leave._id !== leaveId));
        setShowApprovalModal(false);
        setSelectedLeave(null);
        setApprovalNotes('');
        setApprovalAction(null);
      } else {
        alert(data.message || 'Failed to process leave request');
      }
    } catch (error) {
      console.error('Error processing leave:', error);
      setError(`Failed to process leave request: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const openApprovalModal = (leave, action) => {
    setSelectedLeave(leave);
    setApprovalAction(action);
    setShowApprovalModal(true);
    setApprovalNotes('');
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedLeave(null);
    setApprovalNotes('');
    setApprovalAction(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="alm-container">
      <motion.div 
        className="alm-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="alm-header" variants={itemVariants}>
          <h1 className="alm-title">Leave Management</h1>
          <div className="alm-header-buttons">
            <motion.button
              className="alm-refresh-btn"
              onClick={fetchPendingLeaves}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Refresh
            </motion.button>
            <motion.button
              className="alm-back-btn"
              onClick={() => navigate('/admin/dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back to Dashboard
            </motion.button>
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="alm-error-alert"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary */}
        <motion.div className="alm-summary-card" variants={itemVariants}>
          <h3 className="alm-summary-title">Pending Leave Requests</h3>
          <div className="alm-summary-count">
            {loading ? '...' : pendingLeaves.length}
          </div>
        </motion.div>

        {/* Pending Leaves List */}
        <motion.div className="alm-leaves-container" variants={itemVariants}>
          <div className="alm-leaves-header">
            Pending Leave Requests ({pendingLeaves.length})
          </div>

          {loading ? (
            <div className="alm-loading-state">
              <div>Loading pending leave requests...</div>
            </div>
          ) : pendingLeaves.length === 0 ? (
            <motion.div 
              className="alm-empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="alm-empty-state-icon">✅</div>
              <div className="alm-empty-state-title">No pending leave requests</div>
              <div className="alm-empty-state-subtitle">All leave requests have been processed</div>
            </motion.div>
          ) : (
            <div>
              <AnimatePresence>
                {pendingLeaves.map((leave, index) => (
                  <motion.div
                    key={leave._id}
                    className={`alm-leave-item ${index % 2 === 1 ? 'alm-leave-item-even' : ''}`}
                    variants={leaveItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    custom={index}
                    whileHover={{ backgroundColor: "rgba(102, 126, 234, 0.05)" }}
                  >
                    <div className="alm-leave-grid">
                      {/* Employee Info */}
                      <div className="alm-employee-info">
                        <div className="alm-employee-name">
                          {leave.userDetails?.username || leave.username || 'Unknown User'}
                        </div>
                        <div className="alm-employee-email">
                          {leave.userDetails?.email || leave.email || 'No email'}
                        </div>
                      </div>

                      {/* Leave Details */}
                      <div className="alm-leave-details">
                        <div className="alm-leave-date">
                          Leave Date: {formatDate(leave.date)}
                        </div>
                        <div className="alm-leave-type">
                          Type: {leave.leaveType ? leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1) : 'Not specified'}
                        </div>
                        <div className="alm-leave-applied">
                          Applied: {formatTime(leave.createdAt)}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="alm-status-section">
                        <div className="alm-status-badge">
                          PENDING APPROVAL
                        </div>
                      </div>
                    </div>

                    {/* Leave Reason */}
                    <div className="alm-leave-reason-card">
                      <div className="alm-reason-label">Reason:</div>
                      <div className="alm-reason-text">
                        {leave.leaveReason || leave.notes || 'No reason provided'}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="alm-action-buttons">
                      <motion.button
                        className={`alm-approve-btn ${processingId === leave._id ? 'alm-processing-btn' : ''}`}
                        onClick={() => openApprovalModal(leave, 'approve')}
                        disabled={processingId === leave._id}
                        whileHover={processingId !== leave._id ? { scale: 1.05 } : {}}
                        whileTap={processingId !== leave._id ? { scale: 0.95 } : {}}
                      >
                        {processingId === leave._id ? 'Processing...' : '✅ Approve'}
                      </motion.button>
                      <motion.button
                        className={`alm-reject-btn ${processingId === leave._id ? 'alm-processing-btn' : ''}`}
                        onClick={() => openApprovalModal(leave, 'reject')}
                        disabled={processingId === leave._id}
                        whileHover={processingId !== leave._id ? { scale: 1.05 } : {}}
                        whileTap={processingId !== leave._id ? { scale: 0.95 } : {}}
                      >
                        {processingId === leave._id ? 'Processing...' : '❌ Reject'}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Debug Info */}
        <motion.div className="alm-debug-info" variants={itemVariants}>
          <div>API Base: {API_BASE}</div>
          <div>Pending Leaves Count: {pendingLeaves.length}</div>
          <div>Loading: {loading ? 'Yes' : 'No'}</div>
        </motion.div>
      </motion.div>

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && selectedLeave && (
          <motion.div 
            className="alm-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeApprovalModal}
          >
            <motion.div 
              className="alm-modal-content"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="alm-modal-title">
                {approvalAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
              </h3>

              {/* Leave Details Summary */}
              <div className="alm-modal-summary">
                <div className="alm-summary-item">
                  <span className="alm-summary-label">Employee:</span>
                  <span className="alm-summary-value">{selectedLeave.userDetails?.username || selectedLeave.username}</span>
                </div>
                <div className="alm-summary-item">
                  <span className="alm-summary-label">Date:</span>
                  <span className="alm-summary-value">{formatDate(selectedLeave.date)}</span>
                </div>
                <div className="alm-summary-item">
                  <span className="alm-summary-label">Type:</span>
                  <span className="alm-summary-value">{selectedLeave.leaveType || 'Not specified'}</span>
                </div>
                <div className="alm-summary-item">
                  <span className="alm-summary-label">Reason:</span>
                  <span className="alm-summary-value">{selectedLeave.leaveReason || selectedLeave.notes || 'No reason provided'}</span>
                </div>
              </div>

              {/* Approval Notes */}
              <div className="alm-modal-form-group">
                <label className="alm-modal-label">
                  {approvalAction === 'approve' ? 'Approval Notes (Optional):' : 'Rejection Reason:'}
                </label>
                <textarea
                  className="alm-modal-textarea"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={approvalAction === 'approve' 
                    ? 'Add any notes for the approval...' 
                    : 'Please provide a reason for rejection...'}
                  rows="4"
                />
              </div>

              {/* Modal Buttons */}
              <div className="alm-modal-buttons">
                <motion.button
                  className="alm-modal-cancel-btn"
                  onClick={closeApprovalModal}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className={`alm-modal-confirm-btn ${
                    approvalAction === 'approve' ? 'alm-modal-confirm-approve' : 'alm-modal-confirm-reject'
                  } ${
                    approvalAction === 'reject' && !approvalNotes.trim() ? 'alm-modal-confirm-disabled' : ''
                  }`}
                  onClick={() => handleApproveReject(selectedLeave._id, approvalAction === 'approve')}
                  disabled={approvalAction === 'reject' && !approvalNotes.trim()}
                  whileHover={
                    !(approvalAction === 'reject' && !approvalNotes.trim()) ? { scale: 1.05 } : {}
                  }
                  whileTap={
                    !(approvalAction === 'reject' && !approvalNotes.trim()) ? { scale: 0.95 } : {}
                  }
                >
                  {approvalAction === 'approve' ? '✅ Approve Leave' : '❌ Reject Leave'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLeaveManagement;