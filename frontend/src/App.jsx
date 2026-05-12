import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import Home from './components/Home';
import Analytics from './components/Analytics';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <Link to="/" className="logo">
            <Link2 size={28} />
            TrimLink
          </Link>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/analytics/:code" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
