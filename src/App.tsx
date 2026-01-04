import { useState } from 'react';

import logo from '@/assets/logo.svg';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <header className="flex flex-col items-center gap-6">
        <img src={logo} className="w-32 h-32 animate-bounce" alt="logo" />
        <h1 className="text-4xl font-bold text-sky-400">Hello Vite + React + Tailwind!</h1>
        <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
          <button
            type="button"
            className="bg-sky-500 hover:bg-sky-400 px-6 py-2 rounded-lg font-semibold transition-colors"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is: {count}
          </button>
        </div>
        <p className="text-slate-400">
          Edit <code className="text-sky-300">src/App.tsx</code> and save to test HMR updates.
        </p>
        <div className="flex gap-4">
          <a
            className="text-sky-400 hover:text-sky-300 underline underline-offset-4"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          <span className="text-slate-600">|</span>
          <a
            className="text-sky-400 hover:text-sky-300 underline underline-offset-4"
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vite Docs
          </a>
        </div>
      </header>
    </div>
  );
}

export default App;
