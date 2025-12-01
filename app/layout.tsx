import './globals.css'
import { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}
