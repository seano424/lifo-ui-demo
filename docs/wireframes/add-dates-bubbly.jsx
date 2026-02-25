import { useState } from "react";

// ============================================================
// Bubbly Add Dates Component
// Redesigned untracked units alert + inline batch creation
// ============================================================

const AddDatesSection = ({ untrackedUnits = 38 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState(untrackedUnits.toString());
  const [rows, setRows] = useState([{ id: 1, date: "", qty: untrackedUnits.toString() }]);

  const addRow = () => {
    setRows([...rows, { id: Date.now(), date: "", qty: "" }]);
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id) => {
    if (rows.length > 1) setRows(rows.filter((r) => r.id !== id));
  };

  const totalAssigned = rows.reduce((sum, r) => sum + (parseInt(r.qty) || 0), 0);
  const remaining = untrackedUnits - totalAssigned;

  return (
    <div className="space-y-3">
      {/* ---- Collapsed pill banner ---- */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full group"
        >
          <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100/60 hover:border-violet-200 hover:shadow-sm hover:shadow-violet-100/50 transition-all duration-200">
            {/* Icon bubble */}
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 text-left">
              <p className="text-[14px] font-semibold text-slate-700">
                {untrackedUnits} units have no expiry date
              </p>
              <p className="text-[12px] text-violet-500 font-medium mt-0.5 flex items-center gap-1">
                Add Dates
                <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>

            {/* Count bubble */}
            <div className="w-8 h-8 rounded-full bg-violet-500 text-white text-[12px] font-bold flex items-center justify-center shadow-sm shadow-violet-200">
              {untrackedUnits}
            </div>
          </div>
        </button>
      )}

      {/* ---- Expanded state ---- */}
      {isExpanded && (
        <div className="rounded-2xl bg-gradient-to-b from-violet-50/80 to-white border border-violet-100/60 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-violet-50/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[14px] font-semibold text-slate-700">
                {untrackedUnits} units have no expiry date
              </p>
              <p className="text-[12px] text-violet-500 font-medium mt-0.5 flex items-center gap-1">
                Collapse
                <svg className="w-3 h-3 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-violet-500 text-white text-[12px] font-bold flex items-center justify-center shadow-sm shadow-violet-200">
              {untrackedUnits}
            </div>
          </button>

          {/* Form area */}
          <div className="px-4 pb-4">
            {/* Column headers */}
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-1">
                Expiry date
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-20 text-center">
                Qty
              </span>
              <span className="w-16" /> {/* spacer for button */}
            </div>

            {/* Batch rows */}
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 animate-row-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Date input - bubbly style */}
                  <div className="flex-1 relative">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, "date", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-[13px] text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all placeholder:text-slate-300 shadow-sm"
                    />
                  </div>

                  {/* Quantity input */}
                  <input
                    type="number"
                    value={row.qty}
                    onChange={(e) => updateRow(row.id, "qty", e.target.value)}
                    placeholder={untrackedUnits.toString()}
                    className="w-20 px-3 py-2.5 text-[13px] text-center text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all placeholder:text-slate-300 shadow-sm"
                  />

                  {/* Remove row (only if >1 row) */}
                  {rows.length > 1 ? (
                    <button
                      onClick={() => removeRow(row.id)}
                      className="w-8 h-8 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </button>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>
              ))}
            </div>

            {/* Add another row */}
            <button
              onClick={addRow}
              className="mt-2.5 flex items-center gap-2 text-[13px] font-medium text-violet-500 hover:text-violet-600 transition-colors px-1 py-1"
            >
              <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              Add another batch
            </button>

            {/* Remaining count + submit */}
            <div className="mt-4 flex items-center justify-between">
              {/* Remaining pill */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium ${
                remaining === 0
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : remaining < 0
                  ? "bg-red-50 text-red-500 border border-red-100"
                  : "bg-slate-50 text-slate-500 border border-slate-100"
              }`}>
                {remaining === 0 ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    All units assigned
                  </>
                ) : remaining < 0 ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                    </svg>
                    {Math.abs(remaining)} over
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {remaining} unassigned
                  </>
                )}
              </div>

              {/* Submit pill button */}
              <button
                className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 shadow-sm ${
                  rows.some((r) => r.date)
                    ? "bg-violet-500 text-white hover:bg-violet-600 hover:shadow-md hover:shadow-violet-200 active:scale-[0.97]"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
                disabled={!rows.some((r) => r.date)}
              >
                Add {rows.filter((r) => r.date).length === 1 ? "batch" : "batches"}
              </button>
            </div>

            {/* Helper text */}
            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Quantity defaults to all {untrackedUnits} untracked units if left blank.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Demo wrapper showing both states
// ============================================================

export default function AddDatesBubbly() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] space-y-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-800">Add Dates Component</h2>
          <p className="text-[13px] text-slate-400 mt-1">Click to expand / collapse</p>
        </div>

        {/* Component */}
        <AddDatesSection untrackedUnits={38} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        * {
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @keyframes row-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-row-in {
          animation: row-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Remove default date input styling on focus */
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0.4;
          cursor: pointer;
        }

        /* Number input arrows */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
}