"use client";
import React, { useState } from 'react';
import { Drawer } from '@mui/material';
import { X, ChevronLeft, ChevronRight, CheckCircle2, FileText, Users, UserPlus } from 'lucide-react';
import './TaskCreateDrawer.scss';

// Step 1: Task Details Component
const TaskDetailsStep = ({ formData, onChange, errors }) => {
  return (
    <div className="step-content">
      <div className="step-header">
        <FileText className="step-icon" />
        <div>
          <h3>Task Information</h3>
          <p>Enter the basic details about this task</p>
        </div>
      </div>

      <div className="form-section">
        <div className="form-group">
          <label className="form-label required">Task Type</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="type"
                value="task"
                checked={formData.type === 'task'}
                onChange={(e) => onChange('type', e.target.value)}
              />
              <span>Task</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="type"
                value="enquiry"
                checked={formData.type === 'enquiry'}
                onChange={(e) => onChange('type', e.target.value)}
              />
              <span>Enquiry</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label required">Service Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Tax Filing, GST Registration"
            value={formData.particulars?.name || ''}
            onChange={(e) => onChange('particulars.name', e.target.value)}
          />
          {errors.particularsName && <span className="error-text">{errors.particularsName}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Tax, Legal, Compliance"
            value={formData.particulars?.category || ''}
            onChange={(e) => onChange('particulars.category', e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={formData.lifecycle?.priority || 'normal'}
              onChange={(e) => onChange('lifecycle.priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.dates?.startDate || ''}
              onChange={(e) => onChange('dates.startDate', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.dates?.dueDate || ''}
              onChange={(e) => onChange('dates.dueDate', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description / Remarks</label>
          <textarea
            className="form-textarea"
            rows="4"
            placeholder="Add any additional details or instructions..."
            value={formData.particulars?.remarks || ''}
            onChange={(e) => onChange('particulars.remarks', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Internal Tags</label>
          <input
            type="text"
            className="form-input"
            placeholder="Add tags separated by commas"
            value={formData.particulars?.internalTags?.join(', ') || ''}
            onChange={(e) => onChange('particulars.internalTags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          />
        </div>
      </div>
    </div>
  );
};

// Step 2: Client Selection Component
const ClientSelectionStep = ({ formData, onChange }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([
    { id: '1', firstName: 'John', lastName: 'Doe', phoneNumber: '+919876543210', email: 'john@example.com' },
    { id: '2', firstName: 'Jane', lastName: 'Smith', phoneNumber: '+919876543211', email: 'jane@example.com' },
  ]);

  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: ''
  });

  const handleSelectClient = (client) => {
    onChange('client', {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phoneNumber
    });
  };

  const handleCreateNewClient = () => {
    // Mock API call - will be replaced with actual API
    const client = {
      id: 'new_' + Date.now(),
      name: `${newClient.firstName} ${newClient.lastName}`,
      phone: newClient.phoneNumber
    };
    onChange('client', client);
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <Users className="step-icon" />
        <div>
          <h3>Link to Client</h3>
          <p>Search for an existing client or create a new one</p>
        </div>
      </div>

      {formData.client?.id && (
        <div className="selected-client">
          <CheckCircle2 className="check-icon" />
          <div className="client-info">
            <strong>{formData.client.name}</strong>
            <span>{formData.client.phone}</span>
          </div>
          <button className="btn-icon" onClick={() => onChange('client', null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {!formData.client?.id && (
        <>
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Search Existing
            </button>
            <button
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Create New
            </button>
          </div>

          {activeTab === 'search' && (
            <div className="tab-content">
              <div className="search-box">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="client-list">
                {searchResults.map(client => (
                  <div
                    key={client.id}
                    className="client-card"
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className="client-avatar">
                      {client.firstName[0]}{client.lastName[0]}
                    </div>
                    <div className="client-details">
                      <strong>{client.firstName} {client.lastName}</strong>
                      <span>{client.phoneNumber}</span>
                      {client.email && <span className="email">{client.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="tab-content">
              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">First Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newClient.firstName}
                      onChange={(e) => setNewClient({...newClient, firstName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newClient.lastName}
                      onChange={(e) => setNewClient({...newClient, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91XXXXXXXXXX"
                    value={newClient.phoneNumber}
                    onChange={(e) => setNewClient({...newClient, phoneNumber: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="client@example.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  />
                </div>

                <button
                  className="btn-primary"
                  onClick={handleCreateNewClient}
                  disabled={!newClient.firstName || !newClient.lastName || !newClient.phoneNumber}
                >
                  <UserPlus size={16} />
                  Create & Link Client
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Step 3: Team Assignment Component
const TeamAssignmentStep = ({ formData, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers] = useState([
    { id: 'U001', name: 'Mayad Ahmed', role: 'superAdmin', department: 'Management' },
    { id: 'U002', name: 'Tanvir Saimon', role: 'financeManager', department: 'Finance' },
    { id: 'U003', name: 'Sarah Johnson', role: 'teamMember', department: 'Operations' },
  ]);

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = (member) => {
    onChange('assignment', {
      assignedToId: member.id,
      assignedToName: member.name
    });
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <Users className="step-icon" />
        <div>
          <h3>Assign Team Member</h3>
          <p>Choose who will be responsible for this task</p>
        </div>
      </div>

      {formData.assignment?.assignedToId && (
        <div className="selected-assignee">
          <CheckCircle2 className="check-icon" />
          <div className="assignee-info">
            <strong>{formData.assignment.assignedToName}</strong>
            <span>Assigned</span>
          </div>
          <button className="btn-icon" onClick={() => onChange('assignment', null)}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="search-box">
        <input
          type="text"
          className="form-input"
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="team-list">
        {filteredMembers.map(member => (
          <div
            key={member.id}
            className={`team-card ${formData.assignment?.assignedToId === member.id ? 'selected' : ''}`}
            onClick={() => handleAssign(member)}
          >
            <div className="team-avatar">
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="team-details">
              <strong>{member.name}</strong>
              <span className="role">{member.role}</span>
              <span className="department">{member.department}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Drawer Component
const TaskCreateDrawer = () => {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    businessId: 'BIZ001',
    type: 'task',
    client: null,
    particulars: {
      name: '',
      category: '',
      remarks: '',
      internalTags: []
    },
    lifecycle: {
      priority: 'normal'
    },
    dates: {
      startDate: '',
      dueDate: ''
    },
    assignment: null
  });
  const [errors, setErrors] = useState({});

  const steps = [
    { title: 'Task Details', component: TaskDetailsStep },
    { title: 'Link Client', component: ClientSelectionStep },
    { title: 'Assign Team', component: TeamAssignmentStep }
  ];

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (currentStep === 0) {
      if (!formData.particulars.name) {
        newErrors.particularsName = 'Service name is required';
      }
    } else if (currentStep === 1) {
      if (!formData.client) {
        newErrors.client = 'Please select or create a client';
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.assignment) {
        newErrors.assignment = 'Please assign a team member';
        return false;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Submitting task:', formData);
    // API call will go here
    alert('Task created successfully!');
    setOpen(false);
    // Reset form
    setCurrentStep(0);
    setFormData({
      businessId: 'BIZ001',
      type: 'task',
      client: null,
      particulars: { name: '', category: '', remarks: '', internalTags: [] },
      lifecycle: { priority: 'normal' },
      dates: { startDate: '', dueDate: '' },
      assignment: null
    });
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        Create New Task
      </button>

      <Drawer
        anchor="right"
        open={true}
        onClose={() => setOpen(false)}
        classes={{ paper: 'task-drawer' }}
      >
        <div className="drawer-container">
          <div className="drawer-header">
            <div>
              <h2>Create New Task</h2>
              <div className="step-indicator">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </div>
            </div>
            <button className="btn-icon" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="progress-bar">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`progress-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              >
                <div className="step-circle">{index + 1}</div>
                <span className="step-label">{step.title}</span>
              </div>
            ))}
          </div>

          <div className="drawer-body">
            <CurrentStepComponent
              formData={formData}
              onChange={handleChange}
              errors={errors}
            />
          </div>

          <div className="drawer-footer">
            <button
              className="btn-secondary"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <button
              className="btn-primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? 'Create Task' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default TaskCreateDrawer;