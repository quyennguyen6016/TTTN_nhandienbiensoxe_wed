import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, RefreshCw, Search, User, X } from 'lucide-react';
import {
  CameraRecord, Owner, RecognitionLog, RecognitionSummary, Vehicle,
  checkHealth, fetchCameras, fetchOwners, fetchRecognitionHistory,
  fetchRecognitionSummary, fetchVehicles,
} from './api';
import { Login }          from './components/Login';
import { Register }       from './components/Register';
import { Sidebar, ViewType } from './components/Sidebar';
import { Dashboard }       from './components/Dashboard';
import { Recognition }     from './components/Recognition';
import { CameraRealtime }  from './components/CameraRealtime';
import { History }         from './components/History';
import { Vehicles }        from './components/Vehicles';
import { Owners }          from './components/Owners';
import { Settings }        from './components/Settings';
import { LoadingState }    from './components/shared';

// ─── Auth state ───────────────────────────────────────────────────────────────
type AuthScreen = 'login' | 'register' | 'app';
type ServerState = 'checking' | 'active' | 'offline';

function getInitialAuthScreen(): AuthScreen {
  try {
    const session = sessionStorage.getItem('pv_auth');
    if (session) return 'app';
  } catch { /* noop */ }
  return 'login';
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialAuthScreen);

  // ── If not logged in, show auth screens ──────────────────────────────────
  if (authScreen === 'login') {
    return (
      <Login
        onLogin={() => setAuthScreen('app')}
        onNavigateToRegister={() => setAuthScreen('register')}
      />
    );
  }
  if (authScreen === 'register') {
    return (
      <Register
        onNavigateToLogin={() => setAuthScreen('login')}
      />
    );
  }

  // ── Main application ──────────────────────────────────────────────────────
  return <MainApp onLogout={() => { sessionStorage.removeItem('pv_auth'); setAuthScreen('login'); }} />;
}

// ─── Main App (separated so it only mounts after login) ───────────────────────
function MainApp({ onLogout }: { onLogout: () => void }) {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [serverState, setServerState] = useState<ServerState>('checking');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [summary,  setSummary]  = useState<RecognitionSummary | null>(null);
  const [history,  setHistory]  = useState<RecognitionLog[]>([]);
  const [owners,   setOwners]   = useState<Owner[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cameras,  setCameras]  = useState<CameraRecord[]>([]);

  const activeCameras = useMemo(() => cameras.filter(c => c.isActive), [cameras]);

  // Lấy username từ session
  const sessionUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('pv_auth') || '{}').username || 'Admin'; }
    catch { return 'Admin'; }
  })();

  useEffect(() => {
    if (activeView !== 'vehicles' || isLoading) return;
    fetchOwners().then(setOwners).catch(() => {});
  }, [activeView]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setIsLoading(true);
    try { await checkHealth(); setServerState('active'); }
    catch { setServerState('offline'); }
    try {
      const [sum, logs, own, veh, cam] = await Promise.all([
        fetchRecognitionSummary(),
        fetchRecognitionHistory({ limit: 50 }),
        fetchOwners(),
        fetchVehicles(),
        fetchCameras(),
      ]);
      setSummary(sum); setHistory(logs); setOwners(own); setVehicles(veh); setCameras(cam);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    } finally {
      setIsLoading(false);
    }
  }

  function addLog(log: RecognitionLog) {
    setHistory(prev => [log, ...prev.filter(i => i.id !== log.id)]);
  }
  function bumpSummary() {
    setSummary(s => s ? { ...s, totalLogs: s.totalLogs + 1 } : s);
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} onLogout={onLogout} />

      <div className="main-shell">
        {/* ── Topbar ─────────────────────────────────────────────────── */}
        <header className="topbar">
          <div className="topbar-search">
            <Search size={15} />
            <input type="text" placeholder="KHỐI DỮ LIỆU... [BIỂN SỐ / CHỦ XE]" />
          </div>

          <div className="topbar-right">
            <div className={`status-badge${serverState === 'offline' ? ' offline' : serverState === 'checking' ? ' checking' : ''}`}>
              <span className="status-dot pulse" />
              {serverState === 'active' ? 'System Online' : serverState === 'offline' ? 'API Offline' : 'Checking...'}
            </div>

            <div className="topbar-actions">
              <button className="icon-btn" onClick={loadAll} title="Tải lại">
                <RefreshCw size={15} />
              </button>
              <button className="icon-btn" title="Thông báo">
                <Bell size={15} />
                <span className="notif-dot" />
              </button>
            </div>

            <div className="user-info">
              <div className="user-info-text">
                <div className="user-info-name">{sessionUser.toUpperCase()}</div>
                <div className="user-info-role">Admin Node</div>
              </div>
              <div className="user-avatar" title="Đăng xuất" onClick={onLogout} style={{ cursor: 'pointer' }}>
                <User size={15} />
              </div>
            </div>
          </div>
        </header>

        {/* ── Notice banner ───────────────────────────────────────────── */}
        {notice && (
          <div className="notice-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} />
              {notice}
            </div>
            <button onClick={() => setNotice(null)} title="Đóng"><X size={15} /></button>
          </div>
        )}

        {/* ── Page content ────────────────────────────────────────────── */}
        <main className="page-content">
          {isLoading ? <LoadingState /> : (
            <>
              {activeView === 'dashboard'   && <Dashboard summary={summary} history={history} onNavigate={setActiveView} onReload={loadAll} />}
              {activeView === 'recognition' && <Recognition onNewLog={addLog} onBumpSummary={bumpSummary} onNotice={setNotice} />}
              {activeView === 'camera'      && <CameraRealtime activeCameras={activeCameras} onNewLog={addLog} onBumpSummary={bumpSummary} onNotice={setNotice} />}
              {activeView === 'history'     && <History history={history} cameras={cameras} onHistoryChange={setHistory} onNotice={setNotice} />}
              {activeView === 'vehicles'    && <Vehicles vehicles={vehicles} owners={owners} onVehiclesChange={setVehicles} onOwnersChange={setOwners} onNavigateToOwners={() => setActiveView('owners')} onNotice={setNotice} />}
              {activeView === 'owners'      && <Owners owners={owners} onOwnersChange={setOwners} onNotice={setNotice} />}
              {activeView === 'settings'    && <Settings cameras={cameras} serverState={serverState} onCamerasChange={setCameras} onNotice={setNotice} />}
            </>
          )}
        </main>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="app-footer">
          <div style={{ display: 'flex', gap: 24 }}>
            <span>Security: AES-256 Active</span>
            <span>Link: Stable</span>
          </div>
          <span>PlateVision AI Control Interface • Session ID: PV-992</span>
        </footer>
      </div>
    </div>
  );
}
