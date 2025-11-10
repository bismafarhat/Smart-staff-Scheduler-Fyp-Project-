import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './AdminManageStaff.css';

const ManageStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'view', 'edit'
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const navigate = useNavigate();

  // CHANGE THIS TO YOUR PRODUCTION URL WHEN DEPLOYING
  const API_BASE = 'http://localhost:5000';
  // const API_BASE = 'https://staff-management-upgraded.onrender.com'; // For production

  const departments = [
    'Cleaning Staff',
    'Event Helpers',
    'Tea and Snack Staff', 
    'Maintenance Staff',
    'Outdoor Cleaners',
    'Office Helpers'
  ];

  useEffect(() => {
    checkAdminAuth();
    loadAllStaff();
  }, []);

  const checkAdminAuth = () => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      toast.error('Admin access required');
      navigate('/admin/login');
    }
  };

  const loadAllStaff = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.get(`${API_BASE}/api/admin/all-staff`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.success) {
        console.log('Loaded staff:', response.data.staff);
        setStaff(response.data.staff);
        
        // Show info about users without profiles
        if (response.data.withoutProfiles > 0) {
          toast.info(`${response.data.withoutProfiles} user(s) don't have complete profiles yet`, {
            autoClose: 5000
          });
        }
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error(error.response?.data?.message || 'Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (staffMember) => {
    console.log('Viewing staff member:', staffMember);
    setSelectedStaff(staffMember);
    setViewMode('view');
  };

  const handleEdit = (staffMember) => {
    console.log('Editing staff member:', staffMember);
    setSelectedStaff(staffMember);
    
    // Prepare edit data with all fields
    setEditData({
      name: staffMember.name || staffMember.username,
      phone: staffMember.phone || '',
      department: staffMember.department || 'Office Helpers',
      jobTitle: staffMember.jobTitle || 'General Helper',
      shift: staffMember.shift || 'Morning',
      workingHours: {
        start: staffMember.workingHours?.start || '09:00',
        end: staffMember.workingHours?.end || '17:00'
      },
      skills: staffMember.skills || [],
      yearsWorked: staffMember.yearsWorked || 0,
      specialTraining: staffMember.specialTraining || [],
      shiftFlexibility: staffMember.shiftFlexibility || false,
      emergencyContact: {
        name: staffMember.emergencyContact?.name || '',
        relationship: staffMember.emergencyContact?.relationship || '',
        phone: staffMember.emergencyContact?.phone || ''
      },
      notes: staffMember.notes || ''
    });
    
    setViewMode('edit');
  };

  const handleDelete = async (staffMember) => {
    const confirmMessage = `Are you sure you want to delete ${staffMember.name || staffMember.username}? This will delete both the user account and profile. This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      // IMPORTANT: Use userId (_id), not profileId
      const deleteId = staffMember.userId || staffMember._id;
      
      console.log('Deleting staff with ID:', deleteId);
      
      const response = await axios.delete(`${API_BASE}/api/admin/staff/${deleteId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Staff member deleted successfully');
        loadAllStaff(); // Reload the list
        
        // If we're viewing this staff member, go back to list
        if (viewMode !== 'list') {
          setViewMode('list');
        }
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete staff member';
      toast.error(errorMsg);
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Validate required fields
      if (!editData.name || !editData.phone) {
        toast.error('Name and phone are required');
        return;
      }

      if (!editData.emergencyContact?.name || !editData.emergencyContact?.phone) {
        toast.error('Emergency contact information is required');
        return;
      }

      const adminToken = localStorage.getItem('adminToken');
      
      // IMPORTANT: Use userId (_id), not profileId
      const updateId = selectedStaff.userId || selectedStaff._id;
      
      console.log('Updating staff with ID:', updateId);
      console.log('Update data:', editData);
      
      const response = await axios.put(`${API_BASE}/api/admin/staff/${updateId}`, editData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.data.success) {
        toast.success(response.data.message || 'Staff information updated successfully');
        setViewMode('list');
        loadAllStaff();
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update staff information';
      toast.error(errorMsg);
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEditData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (type === 'checkbox') {
      setEditData(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Filter staff based on search and department
  const filteredStaff = staff.filter(member => {
    const matchesSearch = (member.name?.toLowerCase() || member.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (member.jobTitle?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || member.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="manage-staff">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading staff data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-staff">
      {viewMode === 'list' && (
        <>
          {/* Header */}
          <div className="staff-header">
            <h1>Manage Staff</h1>
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className="back-btn"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Search and Filter */}
          <div className="search-filter-section">
            <div>
              <label>Search Staff:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or job title..."
                className="search-input"
              />
            </div>

            <div>
              <label>Filter by Department:</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="filter-select"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Staff Count */}
          <div className="staff-count">
            <p>
              <strong>Total Staff:</strong> {filteredStaff.length} 
              {filteredStaff.length !== staff.length && ` (filtered from ${staff.length})`}
            </p>
            <p>
              <strong>With Complete Profiles:</strong> {filteredStaff.filter(s => s.hasProfile).length} | 
              <strong> Without Profiles:</strong> {filteredStaff.filter(s => !s.hasProfile).length}
            </p>
          </div>

          {/* Staff List */}
          <div className="table-container">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Job Title</th>
                  <th>Shift</th>
                  <th>Phone</th>
                  <th>Profile Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member._id}>
                    <td className="staff-name">
                      {member.name}
                      {!member.hasProfile && <span className="badge-incomplete"> (No Profile)</span>}
                    </td>
                    <td>{member.email || 'N/A'}</td>
                    <td>{member.department}</td>
                    <td>{member.jobTitle}</td>
                    <td>{member.shift}</td>
                    <td>{member.phone}</td>
                    <td>
                      {member.hasProfile ? (
                        <span className="badge-complete">Complete</span>
                      ) : (
                        <span className="badge-incomplete">Incomplete</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleView(member)}
                        className="action-btn btn-view"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(member)}
                        className="action-btn btn-edit"
                      >
                        {member.hasProfile ? 'Edit' : 'Create Profile'}
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="action-btn btn-delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredStaff.length === 0 && (
              <div className="empty-state">
                <p>No staff members found.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* View Mode */}
      {viewMode === 'view' && selectedStaff && (
        <div className="detail-view">
          <div className="detail-header">
            <h2>Staff Details: {selectedStaff.name}</h2>
            <button 
              onClick={() => setViewMode('list')}
              className="back-btn"
            >
              Back to List
            </button>
          </div>

          {!selectedStaff.hasProfile && (
            <div className="alert alert-warning">
              ⚠️ This user doesn't have a complete profile yet. You can create one by clicking "Edit Information" below.
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-section personal-info">
              <h3>Personal Information</h3>
              <p><strong>Name:</strong> {selectedStaff.name}</p>
              <p><strong>Username:</strong> {selectedStaff.username}</p>
              <p><strong>Email:</strong> {selectedStaff.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {selectedStaff.phone}</p>
              <p><strong>Years of Experience:</strong> {selectedStaff.yearsWorked}</p>
              <p><strong>Verified:</strong> {selectedStaff.verified ? '✅ Yes' : '❌ No'}</p>
            </div>

            <div className="detail-section job-info">
              <h3>Job Information</h3>
              <p><strong>Department:</strong> {selectedStaff.department}</p>
              <p><strong>Job Title:</strong> {selectedStaff.jobTitle}</p>
              <p><strong>Shift:</strong> {selectedStaff.shift}</p>
              <p><strong>Working Hours:</strong> {selectedStaff.workingHours?.start} - {selectedStaff.workingHours?.end}</p>
              <p><strong>Shift Flexibility:</strong> {selectedStaff.shiftFlexibility ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {selectedStaff.skills && selectedStaff.skills.length > 0 && (
            <div className="skills-container">
              <div className="detail-section skills-section">
                <h3>Skills</h3>
                <div className="skills-list">
                  {selectedStaff.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedStaff.emergencyContact && selectedStaff.emergencyContact.name !== 'Not Set' && (
            <div className="detail-section emergency-contact">
              <h3>Emergency Contact</h3>
              <p><strong>Name:</strong> {selectedStaff.emergencyContact.name}</p>
              <p><strong>Relationship:</strong> {selectedStaff.emergencyContact.relationship}</p>
              <p><strong>Phone:</strong> {selectedStaff.emergencyContact.phone}</p>
            </div>
          )}

          {selectedStaff.notes && (
            <div className="detail-section notes-section">
              <h3>Additional Notes</h3>
              <p>{selectedStaff.notes}</p>
            </div>
          )}

          <div className="detail-actions">
            <button
              onClick={() => handleEdit(selectedStaff)}
              className="detail-btn btn-primary"
            >
              {selectedStaff.hasProfile ? 'Edit Information' : 'Create Profile'}
            </button>
            <button
              onClick={() => handleDelete(selectedStaff)}
              className="detail-btn btn-danger"
            >
              Delete Staff Member
            </button>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {viewMode === 'edit' && selectedStaff && (
        <div className="edit-form">
          <div className="detail-header">
            <h2>{selectedStaff.hasProfile ? 'Edit' : 'Create'} Staff Profile: {selectedStaff.name}</h2>
            <button 
              onClick={() => setViewMode('list')}
              className="back-btn"
            >
              Cancel
            </button>
          </div>

          {!selectedStaff.hasProfile && (
            <div className="alert alert-info">
              ℹ️ Creating a new profile for this user. Fill in all required fields below.
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name: *</label>
                <input
                  type="text"
                  name="name"
                  value={editData.name || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone: *</label>
                <input
                  type="tel"
                  name="phone"
                  value={editData.phone || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department: *</label>
                <select
                  name="department"
                  value={editData.department || ''}
                  onChange={handleEditChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Job Title: *</label>
                <select
                  name="jobTitle"
                  value={editData.jobTitle || ''}
                  onChange={handleEditChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Job Title</option>
                  <option value="Classroom Cleaner">Classroom Cleaner</option>
                  <option value="Restroom Cleaner">Restroom Cleaner</option>
                  <option value="Floor Care Team">Floor Care Team</option>
                  <option value="Meeting Attendant">Meeting Attendant</option>
                  <option value="Event Setup Helper">Event Setup Helper</option>
                  <option value="Document Runner">Document Runner</option>
                  <option value="Tea Server">Tea Server</option>
                  <option value="Refreshment Helper">Refreshment Helper</option>
                  <option value="Key Handler">Key Handler</option>
                  <option value="Repair Technician">Repair Technician</option>
                  <option value="Waste Collector">Waste Collector</option>
                  <option value="Gardener">Gardener</option>
                  <option value="Outdoor Cleaner">Outdoor Cleaner</option>
                  <option value="Supply Assistant">Supply Assistant</option>
                  <option value="General Helper">General Helper</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Shift: *</label>
                <select
                  name="shift"
                  value={editData.shift || ''}
                  onChange={handleEditChange}
                  required
                  className="form-select"
                >
                  <option value="">Select Shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Years Worked:</label>
                <input
                  type="number"
                  name="yearsWorked"
                  value={editData.yearsWorked || 0}
                  onChange={handleEditChange}
                  min="0"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start Time: *</label>
                <input
                  type="time"
                  name="workingHours.start"
                  value={editData.workingHours?.start || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Time: *</label>
                <input
                  type="time"
                  name="workingHours.end"
                  value={editData.workingHours?.end || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <h3 className="section-title">Emergency Contact *</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Contact Name: *</label>
                <input
                  type="text"
                  name="emergencyContact.name"
                  value={editData.emergencyContact?.name || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Relationship: *</label>
                <input
                  type="text"
                  name="emergencyContact.relationship"
                  value={editData.emergencyContact?.relationship || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone: *</label>
                <input
                  type="tel"
                  name="emergencyContact.phone"
                  value={editData.emergencyContact?.phone || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Notes:</label>
              <textarea
                name="notes"
                value={editData.notes || ''}
                onChange={handleEditChange}
                rows="4"
                className="form-textarea"
                placeholder="Any additional notes about this staff member..."
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="form-btn btn-success"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setViewMode(selectedStaff.hasProfile ? 'view' : 'list')}
                className="form-btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ManageStaff;