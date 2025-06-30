import React, { useState, useEffect } from 'react';

const EOSPlatform = () => {
  // Core State Management
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('disconnected');
  
  // Data States (empty to start)
  const [metrics, setMetrics] = useState([]);
  const [rocks, setRocks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); // Fixed: Now properly managed
  const [peopleData, setPeopleData] = useState([]);
  const [todos, setTodos] = useState([]);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [visionData, setVisionData] = useState({
    coreValues: [],
    coreFocus: { purpose: '', niche: '' },
    tenYearTarget: '',
    marketingStrategy: '',
    threeYearPicture: '',
    oneYearPlan: ''
  });

  // Modal and Form States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Notification System
  const [notifications, setNotifications] = useState([]);

  // API Configuration for your specific Cloudflare setup
  const API_BASE = 'https://eos-platform-api.traveldata.workers.dev/api/v1';
  const GHL_WEBHOOK = 'https://eos-platform-api.traveldata.workers.dev/api/ghl/webhook';

  // API calls to your Worker
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    setIsLoading(true);
    try {
      console.log(`API Call: ${method} ${API_BASE}${endpoint}`, data);
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : null,
      });
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success) {
        setApiStatus('connected');
        return result;
      } else {
        console.error('API Error:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('API Error:', error);
      setApiStatus('error');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // GoHighLevel Integration Functions
  const syncWithGHL = async (type, data) => {
    try {
      const response = await fetch(`${GHL_WEBHOOK}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        showNotification('Synced with GoHighLevel successfully', 'success');
      }
    } catch (error) {
      showNotification('Failed to sync with GoHighLevel', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Form Validation
  const validateForm = (type, data) => {
    const newErrors = {};
    
    switch (type) {
      case 'metric':
        if (!data.name) newErrors.name = 'Metric name is required';
        if (!data.goal) newErrors.goal = 'Goal is required';
        if (!data.owner) newErrors.owner = 'Owner is required';
        break;
      case 'rock':
        if (!data.title) newErrors.title = 'Rock title is required';
        if (!data.owner) newErrors.owner = 'Owner is required';
        if (!data.dueDate) newErrors.dueDate = 'Due date is required';
        break;
      case 'issue':
        if (!data.title) newErrors.title = 'Issue title is required';
        if (!data.priority) newErrors.priority = 'Priority is required';
        break;
      case 'person':
        if (!data.name) newErrors.name = 'Name is required';
        if (!data.role) newErrors.role = 'Role is required';
        if (!data.seat) newErrors.seat = 'Seat is required';
        break;
      case 'todo':
        if (!data.task) newErrors.task = 'Task is required';
        if (!data.owner) newErrors.owner = 'Owner is required';
        if (!data.dueDate) newErrors.dueDate = 'Due date is required';
        break;
      case 'meeting':
        if (!data.title) newErrors.title = 'Meeting title is required';
        if (!data.date) newErrors.date = 'Date is required';
        break;
      case 'coreValue':
        if (!data.value) newErrors.value = 'Core value is required';
        if (!data.description) newErrors.description = 'Description is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Convert frontend data to backend format
  const convertToBackendFormat = (type, data) => {
    const baseData = {
      id: data.id || Date.now().toString(),
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Convert camelCase to snake_case for backend
    switch (type) {
      case 'metric':
        return {
          ...baseData,
          current: data.current || data.currentValue || '',
        };
      case 'rock':
        return {
          ...baseData,
          dueDate: data.dueDate,
        };
      case 'person':
        return {
          ...baseData,
          getIt: data.getIt || false,
          wantIt: data.wantIt || false,
          capacity: data.capacity || false,
        };
      case 'todo':
        return {
          ...baseData,
          dueDate: data.dueDate,
        };
      default:
        return baseData;
    }
  };

  // Convert backend data to frontend format
  const convertFromBackendFormat = (type, data) => {
    if (!data) return data;
    
    switch (type) {
      case 'metric':
        return {
          ...data,
          current: data.current_value || data.current || '',
        };
      case 'rock':
        return {
          ...data,
          dueDate: data.due_date || data.dueDate,
        };
      case 'person':
        return {
          ...data,
          getIt: data.get_it || data.getIt || false,
          wantIt: data.want_it || data.wantIt || false,
          capacity: data.capacity || false,
        };
      case 'todo':
        return {
          ...data,
          dueDate: data.due_date || data.dueDate,
        };
      default:
        return data;
    }
  };

  // CRUD Operations
  const createItem = async (type, data) => {
    if (!validateForm(type, data)) return;
    
    const backendData = convertToBackendFormat(type, data);

    try {
      const response = await apiCall(`/${type}s`, 'POST', backendData);
      if (response.success) {
        const frontendData = convertFromBackendFormat(type, backendData);
        
        // Update local state
        switch (type) {
          case 'metric':
            setMetrics(prev => [...prev, frontendData]);
            break;
          case 'rock':
            setRocks(prev => [...prev, frontendData]);
            break;
          case 'issue':
            setIssues(prev => [...prev, frontendData]);
            break;
          case 'person':
            const newPerson = frontendData;
            setPeopleData(prev => [...prev, newPerson]);
            // Update teamMembers list
            setTeamMembers(prev => [...prev, { id: newPerson.id, name: newPerson.name }]);
            break;
          case 'todo':
            setTodos(prev => [...prev, frontendData]);
            break;
          case 'meeting':
            setMeetings(prev => [...prev, frontendData]);
            break;
          case 'coreValue':
            setVisionData(prev => ({
              ...prev,
              coreValues: [...prev.coreValues, { id: frontendData.id, value: frontendData.value, description: frontendData.description }]
            }));
            break;
        }
        
        await syncWithGHL(type, frontendData);
        
        setShowModal(false);
        setFormData({});
        showNotification(`${type} created successfully!`, 'success');
      }
    } catch (error) {
      showNotification(`Failed to create ${type}`, 'error');
    }
  };

  const updateItem = async (type, id, data) => {
    const backendData = convertToBackendFormat(type, data);
    
    try {
      const response = await apiCall(`/${type}s/${id}`, 'PUT', backendData);
      if (response.success) {
        const frontendData = convertFromBackendFormat(type, { ...data, id });
        
        // Update local state
        switch (type) {
          case 'metric':
            setMetrics(prev => prev.map(item => item.id === id ? frontendData : item));
            break;
          case 'rock':
            setRocks(prev => prev.map(item => item.id === id ? frontendData : item));
            break;
          case 'issue':
            setIssues(prev => prev.map(item => item.id === id ? frontendData : item));
            break;
          case 'person':
            setPeopleData(prev => prev.map(item => item.id === id ? frontendData : item));
            // Update teamMembers list
            setTeamMembers(prev => prev.map(member => 
              member.id === id ? { id: frontendData.id, name: frontendData.name } : member
            ));
            break;
          case 'todo':
            setTodos(prev => prev.map(item => item.id === id ? frontendData : item));
            break;
        }
        showNotification(`${type} updated successfully!`, 'success');
        setShowModal(false);
        setFormData({});
      }
    } catch (error) {
      showNotification(`Failed to update ${type}`, 'error');
    }
  };

  const deleteItem = async (type, id) => {
    try {
      const response = await apiCall(`/${type}s/${id}`, 'DELETE');
      if (response.success) {
        // Update local state
        switch (type) {
          case 'metric':
            setMetrics(prev => prev.filter(item => item.id !== id));
            break;
          case 'rock':
            setRocks(prev => prev.filter(item => item.id !== id));
            break;
          case 'issue':
            setIssues(prev => prev.filter(item => item.id !== id));
            break;
          case 'person':
            setPeopleData(prev => prev.filter(item => item.id !== id));
            // Update teamMembers list
            setTeamMembers(prev => prev.filter(member => member.id !== id));
            break;
          case 'todo':
            setTodos(prev => prev.filter(item => item.id !== id));
            break;
          case 'meeting':
            setMeetings(prev => prev.filter(item => item.id !== id));
            break;
        }
        showNotification(`${type} deleted successfully!`, 'success');
      }
    } catch (error) {
      showNotification(`Failed to delete ${type}`, 'error');
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [metricsRes, rocksRes, issuesRes, peopleRes, meetingsRes, todosRes, visionRes] = await Promise.all([
          apiCall('/metrics'),
          apiCall('/rocks'),
          apiCall('/issues'),
          apiCall('/people'),
          apiCall('/meetings'),
          apiCall('/todos'),
          apiCall('/vision')
        ]);
        
        if (metricsRes.success) {
          const convertedMetrics = (metricsRes.data || []).map(item => convertFromBackendFormat('metric', item));
          setMetrics(convertedMetrics);
        }
        
        if (rocksRes.success) {
          const convertedRocks = (rocksRes.data || []).map(item => convertFromBackendFormat('rock', item));
          setRocks(convertedRocks);
        }
        
        if (issuesRes.success) {
          const convertedIssues = (issuesRes.data || []).map(item => convertFromBackendFormat('issue', item));
          setIssues(convertedIssues);
        }
        
        if (peopleRes.success) {
          const convertedPeople = (peopleRes.data || []).map(item => convertFromBackendFormat('person', item));
          setPeopleData(convertedPeople);
          // Populate teamMembers from peopleData
          setTeamMembers(convertedPeople.map(person => ({ id: person.id, name: person.name })));
        }
        
        if (meetingsRes.success) {
          const convertedMeetings = (meetingsRes.data || []).map(item => convertFromBackendFormat('meeting', item));
          setMeetings(convertedMeetings);
        }
        
        if (todosRes.success) {
          const convertedTodos = (todosRes.data || []).map(item => convertFromBackendFormat('todo', item));
          setTodos(convertedTodos);
        }
        
        if (visionRes.success) {
          setVisionData(visionRes.data || {
            coreValues: [],
            coreFocus: { purpose: '', niche: '' },
            tenYearTarget: '',
            marketingStrategy: '',
            threeYearPicture: '',
            oneYearPlan: ''
          });
        }
        
        setApiStatus('connected');
      } catch (error) {
        setApiStatus('error');
        showNotification('Failed to load data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Update teamMembers when peopleData changes
  useEffect(() => {
    setTeamMembers(peopleData.map(person => ({ id: person.id, name: person.name })));
  }, [peopleData]);

  // Modal Management
  const openModal = (type, item = null) => {
    setModalType(type);
    setFormData(item || {});
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({});
    setErrors({});
  };

  // Calculate Dashboard Stats
  const dashboardStats = {
    totalMetrics: metrics.length,
    onTrackMetrics: metrics.filter(m => m.status === 'on-track').length,
    totalRocks: rocks.length,
    completedRocks: rocks.filter(r => r.progress >= 100).length,
    totalIssues: issues.length,
    highPriorityIssues: issues.filter(i => i.priority === 'high').length,
    avgRockProgress: rocks.length > 0 ? Math.round(rocks.reduce((sum, r) => sum + (r.progress || 0), 0) / rocks.length) : 0,
    totalPeople: peopleData.length,
    rightPeopleSeat: peopleData.filter(p => p.getIt && p.wantIt && p.capacity).length,
    upcomingMeetings: meetings.filter(m => new Date(m.date) > new Date()).length,
    pendingTodos: todos.filter(t => !t.completed).length,
    coreValuesCount: visionData.coreValues.length
  };

  // Render Functions
  const renderNavigation = () => (
    <nav className="eos-nav">
      <div className="nav-brand">
        <h1>🎯 EOS Platform</h1>
        <div className={`api-status ${apiStatus}`}>
          <span>{apiStatus === 'connected' ? '🟢' : apiStatus === 'error' ? '🔴' : '🟡'}</span>
          <span>{apiStatus}</span>
        </div>
      </div>
      <div className="nav-menu">
        {[
          { key: 'dashboard', label: '📊 Dashboard' },
          { key: 'scorecard', label: '📈 Scorecard' },
          { key: 'rocks', label: '🎯 Rocks' },
          { key: 'issues', label: '⚠️ Issues' },
          { key: 'vto', label: '👁️ V/TO' },
          { key: 'l10', label: '📅 L10 Meetings' },
          { key: 'people', label: '👥 People' },
          { key: 'integrations', label: '🔗 Integrations' }
        ].map(item => (
          <button
            key={item.key}
            className={`nav-item ${currentView === item.key ? 'active' : ''}`}
            onClick={() => setCurrentView(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );

  const renderDashboard = () => (
    <div className="dashboard">
      <h2>EOS Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Scorecard Metrics</h3>
          <div className="stat-number">{dashboardStats.onTrackMetrics}/{dashboardStats.totalMetrics}</div>
          <div className="stat-label">On Track</div>
        </div>
        
        <div className="stat-card">
          <h3>Rock Progress</h3>
          <div className="stat-number">{dashboardStats.avgRockProgress}%</div>
          <div className="stat-label">Average Progress</div>
        </div>
        
        <div className="stat-card">
          <h3>Issues</h3>
          <div className="stat-number">{dashboardStats.totalIssues}</div>
          <div className="stat-label">{dashboardStats.highPriorityIssues} High Priority</div>
        </div>
        
        <div className="stat-card">
          <h3>Team</h3>
          <div className="stat-number">{dashboardStats.rightPeopleSeat}/{dashboardStats.totalPeople}</div>
          <div className="stat-label">Right People, Right Seat</div>
        </div>

        <div className="stat-card">
          <h3>Meetings & To-Dos</h3>
          <div className="stat-number">{dashboardStats.upcomingMeetings}</div>
          <div className="stat-label">{dashboardStats.pendingTodos} Pending To-Dos</div>
        </div>
        
        <div className="stat-card">
          <h3>Vision</h3>
          <div className="stat-number">{dashboardStats.coreValuesCount}</div>
          <div className="stat-label">Core Values Defined</div>
        </div>
      </div>

      {metrics.length === 0 && rocks.length === 0 && issues.length === 0 && peopleData.length === 0 && (
        <div className="empty-state">
          <h3>Welcome to your EOS Platform!</h3>
          <p>Get started by setting up your core EOS components.</p>
          <div className="quick-actions">
            <button className="btn btn-primary" onClick={() => openModal('metric')}>
              Add First Metric
            </button>
            <button className="btn btn-secondary" onClick={() => openModal('rock')}>
              Add First Rock
            </button>
            <button className="btn btn-secondary" onClick={() => openModal('person')}>
              Add Team Member
            </button>
            <button className="btn btn-secondary" onClick={() => setCurrentView('vto')}>
              Setup V/TO
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderScorecard = () => (
    <div className="scorecard">
      <div className="section-header">
        <h2>Scorecard</h2>
        <button className="btn btn-primary" onClick={() => openModal('metric')}>
          + Add Metric
        </button>
      </div>
      
      {metrics.length === 0 ? (
        <div className="empty-section">
          <p>No metrics yet. Add your first scorecard metric to track your company's vital signs.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="eos-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Goal</th>
                <th>Current</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => (
                <tr key={metric.id}>
                  <td>{metric.name}</td>
                  <td>{metric.goal}</td>
                  <td>{metric.current || '-'}</td>
                  <td>
                    <span className={`status ${metric.status || 'unknown'}`}>
                      {metric.status || 'Unknown'}
                    </span>
                  </td>
                  <td>{metric.owner}</td>
                  <td>{new Date(metric.updated_at || metric.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => openModal('metric', metric)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteItem('metric', metric.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderRocks = () => (
    <div className="rocks">
      <div className="section-header">
        <h2>Rocks (90-Day Priorities)</h2>
        <button className="btn btn-primary" onClick={() => openModal('rock')}>
          + Add Rock
        </button>
      </div>
      
      {rocks.length === 0 ? (
        <div className="empty-section">
          <p>No rocks yet. Add your first 90-day priority to focus your team's energy.</p>
        </div>
      ) : (
        <div className="rocks-grid">
          {rocks.map(rock => (
            <div key={rock.id} className="rock-card">
              <h3>{rock.title}</h3>
              <p>{rock.description}</p>
              <div className="rock-meta">
                <span>Owner: {rock.owner}</span>
                <span>Due: {new Date(rock.dueDate || rock.due_date).toLocaleDateString()}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${rock.progress || 0}%` }}
                ></div>
              </div>
              <div className="rock-actions">
                <button className="btn btn-sm" onClick={() => openModal('rock', rock)}>
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteItem('rock', rock.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderIssues = () => (
    <div className="issues">
      <div className="section-header">
        <h2>Issues List</h2>
        <button className="btn btn-primary" onClick={() => openModal('issue')}>
          + Add Issue
        </button>
      </div>
      
      {issues.length === 0 ? (
        <div className="empty-section">
          <p>No issues yet. Add issues that need to be solved to keep your business running smoothly.</p>
        </div>
      ) : (
        <div className="issues-list">
          {issues.map(issue => (
            <div key={issue.id} className="issue-card">
              <div className="issue-header">
                <h3>{issue.title}</h3>
                <span className={`priority ${issue.priority}`}>{issue.priority}</span>
              </div>
              <p>{issue.description}</p>
              <div className="issue-meta">
                <span>Assigned: {issue.assignee || 'Unassigned'}</span>
                <span>Created: {new Date(issue.created_at || issue.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="issue-actions">
                <button className="btn btn-sm" onClick={() => openModal('issue', issue)}>
                  Edit
                </button>
                <button className="btn btn-sm btn-success" onClick={() => deleteItem('issue', issue.id)}>
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderL10 = () => (
    <div className="l10">
      <div className="section-header">
        <h2>L10 Meetings</h2>
        <button className="btn btn-primary" onClick={() => openModal('meeting')}>
          + Schedule Meeting
        </button>
      </div>
      
      {meetings.length === 0 ? (
        <div className="empty-section">
          <p>No L10 meetings scheduled. Schedule your first Level 10 meeting to maintain team rhythm.</p>
        </div>
      ) : (
        <div className="meetings-list">
          {meetings.map(meeting => (
            <div key={meeting.id} className="meeting-card">
              <div className="meeting-header">
                <h3>{meeting.title}</h3>
                <span className="meeting-date">{new Date(meeting.date).toLocaleDateString()}</span>
              </div>
              <div className="meeting-actions">
                <button className="btn btn-primary" onClick={() => setCurrentMeeting(meeting)}>
                  Start Meeting
                </button>
                <button className="btn btn-sm" onClick={() => openModal('meeting', meeting)}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentMeeting && (
        <div className="meeting-agenda">
          <div className="agenda-header">
            <h3>L10 Meeting Agenda - {currentMeeting.title}</h3>
            <button className="btn btn-secondary" onClick={() => setCurrentMeeting(null)}>
              End Meeting
            </button>
          </div>
          
          <div className="agenda-sections">
            <div className="agenda-section">
              <h4>📊 Scorecard Review (5 min)</h4>
              <div className="scorecard-summary">
                {metrics.slice(0, 5).map(metric => (
                  <div key={metric.id} className="metric-item">
                    <span>{metric.name}: {metric.current || 'N/A'}</span>
                    <span className={`status ${metric.status || 'unknown'}`}>
                      {metric.status || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="agenda-section">
              <h4>🎯 Rock Review (5 min)</h4>
              <div className="rocks-summary">
                {rocks.slice(0, 4).map(rock => (
                  <div key={rock.id} className="rock-item">
                    <span>{rock.title}</span>
                    <div className="progress-mini">
                      <div className="progress-fill" style={{ width: `${rock.progress || 0}%` }}></div>
                    </div>
                    <span>{rock.progress || 0}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="agenda-section">
              <h4>⚠️ Issues List (60 min)</h4>
              <div className="issues-summary">
                {issues.slice(0, 3).map(issue => (
                  <div key={issue.id} className="issue-item">
                    <span>{issue.title}</span>
                    <span className={`priority ${issue.priority}`}>{issue.priority}</span>
                    <button className="btn btn-sm btn-success" onClick={() => deleteItem('issue', issue.id)}>
                      Solve
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="agenda-section">
              <h4>✅ To-Dos (10 min)</h4>
              <div className="todos-summary">
                <button className="btn btn-secondary" onClick={() => openModal('todo')}>
                  + Add To-Do
                </button>
                {todos.map(todo => (
                  <div key={todo.id} className="todo-item">
                    <span>{todo.task}</span>
                    <span>Due: {new Date(todo.dueDate || todo.due_date).toLocaleDateString()}</span>
                    <span>Owner: {todo.owner}</span>
                    <button className="btn btn-sm btn-success" onClick={() => deleteItem('todo', todo.id)}>
                      Complete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderVTO = () => {
    const updateVisionField = (field, value) => {
      setVisionData(prev => ({ ...prev, [field]: value }));
    };

    const updateCoreFocus = (field, value) => {
      setVisionData(prev => ({
        ...prev,
        coreFocus: { ...prev.coreFocus, [field]: value }
      }));
    };

    return (
      <div className="vto">
        <h2>Vision/Traction Organizer (V/TO)</h2>
        
        <div className="vto-grid">
          <div className="vto-section">
            <div className="section-header">
              <h3>Core Values</h3>
              <button className="btn btn-secondary" onClick={() => openModal('coreValue')}>
                + Add Value
              </button>
            </div>
            {visionData.coreValues.length === 0 ? (
              <p className="empty-text">Define your company's core values</p>
            ) : (
              <div className="core-values-list">
                {visionData.coreValues.map(value => (
                  <div key={value.id} className="core-value-item">
                    <h4>{value.value}</h4>
                    <p>{value.description}</p>
                    <button className="btn btn-sm btn-danger" onClick={() => {
                      setVisionData(prev => ({
                        ...prev,
                        coreValues: prev.coreValues.filter(v => v.id !== value.id)
                      }));
                    }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="vto-section">
            <h3>Core Focus</h3>
            <div className="core-focus">
              <div className="form-group">
                <label>Purpose/Cause/Passion</label>
                <textarea
                  value={visionData.coreFocus.purpose}
                  onChange={e => updateCoreFocus('purpose', e.target.value)}
                  placeholder="Why does your organization exist?"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Niche</label>
                <textarea
                  value={visionData.coreFocus.niche}
                  onChange={e => updateCoreFocus('niche', e.target.value)}
                  placeholder="What do you do? For whom?"
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="vto-section">
            <h3>10-Year Target</h3>
            <textarea
              value={visionData.tenYearTarget}
              onChange={e => updateVisionField('tenYearTarget', e.target.value)}
              placeholder="Where will you be in 10 years?"
              rows="4"
            />
          </div>

          <div className="vto-section">
            <h3>Marketing Strategy</h3>
            <textarea
              value={visionData.marketingStrategy}
              onChange={e => updateVisionField('marketingStrategy', e.target.value)}
              placeholder="How will you reach your target market?"
              rows="4"
            />
          </div>

          <div className="vto-section">
            <h3>3-Year Picture</h3>
            <textarea
              value={visionData.threeYearPicture}
              onChange={e => updateVisionField('threeYearPicture', e.target.value)}
              placeholder="What will your company look like in 3 years?"
              rows="4"
            />
          </div>

          <div className="vto-section">
            <h3>1-Year Plan</h3>
            <textarea
              value={visionData.oneYearPlan}
              onChange={e => updateVisionField('oneYearPlan', e.target.value)}
              placeholder="What are your goals for the next year?"
              rows="4"
            />
          </div>
        </div>

        <div className="vto-actions">
          <button className="btn btn-primary" onClick={() => {
            apiCall('/vision', 'PUT', visionData);
            showNotification('V/TO saved successfully!', 'success');
          }}>
            Save V/TO
          </button>
        </div>
      </div>
    );
  };

  const renderPeopleAnalyzer = () => (
    <div className="people">
      <div className="section-header">
        <h2>People Analyzer</h2>
        <button className="btn btn-primary" onClick={() => openModal('person')}>
          + Add Person
        </button>
      </div>
      
      {peopleData.length === 0 ? (
        <div className="empty-section">
          <p>No team members added yet. Add your team members to analyze if they're the right people in the right seats.</p>
        </div>
      ) : (
        <div className="people-grid">
          {peopleData.map(person => (
            <div key={person.id} className="person-card">
              <div className="person-header">
                <h3>{person.name}</h3>
                <span className="person-role">{person.role}</span>
              </div>
              
              <div className="person-details">
                <div className="detail-row">
                  <span>Seat:</span>
                  <span>{person.seat}</span>
                </div>
                <div className="detail-row">
                  <span>Department:</span>
                  <span>{person.department || 'N/A'}</span>
                </div>
              </div>

              <div className="gwc-analysis">
                <h4>GWC Analysis</h4>
                <div className="gwc-grid">
                  <div className="gwc-item">
                    <span>Get It</span>
                    <span className={`gwc-status ${person.getIt ? 'yes' : 'no'}`}>
                      {person.getIt ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="gwc-item">
                    <span>Want It</span>
                    <span className={`gwc-status ${person.wantIt ? 'yes' : 'no'}`}>
                      {person.wantIt ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="gwc-item">
                    <span>Capacity</span>
                    <span className={`gwc-status ${person.capacity ? 'yes' : 'no'}`}>
                      {person.capacity ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
                
                <div className="gwc-result">
                  <span className={`result ${(person.getIt && person.wantIt && person.capacity) ? 'right-person' : 'wrong-person'}`}>
                    {(person.getIt && person.wantIt && person.capacity) ? 'Right Person, Right Seat' : 'Needs Attention'}
                  </span>
                </div>
              </div>

              <div className="person-actions">
                <button className="btn btn-sm" onClick={() => openModal('person', person)}>
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteItem('person', person.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="people-summary">
        <h3>Team Summary</h3>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-number">{peopleData.length}</span>
            <span className="stat-label">Total Team Members</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {peopleData.filter(p => p.getIt && p.wantIt && p.capacity).length}
            </span>
            <span className="stat-label">Right Person, Right Seat</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {peopleData.filter(p => !(p.getIt && p.wantIt && p.capacity)).length}
            </span>
            <span className="stat-label">Need Attention</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="integrations">
      <h2>Integrations</h2>
      
      <div className="integration-cards">
        <div className="integration-card">
          <h3>🚀 GoHighLevel CRM</h3>
          <p>Sync contacts, deals, and activities with your EOS data</p>
          <div className="integration-status">
            <span className="status connected">Connected</span>
          </div>
          <div className="integration-actions">
            <button className="btn btn-primary" onClick={() => syncWithGHL('all', {})}>
              Sync Now
            </button>
            <button className="btn btn-secondary">
              Configure
            </button>
          </div>
        </div>
        
        <div className="integration-card">
          <h3>☁️ Cloudflare</h3>
          <p>Powered by Cloudflare Workers, Pages, and D1 Database</p>
          <div className="integration-status">
            <span className={`status ${apiStatus}`}>{apiStatus}</span>
          </div>
          <div className="integration-actions">
            <button className="btn btn-secondary" onClick={() => window.open('https://dash.cloudflare.com', '_blank')}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    const handleSubmit = () => {
      if (formData.id) {
        updateItem(modalType, formData.id, formData);
      } else {
        createItem(modalType, formData);
      }
    };

    const handleInputChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{formData.id ? 'Edit' : 'Add'} {modalType}</h3>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>
          
          <div className="modal-form">
            {modalType === 'metric' && (
              <>
                <div className="form-group">
                  <label>Metric Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => handleInputChange('name', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label>Goal *</label>
                  <input
                    type="text"
                    value={formData.goal || ''}
                    onChange={e => handleInputChange('goal', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.goal ? 'error' : ''}
                  />
                  {errors.goal && <span className="error-text">{errors.goal}</span>}
                </div>
                
                <div className="form-group">
                  <label>Owner *</label>
                  <select
                    value={formData.owner || ''}
                    onChange={e => handleInputChange('owner', e.target.value)}
                    className={errors.owner ? 'error' : ''}
                  >
                    <option value="">Select Owner</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                    <option value="Sarah M">Sarah M</option>
                    <option value="Mike T">Mike T</option>
                    <option value="Lisa K">Lisa K</option>
                    <option value="John D">John D</option>
                  </select>
                  {errors.owner && <span className="error-text">{errors.owner}</span>}
                </div>
              </>
            )}

            {modalType === 'rock' && (
              <>
                <div className="form-group">
                  <label>Rock Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={e => handleInputChange('title', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.title ? 'error' : ''}
                  />
                  {errors.title && <span className="error-text">{errors.title}</span>}
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => handleInputChange('description', e.target.value)}
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label>Owner *</label>
                  <select
                    value={formData.owner || ''}
                    onChange={e => handleInputChange('owner', e.target.value)}
                    className={errors.owner ? 'error' : ''}
                  >
                    <option value="">Select Owner</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                    <option value="Sarah M">Sarah M</option>
                    <option value="Mike T">Mike T</option>
                    <option value="Lisa K">Lisa K</option>
                    <option value="John D">John D</option>
                  </select>
                  {errors.owner && <span className="error-text">{errors.owner}</span>}
                </div>
                
                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={e => handleInputChange('dueDate', e.target.value)}
                    className={errors.dueDate ? 'error' : ''}
                  />
                  {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
                </div>
                
                <div className="form-group">
                  <label>Progress %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress || 0}
                    onChange={e => handleInputChange('progress', parseInt(e.target.value))}
                  />
                </div>
              </>
            )}

            {modalType === 'issue' && (
              <>
                <div className="form-group">
                  <label>Issue Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={e => handleInputChange('title', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.title ? 'error' : ''}
                  />
                  {errors.title && <span className="error-text">{errors.title}</span>}
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => handleInputChange('description', e.target.value)}
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    value={formData.priority || ''}
                    onChange={e => handleInputChange('priority', e.target.value)}
                    className={errors.priority ? 'error' : ''}
                  >
                    <option value="">Select Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  {errors.priority && <span className="error-text">{errors.priority}</span>}
                </div>
                
                <div className="form-group">
                  <label>Assignee</label>
                  <select
                    value={formData.assignee || ''}
                    onChange={e => handleInputChange('assignee', e.target.value)}
                  >
                    <option value="">Select Assignee</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                    <option value="Sarah M">Sarah M</option>
                    <option value="Mike T">Mike T</option>
                    <option value="Lisa K">Lisa K</option>
                    <option value="John D">John D</option>
                  </select>
                </div>
              </>
            )}

            {modalType === 'person' && (
              <>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => handleInputChange('name', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label>Role *</label>
                  <input
                    type="text"
                    value={formData.role || ''}
                    onChange={e => handleInputChange('role', e.target.value)}
                    className={errors.role ? 'error' : ''}
                  />
                  {errors.role && <span className="error-text">{errors.role}</span>}
                </div>
                
                <div className="form-group">
                  <label>Seat *</label>
                  <select
                    value={formData.seat || ''}
                    onChange={e => handleInputChange('seat', e.target.value)}
                    className={errors.seat ? 'error' : ''}
                  >
                    <option value="">Select Seat</option>
                    <option value="Visionary">Visionary</option>
                    <option value="Integrator">Integrator</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Admin">Admin</option>
                  </select>
                  {errors.seat && <span className="error-text">{errors.seat}</span>}
                </div>
                
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={e => handleInputChange('department', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <h4>GWC Assessment</h4>
                  <div className="gwc-checkboxes">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.getIt || false}
                        onChange={e => handleInputChange('getIt', e.target.checked)}
                      />
                      Get It (Has the intellectual capacity)
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.wantIt || false}
                        onChange={e => handleInputChange('wantIt', e.target.checked)}
                      />
                      Want It (Has the desire and passion)
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.capacity || false}
                        onChange={e => handleInputChange('capacity', e.target.checked)}
                      />
                      Capacity (Has the time and skill)
                    </label>
                  </div>
                </div>
              </>
            )}

            {modalType === 'todo' && (
              <>
                <div className="form-group">
                  <label>Task *</label>
                  <input
                    type="text"
                    value={formData.task || ''}
                    onChange={e => handleInputChange('task', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.task ? 'error' : ''}
                  />
                  {errors.task && <span className="error-text">{errors.task}</span>}
                </div>
                
                <div className="form-group">
                  <label>Owner *</label>
                  <select
                    value={formData.owner || ''}
                    onChange={e => handleInputChange('owner', e.target.value)}
                    className={errors.owner ? 'error' : ''}
                  >
                    <option value="">Select Owner</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                    <option value="Sarah M">Sarah M</option>
                    <option value="Mike T">Mike T</option>
                    <option value="Lisa K">Lisa K</option>
                    <option value="John D">John D</option>
                  </select>
                  {errors.owner && <span className="error-text">{errors.owner}</span>}
                </div>
                
                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={e => handleInputChange('dueDate', e.target.value)}
                    className={errors.dueDate ? 'error' : ''}
                  />
                  {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    rows="3"
                  />
                </div>
              </>
            )}

            {modalType === 'meeting' && (
              <>
                <div className="form-group">
                  <label>Meeting Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={e => handleInputChange('title', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.title ? 'error' : ''}
                  />
                  {errors.title && <span className="error-text">{errors.title}</span>}
                </div>
                
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="datetime-local"
                    value={formData.date || ''}
                    onChange={e => handleInputChange('date', e.target.value)}
                    className={errors.date ? 'error' : ''}
                  />
                  {errors.date && <span className="error-text">{errors.date}</span>}
                </div>
                
                <div className="form-group">
                  <label>Facilitator</label>
                  <select
                    value={formData.facilitator || ''}
                    onChange={e => handleInputChange('facilitator', e.target.value)}
                  >
                    <option value="">Select Facilitator</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                    <option value="Sarah M">Sarah M</option>
                    <option value="Mike T">Mike T</option>
                    <option value="Lisa K">Lisa K</option>
                    <option value="John D">John D</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={e => handleInputChange('notes', e.target.value)}
                    rows="3"
                  />
                </div>
              </>
            )}

            {modalType === 'coreValue' && (
              <>
                <div className="form-group">
                  <label>Core Value *</label>
                  <input
                    type="text"
                    value={formData.value || ''}
                    onChange={e => handleInputChange('value', e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                    className={errors.value ? 'error' : ''}
                    placeholder="e.g., Integrity, Excellence, Innovation"
                  />
                  {errors.value && <span className="error-text">{errors.value}</span>}
                </div>
                
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => handleInputChange('description', e.target.value)}
                    className={errors.description ? 'error' : ''}
                    rows="3"
                    placeholder="Describe what this core value means to your organization"
                  />
                  {errors.description && <span className="error-text">{errors.description}</span>}
                </div>
              </>
            )}
            
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={isLoading} onClick={handleSubmit}>
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotifications = () => (
    <div className="notifications">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return renderDashboard();
      case 'scorecard': return renderScorecard();
      case 'rocks': return renderRocks();
      case 'issues': return renderIssues();
      case 'vto': return renderVTO();
      case 'l10': return renderL10();
      case 'people': return renderPeopleAnalyzer();
      case 'integrations': return renderIntegrations();
      default: return renderDashboard();
    }
  };

  return (
    <div className="eos-platform">
      <style jsx>{`
        .eos-platform {
          min-height: 100vh;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .eos-nav {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .nav-brand h1 {
          margin: 0;
          color: #1976d2;
          font-size: 1.5rem;
        }

        .api-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .api-status.connected { color: #4caf50; }
        .api-status.error { color: #f44336; }
        .api-status.disconnected { color: #ff9800; }

        .nav-menu {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .nav-item {
          background: none;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .nav-item:hover {
          background: #f0f0f0;
        }

        .nav-item.active {
          background: #1976d2;
          color: white;
        }

        .main-content {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-header h2 {
          margin: 0;
          color: #333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .stat-card h3 {
          margin: 0 0 1rem 0;
          color: #666;
          font-size: 0.9rem;
          text-transform: uppercase;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #1976d2;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: #888;
          font-size: 0.9rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .empty-section {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          color: #666;
        }

        .quick-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .btn {
          background: #1976d2;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn:hover {
          background: #1565c0;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #666;
        }

        .btn-secondary:hover {
          background: #555;
        }

        .btn-danger {
          background: #f44336;
        }

        .btn-success {
          background: #4caf50;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .eos-table {
          width: 100%;
          border-collapse: collapse;
        }

        .eos-table th,
        .eos-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .eos-table th {
          background: #f5f5f5;
          font-weight: 600;
          color: #333;
        }

        .eos-table tr:hover {
          background: #f9f9f9;
        }

        .status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .status.on-track { background: #e8f5e8; color: #4caf50; }
        .status.behind { background: #fff3e0; color: #ff9800; }
        .status.unknown { background: #f0f0f0; color: #666; }

        .rocks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .rock-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .rock-card h3 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .rock-meta {
          display: flex;
          justify-content: space-between;
          margin: 1rem 0;
          font-size: 0.9rem;
          color: #666;
        }

        .progress-bar {
          background: #e0e0e0;
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin: 1rem 0;
        }

        .progress-fill {
          background: #4caf50;
          height: 100%;
          transition: width 0.3s ease;
        }

        .rock-actions,
        .issue-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .issues-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .issue-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .issue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .issue-header h3 {
          margin: 0;
          color: #333;
        }

        .priority {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .priority.high { background: #ffebee; color: #f44336; }
        .priority.medium { background: #fff3e0; color: #ff9800; }
        .priority.low { background: #e8f5e8; color: #4caf50; }

        .issue-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.9rem;
          color: #666;
          margin-top: 1rem;
        }

        .integration-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .integration-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .integration-status {
          margin: 1rem 0;
        }

        .integration-actions {
          display: flex;
          gap: 0.5rem;
        }

        .meetings-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .meeting-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .meeting-header h3 {
          margin: 0;
          color: #333;
        }

        .meeting-date {
          color: #666;
          font-size: 0.9rem;
        }

        .meeting-actions {
          display: flex;
          gap: 0.5rem;
        }

        .meeting-agenda {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-top: 2rem;
        }

        .agenda-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #1976d2;
        }

        .agenda-sections {
          display: grid;
          gap: 2rem;
        }

        .agenda-section {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .agenda-section h4 {
          margin: 0 0 1rem 0;
          color: #1976d2;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 0.5rem;
        }

        .scorecard-summary, .rocks-summary, .issues-summary, .todos-summary {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric-item, .rock-item, .issue-item, .todo-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .progress-mini {
          width: 100px;
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
        }

        .vto-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .vto-section {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .vto-section h3 {
          margin: 0 0 1rem 0;
          color: #1976d2;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 0.5rem;
        }

        .core-values-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .core-value-item {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 6px;
          border-left: 4px solid #1976d2;
        }

        .core-value-item h4 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .core-value-item p {
          margin: 0 0 1rem 0;
          color: #666;
        }

        .core-focus {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .vto-actions {
          text-align: center;
          margin-top: 2rem;
        }

        .empty-text {
          color: #888;
          font-style: italic;
          text-align: center;
          padding: 1rem;
        }

        .people-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .person-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-left: 4px solid #1976d2;
        }

        .person-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .person-header h3 {
          margin: 0;
          color: #333;
        }

        .person-role {
          background: #e3f2fd;
          color: #1976d2;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .person-details {
          margin-bottom: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .detail-row span:first-child {
          color: #666;
          font-weight: 500;
        }

        .gwc-analysis {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .gwc-analysis h4 {
          margin: 0 0 1rem 0;
          color: #333;
          font-size: 1rem;
        }

        .gwc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .gwc-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          font-size: 0.8rem;
        }

        .gwc-status {
          font-size: 1.2rem;
          font-weight: bold;
          margin-top: 0.25rem;
        }

        .gwc-status.yes {
          color: #4caf50;
        }

        .gwc-status.no {
          color: #f44336;
        }

        .gwc-result {
          text-align: center;
          margin-top: 1rem;
        }

        .result {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .result.right-person {
          background: #e8f5e8;
          color: #4caf50;
        }

        .result.wrong-person {
          background: #fff3e0;
          color: #ff9800;
        }

        .person-actions {
          display: flex;
          gap: 0.5rem;
        }

        .people-summary {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-top: 2rem;
        }

        .people-summary h3 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .summary-stats .stat {
          text-align: center;
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 6px;
        }

        .summary-stats .stat-number {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1976d2;
          display: block;
        }

        .summary-stats .stat-label {
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .gwc-checkboxes {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 6px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
        }

        .modal-form {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #1976d2;
          box-shadow: 0 0 0 2px rgba(25,118,210,0.2);
        }

        .form-group input.error,
        .form-group select.error {
          border-color: #f44336;
        }

        .error-text {
          color: #f44336;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        .notifications {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1001;
        }

        .notification {
          background: white;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border-left: 4px solid #1976d2;
        }

        .notification.success {
          border-left-color: #4caf50;
        }

        .notification.error {
          border-left-color: #f44336;
        }

        @media (max-width: 768px) {
          .eos-nav {
            flex-direction: column;
            gap: 1rem;
          }

          .nav-menu {
            justify-content: center;
          }

          .main-content {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .rocks-grid {
            grid-template-columns: 1fr;
          }

          .integration-cards {
            grid-template-columns: 1fr;
          }

          .people-grid {
            grid-template-columns: 1fr;
          }

          .vto-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {renderNavigation()}
      
      <div className="main-content">
        {renderContent()}
      </div>

      {renderModal()}
      {renderNotifications()}
    </div>
  );
};

export default EOSPlatform;