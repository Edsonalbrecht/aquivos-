import { XMarkIcon } from '@heroicons/react/24/outline';

export default function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20,
        boxShadow: '0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1)',
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
      }} className="modal-box">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}
