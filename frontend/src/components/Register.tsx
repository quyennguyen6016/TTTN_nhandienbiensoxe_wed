import { useState } from 'react';
import { ArrowLeft, ChevronRight, Fingerprint, Lock, Mail, ShieldAlert, User } from 'lucide-react';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

export function Register({ onNavigateToLogin }: RegisterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setDone(true);
      setTimeout(() => onNavigateToLogin(), 1800);
    }, 1600);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: .12, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }} />

      <div style={{ width: '100%', maxWidth: 680, position: 'relative', zIndex: 1, animation: 'fadeUp .35s ease' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
        }}>

          {/* ── Left info panel ───────────────────────────────────────── */}
          <div style={{
            background: 'var(--accent-dim)',
            borderRight: '1px solid var(--border)',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* faint grid */}
            <div style={{ position: 'absolute', inset: 0, opacity: .15, pointerEvents: 'none', backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <button
                onClick={onNavigateToLogin}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  fontSize: 10, fontWeight: 900, color: 'var(--accent)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '.1em',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 40,
                  padding: 0,
                }}
              >
                <ArrowLeft size={13} /> Quay lại
              </button>

              <div style={{
                width: 48, height: 48,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: 16,
                boxShadow: '0 0 20px rgba(14,165,233,.1)',
              }}>
                <Fingerprint size={22} />
              </div>

              <h2 style={{
                fontSize: 16, fontWeight: 900, color: 'var(--text)',
                textTransform: 'uppercase', letterSpacing: '.06em',
                lineHeight: 1.3, margin: '0 0 12px',
              }}>
                Yêu cầu quyền truy cập
              </h2>
              <p style={{
                fontSize: 11, color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.65, margin: 0,
              }}>
                Dành riêng cho nhân viên vận hành và quản trị viên hệ thống PlateVision.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 14, position: 'relative', zIndex: 1 }}>
              {[
                { icon: ShieldAlert, color: '#34d399', text: 'Xác thực 2 yếu tố mặc định' },
                { icon: ShieldAlert, color: 'var(--accent)', text: 'Mã hóa dữ liệu đầu cuối' },
              ].map(({ icon: Icon, color, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={15} style={{ color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right form panel ──────────────────────────────────────── */}
          <div style={{ padding: 36 }}>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                Cấp ID mới
              </p>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>
                Thông tin nhân sự
              </h3>
              <div style={{ width: 36, height: 3, background: 'var(--accent)', borderRadius: 2, marginTop: 10 }} />
            </div>

            {done ? (
              <div style={{
                padding: '28px 20px',
                background: 'var(--green-dim)',
                border: '1px solid rgba(16,185,129,.2)',
                borderRadius: 10,
                textAlign: 'center',
                display: 'grid', gap: 10,
              }}>
                <div style={{ fontSize: 28 }}>✓</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Yêu cầu đã gửi thành công
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đang chuyển về trang đăng nhập...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
                {/* Username */}
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
                    Tên đăng nhập
                  </span>
                  <div style={{ position: 'relative' }}>
                    <User size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="text" required placeholder="vd: q_nguyen" style={{ paddingLeft: 34 }} />
                  </div>
                </label>

                {/* Email */}
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
                    Email công vụ
                  </span>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="email" required placeholder="name@company.com" style={{ paddingLeft: 34 }} />
                  </div>
                </label>

                {/* Password row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
                      Mật khẩu
                    </span>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input type="password" required style={{ paddingLeft: 34 }} />
                    </div>
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
                      Nhập lại
                    </span>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input type="password" required style={{ paddingLeft: 34 }} />
                    </div>
                  </label>
                </div>

                {/* Terms */}
                <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.7, margin: 0 }}>
                  Bằng cách nhấn đăng ký, bạn đồng ý với chính sách bảo mật dữ liệu và quyền hạn vận hành của hệ thống.
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '13px 20px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-dim)',
                    fontSize: 11, fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '.1em',
                    fontFamily: 'var(--font-mono)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? .55 : 1,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (!isLoading) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'; }}
                >
                  {isLoading ? (
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.25)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} />
                  ) : (
                    <>
                      Gửi yêu cầu đăng ký
                      <ChevronRight size={15} style={{ color: 'var(--accent)' }} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
