import './globals.css'
export const metadata = {
  title: "Sistema de Ambulancias",
  description: "Sistema de control de flota de ambulancias"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="es">
      <body style={{fontFamily:"Arial, sans-serif"}}>
        {children}
      </body>
    </html>
  )
}
