'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ItemNav {
  href: string
  etiqueta: string
  icono: string
}

const itemsNav: ItemNav[] = [
  { href: '/inicio',       icono: '⊞', etiqueta: 'Inicio'        },
  { href: '/pacientes',    icono: '👤', etiqueta: 'Pacientes'     },
  { href: '/medicos',      icono: '🩺', etiqueta: 'Médicos'       },
  { href: '/citas',        icono: '📅', etiqueta: 'Citas'         },
  { href: '/expedientes',  icono: '📋', etiqueta: 'Expedientes'   },
  { href: '/cobros',       icono: '💳', etiqueta: 'Cobros'        },
  { href: '/contabilidad', icono: '🧮', etiqueta: 'Contabilidad'  },
  { href: '/inventario',   icono: '📦', etiqueta: 'Inventario'    },
  { href: '/configuracion',icono: '⚙',  etiqueta: 'Configuración' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="ct-sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 32,
              height: 32,
              background: '#1a6bbd',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
          >
            🏥
          </div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontSize: 15 }}>ClinicaApp</div>
            <div style={{ color: '#5a8ab0', fontSize: 11 }}>Strategic Solutions GT</div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4">
        {itemsNav.map((item) => {
          const esActivo = pathname === item.href || (
            item.href !== '/configuracion' && pathname.startsWith(item.href)
          ) || (
            item.href === '/configuracion' && pathname.startsWith('/configuracion') && !pathname.startsWith('/configuracion/')
          )
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ct-sidebar-item${esActivo ? ' activo' : ''}`}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icono}</span>
              <span>{item.etiqueta}</span>
            </Link>
          )
        })}

        {/* Sub-ítems de Configuración */}
        {pathname.startsWith('/configuracion') && (
          <>
            <Link
              href="/configuracion/sucursales"
              className={`ct-sidebar-item${pathname.startsWith('/configuracion/sucursales') ? ' activo' : ''}`}
              style={{ paddingLeft: 44, fontSize: 13 }}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>📍</span>
              <span>Sucursales</span>
            </Link>
            <Link
              href="/configuracion/usuarios"
              className={`ct-sidebar-item${pathname.startsWith('/configuracion/usuarios') ? ' activo' : ''}`}
              style={{ paddingLeft: 44, fontSize: 13 }}
            >
              <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>👥</span>
              <span>Usuarios y Roles</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          color: '#5a8ab0',
          fontSize: 12,
        }}
      >
        Plan Trial · 30 días restantes
      </div>
    </aside>
  )
}
