import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  GitBranch, 
  Terminal as TerminalIcon, 
  Database, 
  FolderPlus, 
  CheckCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Globe, 
  HardDrive,
  FolderOpen,
  Save
} from 'lucide-react';

export default function App() {
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState('mock-sandbox');
  const [step, setStep] = useState(1);
  const [techStack, setTechStack] = useState('laravel');
  
  // Deploy configurations
  const [repoUrl, setRepoUrl] = useState('https://github.com/laravel/laravel.git');
  const [branch, setBranch] = useState('master');
  const [sessionId, setSessionId] = useState(null);
  const [deployStatus, setDeployStatus] = useState('idle'); // idle, running, cloned, setup_running, setup_completed, deploying, deployed, failed
  const [logs, setLogs] = useState([]);
  
  // Nuxt-specific deployment config states
  const [packageManager, setPackageManager] = useState('npm');
  const [nuxtPort, setNuxtPort] = useState('3000');
  const [isPortChecking, setIsPortChecking] = useState(false);
  const [portStatus, setPortStatus] = useState(null); // null, 'available', 'taken', 'error'
  const [portErrorMsg, setPortErrorMsg] = useState('');
  const [nuxtPreset, setNuxtPreset] = useState('ssr'); // 'ssr' or 'ssg'
  
  // Go-specific deployment config states
  const [goFiles, setGoFiles] = useState(['main.go']);
  const [selectedGoFile, setSelectedGoFile] = useState('main.go');
  const [isLoadingGoFiles, setIsLoadingGoFiles] = useState(false);
  const [customAppName, setCustomAppName] = useState('');

  const checkPortAvailability = async () => {
    if (!nuxtPort || nuxtPort.trim() === '') {
      setPortStatus('error');
      setPortErrorMsg('Please type a valid port number.');
      return;
    }
    setIsPortChecking(true);
    setPortStatus(null);
    setPortErrorMsg('');
    try {
      const response = await fetch('http://localhost:5000/api/deploy/check-port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerId,
          port: parseInt(nuxtPort)
        })
      });
      if (response.ok) {
        const data = await response.json();
        setPortStatus(data.available ? 'available' : 'taken');
      } else {
        const data = await response.json();
        setPortStatus('error');
        setPortErrorMsg(data.error || 'Port check failed.');
      }
    } catch (e) {
      setPortStatus('error');
      setPortErrorMsg('Server connection or network issue.');
    } finally {
      setIsPortChecking(false);
    }
  };

  // Listen to deployed state to transition to Success Screen for background running tasks
  useEffect(() => {
    if (deployStatus === 'deployed') {
      const timer = setTimeout(() => {
        setStep(8);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [deployStatus]);
  
  // Env configurator state
  const [envContent, setEnvContent] = useState('');
  const [parsedEnv, setParsedEnv] = useState([]);
  const [isRawEnv, setIsRawEnv] = useState(false);
  
  // Folder selector state
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  
  // SSH Server management modal & state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverForm, setServerForm] = useState({
    name: '',
    host: '',
    port: '22',
    username: 'root',
    password: '',
    privateKey: ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [serversLoading, setServersLoading] = useState(false);
  
  // Refs
  const terminalEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Fetch servers list on mount
  useEffect(() => {
    fetchServers();
  }, []);

  // Auto scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle Clean event listener when session finishes/unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fetchServers = async () => {
    setServersLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/servers');
      const data = await response.json();
      setServers(data);
    } catch (e) {
      console.error('Failed to fetch servers:', e);
    } finally {
      setServersLoading(false);
    }
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverForm)
      });
      if (response.ok) {
        const newServer = await response.json();
        setServers([...servers, newServer]);
        setSelectedServerId(newServer.id);
        setShowServerModal(false);
        setServerForm({
          name: '',
          host: '',
          port: '22',
          username: 'root',
          password: '',
          privateKey: ''
        });
        setTestResult(null);
      }
    } catch (err) {
      console.error('Failed to add server:', err);
    }
  };

  const handleDeleteServer = async (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this server configuration?')) {
      try {
        await fetch(`http://localhost:5000/api/servers/${id}`, { method: 'DELETE' });
        setServers(servers.filter(s => s.id !== id));
        if (selectedServerId === id) {
          setSelectedServerId('mock-sandbox');
        }
      } catch (err) {
        console.error('Failed to delete server:', err);
      }
    }
  };

  const handleTestServer = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const response = await fetch('http://localhost:5000/api/servers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedServerId === 'mock-sandbox' ? 
          { isMock: true, host: 'localhost-sandbox', name: 'Sandbox' } : 
          servers.find(s => s.id === selectedServerId)
        )
      });
      const data = await response.json();
      if (response.ok) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Server unreachable or network issue.' });
    } finally {
      setTestingConnection(false);
    }
  };

  // SSE Terminal Logging Integrator
  const startLogsStream = (session) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `http://localhost:5000/api/deploy/stream/${session}`;
    const source = new EventSource(sseUrl);
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs(prev => [...prev, data.message]);
      } else if (data.type === 'status') {
        setDeployStatus(data.status);
      }
    };

    source.onerror = (err) => {
      console.error('SSE Error:', err);
      source.close();
    };
  };

  // Step 3 -> 4: Trigger Clone repo
  const handleDeployClone = async () => {
    setLogs([]);
    setStep(4);
    setDeployStatus('running');
    
    try {
      const response = await fetch('http://localhost:5000/api/deploy/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerId,
          repoUrl,
          branch
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSessionId(data.sessionId);
        startLogsStream(data.sessionId);
      } else {
        setDeployStatus('failed');
        setLogs(prev => [...prev, `[SYSTEM ERROR] Failed to start deployment: ${data.error}`]);
      }
    } catch (err) {
      setDeployStatus('failed');
      setLogs(prev => [...prev, `[SYSTEM ERROR] Network failure connecting to deployment backend.`]);
    }
  };

  // Step 4 -> 5: Trigger Composer Setup
  const handleComposerSetup = async () => {
    setStep(5);
    setDeployStatus('setup_running');
    try {
      const response = await fetch('http://localhost:5000/api/deploy/composer-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerId,
          sessionId
        })
      });
      if (!response.ok) {
        const err = await response.json();
        setLogs(prev => [...prev, `[SYSTEM ERROR] Composer Setup trigger failed: ${err.error}`]);
        setDeployStatus('failed');
      }
    } catch (err) {
      setLogs(prev => [...prev, `[SYSTEM ERROR] Network failure starting Laravel Composer Setup.`]);
      setDeployStatus('failed');
    }
  };

  // Transition to choose target website directory
  const handleGoToDomainRoot = () => {
    fetchFolders();
    if (techStack === 'golang') {
      fetchGoFiles();
    }
    setStep(7);
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/deploy/list-dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: selectedServerId })
      });
      const data = await response.json();
      if (response.ok) {
        setFolders(data.folders);
        if (data.folders.length > 0) {
          setSelectedFolder(data.folders[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchGoFiles = async () => {
    setIsLoadingGoFiles(true);
    try {
      const response = await fetch('http://localhost:5000/api/deploy/list-go-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerId,
          sessionId
        })
      });
      if (response.ok) {
        const data = await response.json();
        setGoFiles(data.files || ['main.go']);
        if (data.files && data.files.length > 0) {
          setSelectedGoFile(data.files[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGoFiles(false);
    }
  };

  // Trigger copy to website target folder or Nuxt pipeline
  const handleFinalDeploy = async () => {
    const target = newFolderName.trim() !== '' ? newFolderName.trim() : selectedFolder;
    if (!target) {
      alert('Please select a directory or enter a new folder name.');
      return;
    }

    setStep(4); // Bring back terminal screen
    setDeployStatus('deploying');
    
    try {
      if (techStack === 'nuxt') {
        const response = await fetch('http://localhost:5000/api/deploy/nuxt-deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: selectedServerId,
            sessionId,
            packageManager,
            port: parseInt(nuxtPort || '3000'),
            targetFolder: target,
            preset: nuxtPreset,
            customAppName
          })
        });
        if (response.ok) {
          // Nuxt deployment starts successfully. Status updates and logs will stream via SSE.
          setLogs(prev => [...prev, `[SYSTEM] Nuxt.js deployment initiated in background...`]);
        } else {
          const err = await response.json();
          setDeployStatus('failed');
          setLogs(prev => [...prev, `[SYSTEM ERROR] Nuxt.js deployment failed to initialize: ${err.error}`]);
        }
      } else if (techStack === 'golang') {
        const response = await fetch('http://localhost:5000/api/deploy/golang-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: selectedServerId,
            sessionId,
            port: parseInt(nuxtPort || '8080'),
            targetFolder: target
          })
        });
        if (response.ok) {
          const data = await response.json();
          setEnvContent(data.envContent || `PORT=${nuxtPort || '8080'}\n`);
          setLogs(prev => [...prev, `[SYSTEM] Golang copy & .env initialization complete. Redirecting to Env Config editor...`]);
          setStep(6); // Transition to env editor screen!
        } else {
          const err = await response.json();
          setDeployStatus('failed');
          setLogs(prev => [...prev, `[SYSTEM ERROR] Golang initialization failed: ${err.error}`]);
        }
      } else {
        const response = await fetch('http://localhost:5000/api/deploy/copy-to-root', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: selectedServerId,
            sessionId,
            targetFolder: target
          })
        });
        if (response.ok) {
          setDeployStatus('deployed');
          setStep(8); // Success step
        } else {
          const err = await response.json();
          setDeployStatus('failed');
          setLogs(prev => [...prev, `[SYSTEM ERROR] Deployment copying failed: ${err.error}`]);
        }
      }
    } catch (err) {
      setDeployStatus('failed');
      setLogs(prev => [...prev, `[SYSTEM ERROR] Network failure finalize copying files.`]);
    }
  };

  const handleGoFinalizeDeploy = async () => {
    const target = newFolderName.trim() !== '' ? newFolderName.trim() : selectedFolder;
    if (!target) {
      alert('Please select a directory.');
      return;
    }

    setStep(4); // Back to terminal logs screen
    setDeployStatus('deploying');
    setLogs(prev => [...prev, `[SYSTEM] Saving final environment configuration and starting Go compile...`]);

    try {
      const response = await fetch('http://localhost:5000/api/deploy/golang-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerId,
          sessionId,
          port: parseInt(nuxtPort || '8080'),
          targetFolder: target,
          mainFile: selectedGoFile,
          customAppName,
          envContent
        })
      });
      if (response.ok) {
        setLogs(prev => [...prev, `[SYSTEM] Final compilation initiated in background...`]);
      } else {
        const err = await response.json();
        setDeployStatus('failed');
        setLogs(prev => [...prev, `[SYSTEM ERROR] Finalization failed: ${err.error}`]);
      }
    } catch (err) {
      setDeployStatus('failed');
      setLogs(prev => [...prev, `[SYSTEM ERROR] Network failure finalized deployment.`]);
    }
  };

  const resetDeployment = () => {
    setStep(1);
    setRepoUrl('https://github.com/laravel/laravel.git');
    setBranch('master');
    setSessionId(null);
    setDeployStatus('idle');
    setLogs([]);
    setEnvContent('');
    setParsedEnv([]);
    setSelectedFolder('');
    setNewFolderName('');
    setTestResult(null);
    setPackageManager('npm');
    setNuxtPort('3000');
    setPortStatus(null);
    setPortErrorMsg('');
    setNuxtPreset('ssr');
    setGoFiles(['main.go']);
    setSelectedGoFile('main.go');
    setIsLoadingGoFiles(false);
    setCustomAppName('');
  };

  const activeServer = selectedServerId === 'mock-sandbox' ? 
    { name: 'Local Sandbox Server (Dry-Run)', host: 'localhost-sandbox' } :
    servers.find(s => s.id === selectedServerId);

  const getProgressWidth = () => {
    if (step === 1) return 0;
    if (step === 2) return 25;
    if (step === 3) return 50;
    if (step === 4 || step === 5) return 75;
    if (step === 7) return 100;
    return 100;
  };

  return (
    <div className="layout-wrapper">
      <div className="glow-blob-1"></div>
      <div className="glow-blob-2"></div>
      
      {/* Sleek Header */}
      <header className="header-container">
        <div className="app-container header">
          <div className="logo-section">
            <div className="logo-box">
              <span>⚡</span>
            </div>
            <div>
              <h1 className="logo-title">SYNC DEPLOYER</h1>
              <p className="logo-subtitle">Automate server stack deployments by SynchronizeTeams</p>
            </div>
          </div>
          <div>
            <div className="header-status-badge">
              <span className="status-dot"></span>
              <span style={{ color: '#10b981' }}>Node API: Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Wizard Main Panel */}
      <main className="app-container max-w-4xl mt-12 flex-grow">
        
        {/* Step Node Indicators */}
        {step < 8 && (
          <div className="mb-10 px-4">
            <div className="step-container">
              <div 
                className="step-progress-bar" 
                style={{ width: `${getProgressWidth()}%` }}
              ></div>
              {[
                { n: 1, label: 'Stack' },
                { n: 2, label: 'Server' },
                { n: 3, label: 'Git Repo' },
                { n: 4, label: 'Deployment Logs' },
                { n: 7, label: 'Domain Root' }
              ].map((s, idx) => {
                const isActive = (step === s.n) || (s.n === 4 && (step === 4 || step === 5));
                const isCompleted = step > s.n && !(s.n === 4 && step === 5);
                
                return (
                  <div key={idx} className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? '✓' : idx + 1}
                    <div className="step-label">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Wizard Main Card Panel */}
        <div className="glass-panel p-8 mt-6">
          
          {/* STEP 1: CHOOSE TECH STACK */}
          {step === 1 && (
            <div>
              <div className="mb-8" style={{ textAlign: 'center' }}>
                <span className="badge-step">Step 1 of 6</span>
                <h2 className="title-large mt-3">Select Deployment Tech Stack</h2>
                <p className="desc-text">Choose the technology framework for your application deployment.</p>
              </div>

              <div className="grid-2">
                <div 
                  className={`tech-card ${techStack === 'laravel' ? 'active' : ''}`}
                  onClick={() => {
                    setTechStack('laravel');
                    setRepoUrl('https://github.com/laravel/laravel.git');
                    setBranch('master');
                  }}
                >
                  <span className="tech-badge active">Laravel</span>
                  <div className="tech-icon-box laravel">L</div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Laravel PHP Stack</h3>
                  <p className="desc-text" style={{ fontSize: '11px', marginTop: '6px' }}>Clones, installs composer, manages key-generation, sets database credentials, and copies to webroot.</p>
                </div>

                <div 
                  className={`tech-card ${techStack === 'nuxt' ? 'active' : ''}`}
                  onClick={() => {
                    setTechStack('nuxt');
                    setRepoUrl('https://github.com/nuxt-templates/v3-starter.git');
                    setBranch('main');
                  }}
                >
                  <span className="tech-badge active">Nuxt.js</span>
                  <div className="tech-icon-box node">N</div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Nuxt.js Framework</h3>
                  <p className="desc-text" style={{ fontSize: '11px', marginTop: '6px' }}>Clones repo, installs dependencies (npm/pnpm/bun), auto-detects static preset vs. dynamic SSR with PM2, and runs custom port checker.</p>
                </div>

                <div 
                  className={`tech-card ${techStack === 'static' ? 'active' : ''}`}
                  onClick={() => {
                    setTechStack('static');
                    setRepoUrl('https://github.com/thomasbnt/simple-html-template.git');
                    setBranch('main');
                  }}
                >
                  <span className="tech-badge active">Static HTML</span>
                  <div className="tech-icon-box static">S</div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Static HTML / JS Site</h3>
                  <p className="desc-text" style={{ fontSize: '11px', marginTop: '6px' }}>Clones your repository and copies static HTML, CSS, and JS files recursively directly to your domain webroot.</p>
                </div>

                <div 
                  className={`tech-card ${techStack === 'golang' ? 'active' : ''}`}
                  onClick={() => {
                    setTechStack('golang');
                    setRepoUrl('https://github.com/gin-gonic/examples.git');
                    setBranch('master');
                  }}
                >
                  <span className="tech-badge active" style={{ background: '#00add8' }}>Golang</span>
                  <div className="tech-icon-box go" style={{ background: 'rgba(0, 173, 216, 0.08)', color: '#00add8', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>G</div>
                  <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Go (Golang) App</h3>
                  <p className="desc-text" style={{ fontSize: '11px', marginTop: '6px' }}>Clones repo, finds and compiles entry file (e.g. main.go), writes port to .env, registers as systemd daemon, and restarts the service.</p>
                </div>
              </div>

              <div className="mt-8 flex flex-end">
                <button 
                  className="gradient-btn"
                  onClick={() => setStep(2)}
                >
                  Configure Server Settings <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT SSH SERVER */}
          {step === 2 && (
            <div>
              <div className="mb-6 flex align-center justify-between" style={{ flexWrap: 'wrap' }}>
                <div>
                  <span className="badge-step">Step 2 of 6</span>
                  <h2 className="title-large mt-3">Target Server & SSH Credentials</h2>
                  <p className="desc-text">Select an active SSH server or configure a local/mock sandbox.</p>
                </div>
                <button 
                  className="sec-btn"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                  onClick={() => setShowServerModal(true)}
                >
                  <Plus size={14} /> Add Server
                </button>
              </div>

              {/* Server List */}
              <div className="server-list-container">
                <div 
                  className={`server-item ${selectedServerId === 'mock-sandbox' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedServerId('mock-sandbox');
                    setTestResult(null);
                  }}
                >
                  <div className="flex align-center gap-3">
                    <div className="server-icon-box">
                      <HardDrive size={16} />
                    </div>
                    <div>
                      <h4 className="server-info-title">Local Sandbox Server (Dry-Run Mode)</h4>
                      <p className="server-info-subtitle">Host: localhost-sandbox • Sandbox directory deployment</p>
                    </div>
                  </div>
                  <span className="badge-recom">Sandbox Testing</span>
                </div>

                {servers.filter(s => s.id !== 'mock-sandbox').map((s) => (
                  <div 
                    key={s.id}
                    className={`server-item ${selectedServerId === s.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedServerId(s.id);
                      setTestResult(null);
                    }}
                  >
                    <div className="flex align-center gap-3">
                      <div className="server-icon-box">
                        <Server size={16} />
                      </div>
                      <div>
                        <h4 className="server-info-title">{s.name}</h4>
                        <p className="server-info-subtitle">Host: {s.host}:{s.port} • User: {s.username}</p>
                      </div>
                    </div>
                    <div className="flex align-center gap-2">
                      <button 
                        className="server-trash-btn"
                        onClick={(e) => handleDeleteServer(s.id, e)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SSH Connection Test Panel */}
              <div className="ssh-test-panel">
                <div className="ssh-test-info">
                  <div className="ssh-test-indicator"></div>
                  <div>
                    <h5 className="ssh-test-title">Verify Server Connectivity</h5>
                    <p className="ssh-test-subtitle">Runs authentication handshakes with target credentials</p>
                  </div>
                </div>
                <div className="ssh-test-actions">
                  {testResult && (
                    <span className={`badge-test-result ${testResult.success ? 'success' : 'fail'}`}>
                      {testResult.message}
                    </span>
                  )}
                  <button 
                    className="sec-btn"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                    onClick={handleTestServer}
                    disabled={testingConnection}
                  >
                    {testingConnection ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                    Test Handshake
                  </button>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button 
                  className="sec-btn"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button 
                  className="gradient-btn"
                  onClick={() => setStep(3)}
                >
                  Configure Repository <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: GIT INPUT FORM */}
          {step === 3 && (
            <div>
              <div className="mb-8">
                <span className="badge-step">Step 3 of 6</span>
                <h2 className="title-large mt-3">Link Git Repository</h2>
                <p className="desc-text">Provide the GitHub clone URL of your {techStack === 'laravel' ? 'Laravel' : techStack === 'nuxt' ? 'Nuxt.js' : techStack === 'golang' ? 'Go (Golang)' : 'static website'} repository.</p>
              </div>
 
              <div className="space-y-6">
                <div className="form-group">
                  <label className="form-label">GitHub Repository URL (HTTPS or SSH)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="https://github.com/username/project.git"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                  <p className="form-input-info">Note: Ensure repository is public, or that your SSH key is authorized in your GitHub configurations.</p>
                </div>
 
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Branch to Deploy</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="master"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tech Stack Framework</label>
                    <div className="form-input" style={{ opacity: 0.85, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: techStack === 'laravel' ? '#ef4444' : techStack === 'nuxt' ? '#38bdf8' : techStack === 'golang' ? '#00add8' : '#34d399' 
                      }}></span>
                      {techStack === 'laravel' ? 'Laravel PHP Framework' : techStack === 'nuxt' ? 'Nuxt.js Framework' : techStack === 'golang' ? 'Go (Golang) Application' : 'Static HTML / JS Site'}
                    </div>
                  </div>
                </div>

                {(techStack === 'golang' || techStack === 'nuxt') && (
                  <div className="form-group">
                    <label className="form-label">Custom App Name (Optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={techStack === 'golang' ? 'e.g. my-go-api (default: golang-{directory})' : 'e.g. my-nuxt-app (default: nuxt-{directory})'}
                      value={customAppName}
                      onChange={(e) => setCustomAppName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    />
                    <p className="form-input-info">
                      Used as the PM2 process name (Nuxt) or Systemd service unit name (Golang). Alphanumerics, hyphens, and underscores only.
                    </p>
                  </div>
                )}

                {techStack === 'golang' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label className="form-label">Service Port</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ flexGrow: 1 }}
                            placeholder="8080"
                            value={nuxtPort}
                            onChange={(e) => {
                              setNuxtPort(e.target.value);
                              setPortStatus(null);
                            }}
                          />
                          <button 
                            type="button"
                            className="sec-btn"
                            style={{ padding: '0 12px', fontSize: '11px', height: '42px', minWidth: '100px', whiteSpace: 'nowrap' }}
                            onClick={checkPortAvailability}
                            disabled={isPortChecking}
                          >
                            {isPortChecking ? <Loader2 className="animate-spin" size={12} /> : 'Check Port'}
                          </button>
                        </div>
                        {portStatus === 'available' && (
                          <p className="form-input-info" style={{ color: '#34d399', fontSize: '10px', marginTop: '4px' }}>
                            🟢 Port {nuxtPort} is free and ready to use!
                          </p>
                        )}
                        {portStatus === 'taken' && (
                          <p className="form-input-info" style={{ color: '#f87171', fontSize: '10px', marginTop: '4px' }}>
                            🔴 Port {nuxtPort} is currently in use! Choose another port.
                          </p>
                        )}
                        {portStatus === 'error' && (
                          <p className="form-input-info" style={{ color: '#f87171', fontSize: '10px', marginTop: '4px' }}>
                            ⚠️ {portErrorMsg || 'Port check failed. Make sure port is a valid number.'}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        <span>
                          <strong>Go Port Config</strong>: This port will be automatically written into a <code>.env</code> file under the variable <code>PORT</code> in your domain root folder, allowing your Golang app to listen to it dynamically.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {techStack === 'nuxt' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label className="form-label">Package Manager</label>
                        <select 
                          className="form-input" 
                          value={packageManager}
                          onChange={(e) => setPackageManager(e.target.value)}
                          style={{ height: '42px', padding: '0 12px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', width: '100%' }}
                        >
                          <option value="npm">npm</option>
                          <option value="pnpm">pnpm</option>
                          <option value="bun">bun</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">SSR Server Port</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ flexGrow: 1, opacity: nuxtPreset === 'ssg' ? 0.35 : 1 }}
                            placeholder="3000"
                            value={nuxtPort}
                            onChange={(e) => {
                              setNuxtPort(e.target.value);
                              setPortStatus(null);
                            }}
                            disabled={nuxtPreset === 'ssg'}
                          />
                          <button 
                            type="button"
                            className="sec-btn"
                            style={{ padding: '0 12px', fontSize: '11px', height: '42px', minWidth: '100px', whiteSpace: 'nowrap' }}
                            onClick={checkPortAvailability}
                            disabled={isPortChecking || nuxtPreset === 'ssg'}
                          >
                            {isPortChecking ? <Loader2 className="animate-spin" size={12} /> : 'Check Port'}
                          </button>
                        </div>
                        {nuxtPreset === 'ssg' ? (
                          <p className="form-input-info" style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '4px' }}>
                            ℹ️ Port is not required for Static SSG deployments.
                          </p>
                        ) : (
                          <>
                            {portStatus === 'available' && (
                              <p className="form-input-info" style={{ color: '#34d399', fontSize: '10px', marginTop: '4px' }}>
                                🟢 Port {nuxtPort} is free and ready to use!
                              </p>
                            )}
                            {portStatus === 'taken' && (
                              <p className="form-input-info" style={{ color: '#f87171', fontSize: '10px', marginTop: '4px' }}>
                                🔴 Port {nuxtPort} is currently in use! Choose another port.
                              </p>
                            )}
                            {portStatus === 'error' && (
                              <p className="form-input-info" style={{ color: '#f87171', fontSize: '10px', marginTop: '4px' }}>
                                ⚠️ {portErrorMsg || 'Port check failed. Make sure port is a valid number.'}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Deployment Preset (Target)</label>
                        <select 
                          className="form-input" 
                          value={nuxtPreset}
                          onChange={(e) => {
                            setNuxtPreset(e.target.value);
                            setPortStatus(null);
                          }}
                          style={{ height: '42px', padding: '0 12px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', width: '100%' }}
                        >
                          <option value="ssr">Server SSR (PM2 Node.js / ecosystem.config.cjs)</option>
                          <option value="ssg">Static SSG (Static Site Generation / generate)</option>
                        </select>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {nuxtPreset === 'ssr' ? (
                          <span>
                            <strong>Server SSR Target</strong>: Compiles codebase using <code>build</code>, dynamically writes <code>ecosystem.config.cjs</code> with assigned port, launches via PM2, and runs <code>git stash -u</code> to prevent merge conflicts.
                          </span>
                        ) : (
                          <span>
                            <strong>Static SSG Target</strong>: Compiles static static folder using <code>generate</code> and copies the build folder directly to your webroot for instantaneous static delivery.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Target server metadata preview */}
                <div className="flex align-center gap-3" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-indigo)' }}>
                    <Server size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Target Host Deployment Target:</span>
                    <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {activeServer.name} ({activeServer.host})
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button 
                  className="sec-btn"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button 
                  className="gradient-btn"
                  onClick={handleDeployClone}
                >
                  <GitBranch size={14} /> Clone Repository <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CLONE REAL-TIME LOGS TERMINAL */}
          {step === 4 && (
            <div>
              <div className="mb-6">
                <div className="flex align-center justify-between" style={{ flexWrap: 'wrap' }}>
                  <div>
                    <span className="badge-step">Step 4 of 6</span>
                    <h2 className="title-large mt-3">Executing Shell Commands</h2>
                    <p className="desc-text">Real-time console output from target host execution.</p>
                  </div>
                  <div className="terminal-status-banner">
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status:</span>
                    <span className={`badge-status ${
                      deployStatus === 'failed' ? 'failed' :
                      deployStatus === 'cloned' || deployStatus === 'setup_completed' || deployStatus === 'deployed' ? 'success' :
                      'running'
                    }`}>
                      {(deployStatus === 'running' || deployStatus === 'setup_running' || deployStatus === 'deploying') && (
                        <Loader2 className="animate-spin" size={10} />
                      )}
                      {deployStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom logs terminal element */}
              <div className="terminal-window">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                  </div>
                  <div className="terminal-title">bash — deployer@{activeServer.host}</div>
                  <div style={{ width: '40px' }}></div>
                </div>
                <div className="terminal-body scrollbar-thin">
                  {logs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                      <Loader2 className="animate-spin" size={14} /> Initializing SSH logging streams...
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="terminal-log-row">
                        {log}
                      </div>
                    ))
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

              <div className="mt-8 flex justify-between align-center">
                <div>
                  {deployStatus === 'failed' && (
                    <button 
                      className="sec-btn"
                      style={{ color: 'var(--accent-red)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                      onClick={resetDeployment}
                    >
                      Reset & Retry
                    </button>
                  )}
                </div>
                <div>
                  {deployStatus === 'cloned' && (
                    techStack === 'laravel' ? (
                      <button 
                        className="gradient-btn"
                        onClick={handleComposerSetup}
                      >
                        <TerminalIcon size={14} /> Run Composer Setup <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button 
                        className="gradient-btn"
                        onClick={handleGoToDomainRoot}
                      >
                        <FolderOpen size={14} /> Choose Target Root <ArrowRight size={14} />
                      </button>
                    )
                  )}
                  {deployStatus === 'setup_completed' && (
                    <button 
                      className="gradient-btn"
                      onClick={handleGoToDomainRoot}
                    >
                      <FolderOpen size={14} /> Choose Target Root <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: COMPOSER SETUP LOGS */}
          {step === 5 && (
            <div>
              <div className="mb-6">
                <div className="flex align-center justify-between" style={{ flexWrap: 'wrap' }}>
                  <div>
                    <span className="badge-step">Step 4 of 5</span>
                    <h2 className="title-large mt-3">Laravel Setup & Dependencies</h2>
                    <p className="desc-text">Installing composer packages, setting keys, and compiling setups.</p>
                  </div>
                  <div className="terminal-status-banner">
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status:</span>
                    <span className={`badge-status ${
                      deployStatus === 'failed' ? 'failed' :
                      deployStatus === 'setup_completed' ? 'success' :
                      'running'
                    }`}>
                      {deployStatus === 'setup_running' && <Loader2 className="animate-spin" size={10} />}
                      {deployStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Composer Terminal Console logs */}
              <div className="terminal-window">
                <div className="terminal-header">
                  <div className="terminal-dots">
                    <div className="terminal-dot red"></div>
                    <div className="terminal-dot yellow"></div>
                    <div className="terminal-dot green"></div>
                  </div>
                  <div className="terminal-title">composer install — deployer@{activeServer.host}</div>
                  <div style={{ width: '40px' }}></div>
                </div>
                <div className="terminal-body scrollbar-thin">
                  {logs.map((log, index) => (
                    <div key={index} className="terminal-log-row">
                      {log}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                {deployStatus === 'setup_completed' ? (
                  <button 
                    className="gradient-btn"
                    onClick={handleGoToDomainRoot}
                  >
                    <FolderOpen size={14} /> Choose Target Root <ArrowRight size={14} />
                  </button>
                ) : deployStatus === 'failed' ? (
                  <button 
                    className="sec-btn"
                    style={{ color: 'var(--accent-red)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                    onClick={resetDeployment}
                  >
                    Reset & Restart
                  </button>
                ) : (
                  <button className="gradient-btn" disabled>
                    <Loader2 className="animate-spin" size={14} /> Setting up Laravel...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: ENVIRONMENT CONFIGURATION (.ENV) */}
          {step === 6 && (
            <div>
              <div className="mb-8">
                <span className="badge-step">Step 6 of 7</span>
                <h2 className="title-large mt-3">Configure Environment (.env)</h2>
                <p className="desc-text">Verify and modify your Go application's environment configurations before compiling.</p>
              </div>

              <div className="space-y-6">
                <div style={{ background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
                  <div className="flex justify-between align-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                      Raw .env File Editor
                    </span>
                    <span className="badge-status success" style={{ textTransform: 'none', letterSpacing: '0' }}>PORT: {nuxtPort || '8080'}</span>
                  </div>
                  <textarea
                    className="form-input"
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '13px', 
                      minHeight: '320px', 
                      lineHeight: '1.6', 
                      background: 'rgba(0,0,0,0.25)', 
                      border: '1px solid var(--border-glass)', 
                      borderRadius: '8px', 
                      color: '#f8fafc', 
                      width: '100%', 
                      padding: '15px',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                    value={envContent}
                    onChange={(e) => setEnvContent(e.target.value)}
                  />
                  <p className="form-input-info" style={{ marginTop: '12px', color: 'var(--text-muted)' }}>
                    Note: Ensure your <code>PORT</code> variable matches the selected port (<code>{nuxtPort || '8080'}</code>) so that Systemd routes and status checks pass correctly.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                <button 
                  className="sec-btn"
                  onClick={() => setStep(7)}
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button 
                  className="gradient-btn"
                  onClick={handleGoFinalizeDeploy}
                >
                  <Save size={14} /> Save & Finalize Deployment <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: SELECT DOMAIN ROOT DIRECTORY */}
          {step === 7 && (
            <div>
              <div className="mb-8">
                <span className="badge-step">Step 5 of 5</span>
                <h2 className="title-large mt-3">Select Website Root Directory</h2>
                <p className="desc-text">Specify which website root directory in `/www/wwwroot` to host your code files.</p>
              </div>

              <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '10px' }}>Available Folders in `/www/wwwroot`</label>
                  
                  {folders.length === 0 ? (
                    <div style={{ border: '1px dashed var(--border-glass)', borderRadius: '12px', padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      No active directory structures found in `/www/wwwroot`. Create a new website folder below.
                    </div>
                  ) : (
                    <div className="folder-grid pr-1">
                      {folders.map((f, i) => (
                        <div 
                          key={i}
                          className={`folder-item ${selectedFolder === f && newFolderName.trim() === '' ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedFolder(f);
                            setNewFolderName(''); // clear custom input
                          }}
                        >
                          <FolderOpen size={13} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Folder Creator */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <label className="form-label">Or Create a New Folder (e.g. domain name)</label>
                  <div style={{ position: 'relative' }}>
                    <span className="domain-create-prefix">/www/wwwroot/</span>
                    <input 
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '110px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                      placeholder="sub.domain.com"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                  </div>
                  <p className="form-input-info">
                    Recommended: Use domain name formats e.g. <code>app.myproject.com</code> or <code>mywebsite.xyz</code>
                  </p>
                </div>
                {techStack === 'golang' && (
                  <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="form-label">Select Main Entry File to Compile</label>
                    <select
                      className="form-input"
                      value={selectedGoFile}
                      onChange={(e) => setSelectedGoFile(e.target.value)}
                      style={{ height: '42px', padding: '0 12px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'var(--text-primary)', width: '100%' }}
                      disabled={isLoadingGoFiles}
                    >
                      {goFiles.map((file, idx) => (
                        <option key={idx} value={file}>{file}</option>
                      ))}
                    </select>
                    {isLoadingGoFiles ? (
                      <p className="form-input-info" style={{ color: 'var(--text-secondary)' }}>
                        <Loader2 className="animate-spin" size={10} style={{ display: 'inline', marginRight: '4px' }} /> Fetching available Go files from cloned repository...
                      </p>
                    ) : (
                      <p className="form-input-info">
                        The chosen file will be compiled into the service binary via <code>go build -o app_binary</code>.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between">
                <button 
                  className="sec-btn"
                  onClick={() => setStep(4)}
                >
                  <ArrowLeft size={14} /> Review Logs
                </button>
                <button 
                  className="gradient-btn"
                  onClick={handleFinalDeploy}
                  disabled={!selectedFolder && !newFolderName.trim()}
                >
                  <FolderPlus size={14} /> Copy Files & Finalize Deploy <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: FINAL CONGRATULATIONS SUCCESS SCREEN */}
          {step === 8 && (
            <div className="text-center" style={{ padding: '24px 0' }}>
              <div className="success-circle-container pulse-glow">
                <CheckCircle size={32} />
              </div>

              <h2 className="title-large" style={{ fontSize: '26px' }}>Deployment Success!</h2>
              <p className="desc-text" style={{ maxWidth: '400px', margin: '8px auto 0 auto' }}>
                Your application has been deployed successfully to the server environment.
              </p>

              {/* Success metadata table */}
              <div className="success-details-box">
                <div className="success-details-row">
                  <span className="success-details-label">Deployed Stack:</span>
                  <span className="success-details-val" style={{ color: techStack === 'golang' ? '#00add8' : techStack === 'nuxt' ? '#38bdf8' : '#f87171', textTransform: 'capitalize' }}>
                    {techStack === 'static' ? 'Static HTML Site' : techStack === 'golang' ? 'Golang Service' : `${techStack} framework`}
                  </span>
                </div>
                <div className="success-details-row">
                  <span className="success-details-label">Server Host:</span>
                  <span className="success-details-val">{activeServer.name} ({activeServer.host})</span>
                </div>
                <div className="success-details-row">
                  <span className="success-details-label">Git Repository:</span>
                  <span className="success-details-val truncate" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={repoUrl}>
                    {repoUrl.replace('https://github.com/', '')}
                  </span>
                </div>
                <div className="success-details-row">
                  <span className="success-details-label">Branch Name:</span>
                  <span className="success-details-val" style={{ color: '#818cf8' }}>{branch}</span>
                </div>
                <div className="success-details-row">
                  <span className="success-details-label">Target Directory:</span>
                  <span className="success-details-val mono" style={{ color: '#34d399' }}>
                    /www/wwwroot/{newFolderName.trim() !== '' ? newFolderName.trim() : selectedFolder}
                  </span>
                </div>
                {techStack === 'golang' && (
                  <>
                    <div className="success-details-row" style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
                      <span className="success-details-label">Systemd Service:</span>
                      <span className="success-details-val mono" style={{ color: '#fbbf24' }}>
                        golang-{(newFolderName.trim() !== '' ? newFolderName.trim() : selectedFolder).replace(/[^a-zA-Z0-9]/g, '-')}.service
                      </span>
                    </div>
                    <div className="success-details-row">
                      <span className="success-details-label">Service Port:</span>
                      <span className="success-details-val mono" style={{ color: '#38bdf8' }}>
                        {nuxtPort || '8080'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 flex justify-center gap-4">
                <button 
                  className="sec-btn"
                  onClick={() => window.open(`http://${newFolderName.trim() !== '' ? newFolderName.trim() : selectedFolder}`, '_blank')}
                >
                  <Globe size={14} /> Open Web App
                </button>
                <button 
                  className="gradient-btn"
                  onClick={resetDeployment}
                >
                  Deploy Another Project <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Sleek Copyright Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px 0', marginTop: '60px', width: '100%' }}>
        <div className="app-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          <div>
            &copy; {new Date().getFullYear()} <strong>SynchronizeTeams</strong>. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Documentation</span>
          </div>
        </div>
      </footer>

      {/* CREATE SSH SERVER MODAL */}
      {showServerModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="title-large" style={{ fontSize: '18px' }}>Register Remote Server</h3>
            <p className="desc-text" style={{ fontSize: '11px', marginBottom: '24px' }}>Enter server configurations to establish an SSH connection pipeline.</p>

            <form onSubmit={handleCreateServer} className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Server Display Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="DigitalOcean VPS"
                  className="form-input" 
                  value={serverForm.name}
                  onChange={(e) => setServerForm({...serverForm, name: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flexGrow: 2, marginBottom: 0 }}>
                  <label className="form-label">Host IP / Address</label>
                  <input 
                    type="text" 
                    required
                    placeholder="159.203.1.25"
                    className="form-input" 
                    value={serverForm.host}
                    onChange={(e) => setServerForm({...serverForm, host: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ flexGrow: 1, width: '100px', marginBottom: 0 }}>
                  <label className="form-label">Port</label>
                  <input 
                    type="text" 
                    required
                    placeholder="22"
                    className="form-input" 
                    value={serverForm.port}
                    onChange={(e) => setServerForm({...serverForm, port: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SSH Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="root"
                  className="form-input" 
                  value={serverForm.username}
                  onChange={(e) => setServerForm({...serverForm, username: e.target.value})}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SSH Password (Optional if Key provided)</label>
                <input 
                  type="password" 
                  placeholder="••••••••••••••"
                  className="form-input" 
                  value={serverForm.password}
                  onChange={(e) => setServerForm({...serverForm, password: e.target.value})}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">SSH Private Key PEM (Optional if Pass provided)</label>
                <textarea 
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
                  className="form-input" 
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', height: '80px', resize: 'none' }}
                  value={serverForm.privateKey}
                  onChange={(e) => setServerForm({...serverForm, privateKey: e.target.value})}
                />
              </div>

              <div className="pt-4 flex flex-end" style={{ gap: '12px' }}>
                <button 
                  type="button" 
                  className="sec-btn"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                  onClick={() => setShowServerModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="gradient-btn"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Register Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
