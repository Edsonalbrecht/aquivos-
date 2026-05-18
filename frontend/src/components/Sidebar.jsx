import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  HomeIcon, UsersIcon, UserGroupIcon, ChartBarIcon,
  ClipboardDocumentListIcon, ArrowRightOnRectangleIcon,
  MapIcon, BriefcaseIcon, Bars3Icon, XMarkIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon, TrophyIcon, MegaphoneIcon, CameraIcon, PaperAirplaneIcon
} from '@heroicons/react/24/outline';

const NAV = [
  { to: '/app/dashboard',   icon: HomeIcon,                  label: 'Dashboard', adminOnly: true },
  { to: '/app/clients',     icon: UsersIcon,                 label: 'Clientes' },
  { to: '/app/contacts',    icon: UserGroupIcon,             label: 'Contatos' },
  { to: '/app/pipeline',    icon: ChartBarIcon,              label: 'Pipeline' },
  { to: '/app/activities',  icon: ClipboardDocumentListIcon, label: 'Atividades' },
  { to: '/app/goals',       icon: TrophyIcon,                label: 'Metas', adminOnly: true },
  { to: '/app/campaigns',   icon: MegaphoneIcon,             label: 'Campanhas' },
  { to: '/app/instagram',   icon: CameraIcon,                label: 'Instagram' },
  { to: '/app/telegram',   icon: PaperAirplaneIcon,         label: 'Telegram' },
  { to: '/app/sales-tools', icon: BriefcaseIcon,             label: 'Ferramentas' },
  { to: '/app/travel-map',  icon: MapIcon,                   label: 'Mapa' },
  { to: '/app/whatsapp',    icon: ChatBubbleLeftRightIcon,   label: 'WhatsApp' },
  { to: '/app/settings',    icon: Cog6ToothIcon,             label: 'Configurações' },
];

const NAV_BOTTOM = NAV.slice(0, 5); // 5 itens no bottom nav mobile

const activeStyle = {
  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
  color: '#a5b4fc',
  border: '1px solid rgba(99,102,241,0.25)',
  boxShadow: '0 0 15px rgba(99,102,241,0.1)',
};

const inactiveStyle = {
  background: 'transparent',
  color: '#64748b',
  border: '1px solid transparent',
};

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink to={to} onClick={onClick}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 10,
        textDecoration: 'none', fontSize: 13, fontWeight: 500,
        transition: 'all 0.15s',
        ...(isActive ? activeStyle : inactiveStyle),
      })}
    >
      <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
      {label}
    </NavLink>
  );
}

export default function Sidebar({ drawerOpen, onClose, onOpen }) {
  const { user, logout } = useAuth();
  const [logoUrl, setLogoUrl] = useState(null);
  const [companyName, setCompanyName] = useState('CandeiasNexus');

  useEffect(() => {
    api.get('/settings').then(r => {
      if (r.data.logo_url) setLogoUrl(`http://localhost:3001${r.data.logo_url}`);
      if (r.data.company_name) setCompanyName(r.data.company_name);
    }).catch(() => {});
  }, []);

  const logoSrc = logoUrl || '/logo.png';

  const Logo = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <img
        src={logoSrc}
        alt="logo"
        style={{ width: 140, height: 140, objectFit: 'contain', flexShrink: 0 }}
        onError={e => { e.target.style.display = 'none'; }}
      />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#f1f5f9', letterSpacing: '-0.3px' }}>{companyName}</p>
        <p style={{ margin: 0, fontSize: 9, color: '#6366f1', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>CRM</p>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────── */}
      <aside className="desktop-sidebar" style={{
        width: 240, flexShrink: 0,
        background: 'rgba(7,11,20,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo />
        </div>
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white',
            }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, background: 'transparent', color: '#475569', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
          >
            <ArrowRightOnRectangleIcon style={{ width: 14, height: 14 }} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── MOBILE HEADER ───────────────────────────────────────────── */}
      <header className="mobile-header" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(7,11,20,0.97)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
      }}>
        <Logo />
        <button onClick={onOpen} style={{
          width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
        }}>
          <Bars3Icon style={{ width: 20, height: 20 }} />
        </button>
      </header>

      {/* ── MOBILE DRAWER ───────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 60,
            width: 260,
            background: 'rgba(10,15,28,0.99)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(30px)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Logo />
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                <XMarkIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
              {NAV.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
                <NavItem key={item.to} {...item} onClick={onClose} />
              ))}
            </nav>
            <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'white' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                </div>
              </div>
              <button onClick={logout} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                fontSize: 13, color: '#94a3b8',
              }}>
                <ArrowRightOnRectangleIcon style={{ width: 16, height: 16 }} />
                Sair da conta
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────────────── */}
      <nav className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(7,11,20,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_BOTTOM.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '10px 4px', textDecoration: 'none', fontSize: 9,
            fontWeight: 600, transition: 'all 0.15s',
            color: isActive ? '#a5b4fc' : '#475569',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          })}>
            {({ isActive }) => (
              <>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <Icon style={{ width: 18, height: 18 }} />
                </div>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .desktop-sidebar { display: flex !important; }
        .mobile-header { display: none !important; }
        .mobile-bottom-nav { display: none !important; }

        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
      `}</style>
    </>
  );
}
