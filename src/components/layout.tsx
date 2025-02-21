import { Header } from "@/components/header"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-6 py-4">
        <Header />
        <main className="mt-8">
          {children}
        </main>
      </div>
    </div>
  )
} 