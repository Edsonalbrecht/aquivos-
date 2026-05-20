import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#070B14' }}>
      <Sidebar drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => setDrawerOpen(true)} />

      <main style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 768px) {
          main {
            padding-bottom: 72px !important;
            padding-top: 64px !important;
          }
        }
      `}</style>
    </div>
  );
}
