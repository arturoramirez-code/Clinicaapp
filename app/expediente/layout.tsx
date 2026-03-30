import Sidebar from '@/components/Sidebar'

export default function LayoutExpediente({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar top */}
        <header
          style={{
            height: 60,
            background: '#0d3d6e',
            borderBottom: '0.5px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#a8c8e8', fontSize: 14 }}>Clínica Dental Ejemplo</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#a8c8e8', fontSize: 13 }}>Dr. Administrador</span>
            <div
              style={{
                width: 32, height: 32, background: '#1a6bbd', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 600,
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* Área de contenido */}
        <main
          style={{
            flex: 1, padding: 24, background: '#f7faff',
            maxWidth: 1200, width: '100%',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
