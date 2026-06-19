import { useState } from 'react';
import { ArrowRight, Cpu, Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { apiLogin, saveAuth } from '../auth';

interface LoginProps {
  onLogin: () => void;
  onNavigateToRegister: () => void;
}

export function Login({ onLogin, onNavigateToRegister }: LoginProps) {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await apiLogin(username.trim(), password);
      saveAuth(result.token, result.user);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .12, pointerEvents: 'none', backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div style={{ position: 'absolute', top: '20%', left: '-15%', width: 380, height: 380, background: 'rgba(14,165,233,.07)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'var(--accent-dim)', border: '1px solid rgba(14,165,233,.25)', borderRadius: 16, marginBottom: 16, boxShadow: '0 0 32px rgba(14,165,233,.15)' }}>
            <Cpu size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.06em', fontStyle: 'italic', margin: 0 }}>PlateVision AI</h1>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '.2em', textTransform: 'uppercase', marginTop: 6 }}>Security & Recognition Protocol</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 36 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.1em', margin: 0 }}>Đăng nhập hệ thống</h2>
            <div style={{ width: 40, height: 3, background: 'var(--accent)', borderRadius: 2, marginTop: 10 }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <label style={{ display: 'grid', gap: 7 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>Operator ID / Username</span>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="text" required placeholder="operator_01" value={username} onChange={e => setUsername(e.target.value)} style={{ paddingLeft: 36 }} />
              </div>
            </label>

            <label style={{ display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>Mật khẩu truy cập</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: 36, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            {/* Error */}
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,.25)', borderRadius: 8, fontSize: 12, color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ justifyContent: 'center', padding: '14px 20px', fontSize: 12, letterSpacing: '.15em', marginTop: 4 }}>
              {isLoading
                ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} />
                : <><ArrowRight size={16} /> Khởi chạy hệ thống</>
              }
            </button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Chưa có ID vận hành?</p>
            <button onClick={onNavigateToRegister} style={{ fontSize: 11, fontWeight: 900, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Đăng ký tài khoản mới
            </button>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} />
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.1em' }}>TLS 1.3 Secured</span>
          </div>
          <span style={{ width: 3, height: 3, background: 'var(--border)', borderRadius: '50%' }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.1em' }}>PV-CORE v4.0.2</span>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
