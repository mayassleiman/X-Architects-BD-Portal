import React from "react";
import { Dashboard } from "./Dashboard";
import { Actions } from "./Actions";
import { Registrations } from "./Registrations";
import { Meetings } from "./Meetings";
import { Tasks } from "./Tasks";

export function FullReport() {
  return (
    <div className="space-y-12 p-8 bg-white text-black print:p-0">
      <div className="flex justify-end mb-4 no-print">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
        >
          Print to PDF
        </button>
      </div>

      <div className="text-center mb-12 border-b pb-8">
        <h1 className="text-4xl font-bold mb-2">BUSINESS DEVELOPMENT REPORT</h1>
        <p className="text-gray-500 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
      </div>

      <section className="break-inside-avoid">
        <h2 className="text-2xl font-bold mb-6 border-l-4 border-black pl-4 uppercase">Dashboard Overview</h2>
        <Dashboard />
      </section>

      <section className="break-inside-avoid page-break-before">
        <h2 className="text-2xl font-bold mb-6 border-l-4 border-black pl-4 uppercase">Action Items</h2>
        <Actions />
      </section>

      <section className="break-inside-avoid page-break-before">
        <h2 className="text-2xl font-bold mb-6 border-l-4 border-black pl-4 uppercase">Registrations</h2>
        <Registrations />
      </section>

      <section className="break-inside-avoid page-break-before">
        <h2 className="text-2xl font-bold mb-6 border-l-4 border-black pl-4 uppercase">Meetings Schedule</h2>
        <Meetings />
      </section>

      <section className="break-inside-avoid page-break-before">
        <h2 className="text-2xl font-bold mb-6 border-l-4 border-black pl-4 uppercase">Pipeline Tasks</h2>
        <Tasks />
      </section>
    </div>
  );
}
