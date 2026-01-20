import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Home } from '@/pages/Home';
import { Threads } from '@/pages/Threads';
import { Timing } from '@/pages/Timing';
import { Templates } from '@/pages/Templates';

function NavItem({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="mr-8 flex items-center space-x-2">
            <span className="text-xl font-bold text-foreground">
              PostMaker X
            </span>
          </div>
          <nav className="flex items-center space-x-2">
            <NavItem to="/">Analyzer</NavItem>
            <NavItem to="/threads">Threads</NavItem>
            <NavItem to="/timing">Timing</NavItem>
            <NavItem to="/templates">Templates</NavItem>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/threads" element={<Threads />} />
          <Route path="/timing" element={<Timing />} />
          <Route path="/templates" element={<Templates />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
