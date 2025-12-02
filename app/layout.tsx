import './globals.css'
import { Metadata } from 'next'
import ThemeToggle from './components/ThemeToggle'

export const metadata: Metadata = {
  title: 'Knowledge Sharing Planner',
  description: 'Plan your team knowledge sharing sessions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  )
}
