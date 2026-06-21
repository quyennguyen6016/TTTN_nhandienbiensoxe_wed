import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, RefreshCw, UserCircle, X } from 'lucide-react';
import {
  CameraRecord, Owner, Pagination, RecognitionLog, RecognitionSummary, Vehicle,
  checkHealth, fetchCameras, fetchMyHistory, fetchOwners, fetchRecognitionHistory,
  fetchRecognitionSummary, fetchVehicles,
} from './api';
import { getAuthUser, clearAuth, isLoggedIn } from './auth';
import { Login }           from './components/Login';
import { Register }        from './components/Register';
import { Sidebar, ViewType } from './components/Sidebar';
import { Dashboard }       from './components/Dashboard';
import { Recognition }     from './components/Recognition';
import { CameraRealtime }  from './components/CameraRealtime';
import { History }         from './components/History';
import { Vehicles }        from './components/Vehicles';
import { Owners }          from './components/Owners';
import { Settings }        from './components/Settings';
import { MyProfilePage }   from './components/MyProfilePage';
import { LoadingState }    from './components/shared';

type AuthScreen  = 'login' | 'register' | 'app';
type ServerState = 'checking' | 'active' | 'offline';

const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: 50, totalCount: 0, totalPages: 1 };

function getInitialScreen(): AuthScreen {
  return isLoggedIn() ? 'app' : 'login';
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>(getInitialScreen);

  if (authScreen === 'login')
    return <Login onLogin={() => setAuthScreen('app')} onNavigateToRegister={() => setAuthScreen('register')} />;
  if (authScreen === 'register')
    return <Register onNavigateToLogin={() => setAuthScreen('login')} />;

  return <MainApp onLogout={() => { clearAuth(); setAuthScreen('login'); }} />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function MainApp({ onLogout }: { onLogout: () => void }) {
  const currentUser = getAuthUser();
  const isAdmin     = currentUser?.role === 'ADMIN';

  const [activeView,  setActiveView]  = useState<ViewType>(isAdmin ? 'dashboard' : 'my-profile');
  const [serverState, setServerState] = useState<ServerState>('checking');
  const [isLoading,   setIsLoading]   = useState(true);
  const [notice,      setNotice]      = useState<string | null>(null);

  // ADMIN state
  const [summary,  setSummary]  = useState<RecognitionSummary | null>(null);
  const [history,  setHistory]  = useState<RecognitionLog[]>([]);
  const [historyPagination, setHistoryPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [owners,   setOwners]   = useState<Owner[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [cameras,  setCameras]  = useState<CameraRecord[]>([]);

  // USER state — lịch sử xe của mình
  const [myHistory, setMyHistory] = useState<RecognitionLog[]>([]);
  const [myHistoryPagination, setMyHistoryPagination] = useState<Pagination>(EMPTY_PAGINATION);

  const activeCameras = useMemo(() => cameras.filter(c => c.isActive), [cameras]);

  useEffect(() => {
    if (activeView !== 'vehicles' || isLoading || !isAdmin) return;
    fetchOwners().then(setOwners).catch(() => {});
  }, [activeView]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setIsLoading(true);
    try { await checkHealth(); setServerState('active'); }
    catch { setServerState('offline'); }

    try {
      if (isAdmin) {
        const [sum, histResult, own, veh, cam] = await Promise.all([
          fetchRecognitionSummary(),
          fetchRecognitionHistory({ page: 1, pageSize: 50 }),
          fetchOwners(),
          fetchVehicles(),
          fetchCameras(),
        ]);
        setSummary(sum);
        setHistory(histResult.logs);
        setHistoryPagination(histResult.pagination);
        setOwners(own); setVehicles(veh); setCameras(cam);
      } else {
        // USER: chỉ load lịch sử xe của mình — dùng fetchMyHistory() để
        // imagePath/annotatedImagePath được chuyển thành URL đầy đủ
        const { logs, pagination } = await fetchMyHistory(1, 50);
        setMyHistory(logs);
        setMyHistoryPagination(pagination);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    } finally {
      setIsLoading(false);
    }
  }

  // USER chuyển trang lịch sử (ADMIN tự xử lý trong History.tsx qua fetchRecognitionHistory)
  async function handleMyHistoryPageChange(page: number) {
    try {
      const { logs, pagination } = await fetchMyHistory(page, myHistoryPagination.pageSize);
      setMyHistory(logs);
      setMyHistoryPagination(pagination);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Không tải được trang.');
    }
  }

  function addLog(log: RecognitionLog) {
    if (isAdmin) setHistory(prev => [log, ...prev.filter(i => i.id !== log.id)]);
    else setMyHistory(prev => [log, ...prev.filter(i => i.id !== log.id)]);
  }
  function bumpSummary() {
    setSummary(s => s ? { ...s, totalLogs: s.totalLogs + 1 } : s);
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onLogout={onLogout}
        isAdmin={isAdmin}
      />

      <div className="main-shell">
        {/* ── Topbar ─────────────────────────────────────────────────── */}
        <header className="topbar">
          <div className="topbar-right" style={{ marginLeft: 'auto' }}>
            <div className={`status-badge${
              serverState === 'offline' ? ' offline' :
              serverState === 'checking' ? ' checking' : ''
            }`}>
              <span className="status-dot pulse" />
              {serverState === 'active' ? 'System Online' :
               serverState === 'offline' ? 'API Offline' : 'Checking...'}
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
                <div className="user-info-name">
                  {(currentUser?.username || 'USER').toUpperCase()}
                </div>
                <div className="user-info-role">{currentUser?.role || 'USER'}</div>
              </div>
              <div
                className="user-avatar"
                title="Hồ sơ của tôi"
                onClick={() => setActiveView('my-profile')}
                style={{ cursor: 'pointer' }}
              >
                <UserCircle size={15} />
              </div>
            </div>
          </div>
        </header>

        {/* ── Notice ──────────────────────────────────────────────────── */}
        {notice && (
          <div className="notice-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} />{notice}
            </div>
            <button onClick={() => setNotice(null)} title="Đóng"><X size={15} /></button>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────── */}
        <main className="page-content">
          {isLoading ? <LoadingState /> : (
            <>
              {/* Trang dùng chung */}
              {activeView === 'my-profile' && (
                <MyProfilePage onNotice={setNotice} />
              )}
              {activeView === 'recognition' && (
                <Recognition onNewLog={addLog} onBumpSummary={bumpSummary} onNotice={setNotice} />
              )}
              {activeView === 'camera' && (
                <CameraRealtime
                  activeCameras={activeCameras}
                  onNewLog={addLog}
                  onBumpSummary={bumpSummary}
                  onNotice={setNotice}
                />
              )}

              {/* Lịch sử:
                  - ADMIN thấy toàn bộ log + filter camera + tự fetch khi đổi trang
                  - USER thấy lịch sử xe của mình, đổi trang qua handleMyHistoryPageChange */}
              {activeView === 'history' && isAdmin && (
                <History
                  history={history}
                  cameras={cameras}
                  onHistoryChange={setHistory}
                  onNotice={setNotice}
                  pagination={historyPagination}
                  onPageChange={page => setHistoryPagination(p => ({ ...p, page }))}
                  onPaginationUpdate={setHistoryPagination}
                />
              )}
              {activeView === 'history' && !isAdmin && (
                <History
                  history={myHistory}
                  cameras={[]}
                  onHistoryChange={setMyHistory}
                  onNotice={setNotice}
                  readOnly
                  pagination={myHistoryPagination}
                  onPageChange={handleMyHistoryPageChange}
                />
              )}

              {/* Chỉ ADMIN */}
              {isAdmin && activeView === 'dashboard' && (
                <Dashboard
                  summary={summary}
                  history={history}
                  onNavigate={setActiveView}
                  onReload={loadAll}
                />
              )}
              {isAdmin && activeView === 'vehicles' && (
                <Vehicles
                  vehicles={vehicles}
                  owners={owners}
                  onVehiclesChange={setVehicles}
                  onOwnersChange={setOwners}
                  onNavigateToOwners={() => setActiveView('owners')}
                  onNotice={setNotice}
                  isAdmin={isAdmin}
                />
              )}
              {isAdmin && activeView === 'owners' && (
                <Owners
                  owners={owners}
                  onOwnersChange={setOwners}
                  onNotice={setNotice}
                  isAdmin={isAdmin}
                />
              )}
              {isAdmin && activeView === 'settings' && (
                <Settings
                  cameras={cameras}
                  serverState={serverState}
                  onCamerasChange={setCameras}
                  onNotice={setNotice}
                />
              )}
            </>
          )}
        </main>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="app-footer">
          <div style={{ display: 'flex', gap: 24 }}>
            <span>Security: AES-256 Active</span>
            <span>Link: Stable</span>
          </div>
          <span>PlateVision AI • {currentUser?.role} • {currentUser?.username}</span>
        </footer>
      </div>
    </div>
  );
}