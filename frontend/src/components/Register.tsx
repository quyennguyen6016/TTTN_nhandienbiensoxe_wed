import { useState } from 'react';
import { ArrowLeft, ChevronRight, Fingerprint, Lock, Mail, Phone, ShieldAlert, User } from 'lucide-react';
import { apiRegister } from '../auth';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 900, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '.1em',
  fontFamily: 'var(--font-mono)',
};

// ─── Field được định nghĩa BÊN NGOÀI Register ─────────────────────────────────
// Lý do quan trọng: nếu khai báo bên trong Register, mỗi lần re-render (gõ phím)
// React sẽ coi đây là component mới → unmount/remount input → mất focus sau mỗi ký tự.
// Khai báo ngoài giữ nguyên component instance giữa các lần render → focus không bị mất.
function Field({
  icon: Icon, label, type = 'text', placeholder, value, onChange,
}: {
  icon: typeof User;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ position: 'relative' }}>
        <Icon
          size={14}
          style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}
        />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingLeft: 34 }}
        />
      </div>
    </label>
  );
}

export function Register({ onNavigateToLogin }: RegisterProps) {
  const [form, setForm] = useState({
    username: '', fullName: '', email: '',
    phone: '', password: '', confirm: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Mật khẩu nhập lại không khớp.'); return; }
    if (form.password.length < 6)       { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    if (!form.fullName.trim())          { setError('Vui lòng nhập họ tên.'); return; }

    setIsLoading(true);
    try {
      await apiRegister({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        email:    form.email.trim(),
        phone:    form.phone.trim(),
      });
      setDone(true);
      setTimeout(() => onNavigateToLogin(), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .12, pointerEvents: 'none', backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

      <div style={{ width: '100%', maxWidth: 700, position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'grid', gridTemplateColumns: '220px 1fr' }}>

          {/* Left info panel */}
          <div style={{ background: 'var(--accent-dim)', borderRight: '1px solid var(--border)', padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: .15, pointerEvents: 'none', backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <button onClick={onNavigateToLogin} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 900, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)', marginBottom: 40, padding: 0 }}>
                <ArrowLeft size={13} /> Quay lại
              </button>
              <div style={{ width: 48, height: 48, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 16 }}>
                <Fingerprint size={22} />
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: 1.3, margin: '0 0 12px' }}>
                Tạo tài khoản
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.65, margin: 0 }}>
                Mỗi tài khoản là <strong style={{ color: 'var(--accent)' }}>1 chủ xe</strong>. Sau khi đăng ký bạn có thể thêm biển số xe của mình.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 14, position: 'relative', zIndex: 1 }}>
              {[
                { color: '#34d399', text: 'Tự quản lý xe của mình' },
                { color: 'var(--accent)', text: 'Xem lịch sử nhận diện' },
              ].map(({ color, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShieldAlert size={15} style={{ color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right form panel */}
          <div style={{ padding: 36 }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...labelStyle, marginBottom: 6 }}>Tạo hồ sơ mới</p>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>Thông tin chủ xe</h3>
              <div style={{ width: 36, height: 3, background: 'var(--accent)', borderRadius: 2, marginTop: 10 }} />
            </div>

            {done ? (
              <div style={{ padding: '28px 20px', background: 'var(--green-dim)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, textAlign: 'center', display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 32 }}>✓</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Đăng ký thành công!</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đang chuyển về trang đăng nhập...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field icon={User}  label="Tên đăng nhập *" placeholder="vd: q_nguyen"     value={form.username} onChange={v => set('username', v)} />
                  <Field icon={User}  label="Họ và tên *"     placeholder="Nguyễn Ngọc Quyền" value={form.fullName} onChange={v => set('fullName', v)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field icon={Mail}  label="Email"            placeholder="name@email.com"   value={form.email}   onChange={v => set('email', v)} />
                  <Field icon={Phone} label="Số điện thoại"    placeholder="091xxxxxxx"        value={form.phone}   onChange={v => set('phone', v)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field icon={Lock}  label="Mật khẩu *" type="password" placeholder="≥ 6 ký tự" value={form.password} onChange={v => set('password', v)} />
                  <Field icon={Lock}  label="Nhập lại *"  type="password" placeholder="••••••••"  value={form.confirm}  onChange={v => set('confirm', v)} />
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,.25)', borderRadius: 8, fontSize: 12, color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={isLoading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? .6 : 1, boxShadow: '0 0 16px var(--accent-glow)' }}>
                  {isLoading
                    ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} />
                    : <><ChevronRight size={15} /> Tạo tài khoản</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}