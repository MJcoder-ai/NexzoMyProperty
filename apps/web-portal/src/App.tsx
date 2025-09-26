import React from 'react';
import { Button } from '@nexzo/ui';

export const App: React.FC = () => (
  <main className="min-h-screen bg-slate-50 p-6">
    <header className="mb-8">
      <h1 className="text-3xl font-semibold text-slate-900">Nexzo MyProperty</h1>
      <p className="text-slate-600">
        Responsive landlord & tenant experience scaffold. Replace with production implementation.
      </p>
    </header>
    <section className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-600">Show billing, energy allocation, and tenant actions.</p>
        <Button className="mt-4">Create Invoice</Button>
      </div>
      <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">AI Copilot</h2>
        <p className="text-sm text-slate-600">Chat timeline placeholder for agent interactions.</p>
      </aside>
    </section>
  </main>
);

App.displayName = 'App';
