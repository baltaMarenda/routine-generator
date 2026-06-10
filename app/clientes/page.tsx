'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Plus, Search, User } from 'lucide-react'
import Link from 'next/link'
import { AuthButton } from '@/components/auth-button'

interface Client {
  id: string
  name: string
  createdAt: string
}

const DEMO_CLIENTS: Client[] = [
  { id: '1', name: 'Juan Pérez', createdAt: '2026-05-20' },
  { id: '2', name: 'María García', createdAt: '2026-05-18' },
  { id: '3', name: 'Carlos López', createdAt: '2026-05-15' },
]

const LOCAL_KEY = 'goblet_demo_clients'

export default function ClientsDashboard() {
  const { data: session } = useSession()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_KEY)
    if (saved) {
      setClients(JSON.parse(saved))
    } else {
      setClients(DEMO_CLIENTS)
      localStorage.setItem(LOCAL_KEY, JSON.stringify(DEMO_CLIENTS))
    }
  }, [])

  const handleCreateClient = () => {
    if (!newClientName.trim()) return

    const newClient: Client = {
      id: Date.now().toString(),
      name: newClientName.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    }

    const updated = [...clients, newClient]
    setClients(updated)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated))
    setNewClientName('')
    setIsDialogOpen(false)
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">GOBLET</h1>
              <p className="text-xs text-primary">FUERZA & MOVIMIENTO</p>
            </div>
          </div>

          <AuthButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Clientes</h2>
          <p className="text-muted-foreground">Gestiona las evaluaciones y rutinas de tus clientes</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear nuevo cliente</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Nombre del cliente"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateClient()}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateClient} disabled={!newClientName.trim()}>
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {filteredClients.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {search ? 'No se encontraron clientes' : 'No hay clientes aún'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'Intenta con otro término de búsqueda' : 'Crea tu primer cliente para comenzar'}
              </p>
              {!search && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredClients.map(client => (
              <Link key={client.id} href={`/cliente/${client.id}?name=${encodeURIComponent(client.name)}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer group h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center group-hover:bg-primary transition-colors">
                        <User className="h-6 w-6 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{client.name}</h3>
                        <p className="text-sm text-muted-foreground">Creado: {client.createdAt}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
