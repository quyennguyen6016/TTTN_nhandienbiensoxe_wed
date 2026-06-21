import { FormEvent, useEffect, useState } from 'react';
import { Car, Lock, Mail, MapPin, Phone, Plus, Save, ShieldCheck, Trash2, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
function getToken() { return sessionStorage.getItem('pv_token'); }
function authHeader() { return { Authorization: `Bearer ${getToken()}` }; }

interface MyVehicle {
  id: number;
  plateNumber: string;
  vehicleType: string | null;
  brand: string | null;
  color: string | null;
  province: string | null;
}

interface MyProfile {
  id: number; username: string; fullName: string | null;
  email: string | null; role: string;
  owner: { id: number; fullName: string; phone: string | null; email: string | null; address: string | null; vehicles: MyVehicle[]; } | null;
}

const emptyVehicle = { plateNumber: '', vehicleType: 'Xe máy', brand: '', color: '', province: '' };

interface MyProfilePageProps { onNotice: (msg: string) => void; }

export function MyProfilePage({ onNotice }: MyProfilePageProps) {
  const [profile,   setProfile]   = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving,  setIsSaving]  = useState(false);
  const [isAdding,  setIsAdding]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [address,  setAddress]  = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');

  // Add vehicle form
  const [vForm, setVForm] = useState(emptyVehicle);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setIsLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/me`, { headers: authHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProfile(data.data);
      setFullName(data.data.fullName || '');
      setEmail(data.data.email || '');
      setPhone(data.data.owner?.phone || '');
      setAddress(data.data.owner?.address || '');
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Không tải được thông tin.');
    } finally { setIsLoading(false); }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const body: Record<string, string> = { fullName, email, phone, address };
      if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw; }
      const res = await fetch(`${API_BASE}/api/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onNotice('Đã cập nhật thông tin thành công.');
      setCurrentPw(''); setNewPw('');
      loadProfile();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Cập nhật thất bại.');
    } finally { setIsSaving(false); }
  }

  async function handleAddVehicle(e: FormEvent) {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch(`${API_BASE}/api/me/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(vForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onNotice(`Đã thêm xe ${vForm.plateNumber}.`);
      setVForm(emptyVehicle); setShowForm(false);
      loadProfile();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Thêm xe thất bại.');
    } finally { setIsAdding(false); }
  }

  async function handleDeleteVehicle(v: MyVehicle) {
    if (!window.confirm(`Xóa xe ${v.plateNumber}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/me/vehicles/${v.id}`, {
        method: 'DELETE', headers: authHeader(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      onNotice(`Đã xóa xe ${v.plateNumber}.`);
      loadProfile();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Xóa xe thất bại.');
    }
  }

  if (isLoading) return <div className="loading-state"><span>Đang tải...</span></div>;

  return (
    <div>
      <div className="page-header">
        <h2>Hồ sơ của tôi</h2>
        <p>[Profile: {profile?.username?.toUpperCase()}]</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20, alignItems: 'start' }}>

        {/* ── Thông tin cá nhân ── */}
        <div className="card">
          <div className="card-header">
            <div><h3>Thông tin cá nhân</h3><p>Cập nhật họ tên, liên hệ và địa chỉ.</p></div>
          </div>
          <form onSubmit={handleSaveProfile} className="form-grid">
            {[
              { label: 'Họ và tên', icon: User,   value: fullName, onChange: setFullName, placeholder: 'Nguyễn Ngọc Quyền' },
              { label: 'Email',     icon: Mail,   value: email,    onChange: setEmail,    placeholder: 'email@example.com', type: 'email' },
              { label: 'Số điện thoại', icon: Phone, value: phone, onChange: setPhone,   placeholder: '091xxxxxxx' },
            ].map(({ label, icon: Icon, value, onChange, placeholder, type }) => (
              <label className="form-label" key={label}>
                {label}
                <div style={{ position: 'relative' }}>
                  <Icon size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} style={{ paddingLeft: 32 }} placeholder={placeholder} />
                </div>
              </label>
            ))}
            <label className="form-label wide">
              Địa chỉ
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input value={address} onChange={e => setAddress(e.target.value)} style={{ paddingLeft: 32 }} placeholder="Phường, Quận, Tỉnh..." />
              </div>
            </label>

            {/* Đổi mật khẩu */}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1', fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>
                Đổi mật khẩu (để trống nếu không đổi)
              </div>
              {[
                { label: 'Mật khẩu hiện tại', value: currentPw, onChange: setCurrentPw },
                { label: 'Mật khẩu mới',      value: newPw,     onChange: setNewPw },
              ].map(({ label, value, onChange }) => (
                <label className="form-label" key={label}>
                  {label}
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="password" value={value} onChange={e => onChange(e.target.value)} style={{ paddingLeft: 32 }} placeholder="••••••••" />
                  </div>
                </label>
              ))}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button className="btn btn-primary" type="submit" disabled={isSaving}>
                {isSaving ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} /> : <Save size={14} />}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>

        {/* ── Xe của tôi ── */}
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Role badge */}
          <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '2px solid var(--accent)' }}>
            <div className="config-item-icon" style={{ width: 34, height: 34 }}><ShieldCheck size={15} /></div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--font-mono)' }}>Role</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{profile?.role}</div>
            </div>
          </div>

          {/* Danh sách xe */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Xe của tôi</h3>
                <p>{profile?.owner?.vehicles.length ?? 0} xe đã đăng ký</p>
              </div>
              <button className="btn btn-accent-outline" onClick={() => setShowForm(f => !f)} style={{ padding: '6px 12px' }}>
                <Plus size={13} /> Thêm xe
              </button>
            </div>

            {/* Form thêm xe */}
            {showForm && (
              <form onSubmit={handleAddVehicle} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Biển số *', key: 'plateNumber', placeholder: '30A-123.45' },
                    { label: 'Loại xe',   key: 'vehicleType', placeholder: 'Xe máy' },
                    { label: 'Hãng xe',   key: 'brand',       placeholder: 'Honda' },
                    { label: 'Màu xe',    key: 'color',       placeholder: 'Đen' },
                  ].map(({ label, key, placeholder }) => (
                    <label className="form-label" key={key} style={{ fontSize: 9 }}>
                      {label}
                      <input
                        value={(vForm as any)[key]}
                        onChange={e => setVForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        required={key === 'plateNumber'}
                      />
                    </label>
                  ))}
                  <label className="form-label wide" style={{ fontSize: 9 }}>
                    Tỉnh/thành
                    <input value={vForm.province} onChange={e => setVForm(f => ({ ...f, province: e.target.value }))} placeholder="Hà Nội" />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" type="submit" disabled={isAdding} style={{ flex: 1, justifyContent: 'center' }}>
                    {isAdding ? '...' : 'Lưu xe'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Hủy</button>
                </div>
              </form>
            )}

            {/* Danh sách */}
            {profile?.owner?.vehicles.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                Chưa có xe nào. Nhấn <strong>Thêm xe</strong> để đăng ký.
              </div>
            ) : (
              <div style={{ padding: '12px 16px', display: 'grid', gap: 8 }}>
                {profile?.owner?.vehicles.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: '2px solid var(--accent)', borderRadius: 8 }}>
                    <Car size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontStyle: 'italic' }}>{v.plateNumber}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {[v.vehicleType, v.brand, v.color, v.province].filter(Boolean).join(' · ') || '--'}
                      </div>
                    </div>
                    <button className="btn-icon danger" onClick={() => handleDeleteVehicle(v)} title="Xóa">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
