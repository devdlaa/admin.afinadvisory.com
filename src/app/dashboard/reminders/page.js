// "use client";

// import React, { useState } from "react";
// import ReminderTagsDialog from "./components/Remindertagsdialog/Remindertagsdialog";
// import ReminderListsDialog from "./components/Reminderlistsdialog/Reminderlistsdialog";

// const page = () => {
//   // ── Tags state ──────────────────────────────
//   const [tagsOpen, setTagsOpen] = useState(false);
//   const [tagsMode, setTagsMode] = useState("list");
//   const [selectedTags, setSelectedTags] = useState([]);

//   // ── Lists state ─────────────────────────────
//   const [listsOpen, setListsOpen] = useState(false);
//   const [listsMode, setListsMode] = useState("list");
//   const [selectedLists, setSelectedLists] = useState([]);

//   const preSelectedTagIds = [];
//   const preSelectedListIds = [];

//   return (
//     <div
//       style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "700px" }}
//     >
//       <h2
//         style={{
//           marginBottom: "28px",
//           fontSize: "18px",
//           fontWeight: 600,
//           color: "#0F172A",
//         }}
//       >
//         Reminder Meta — Test Page
//       </h2>

//       {/* ── Tags section ── */}
//       <section style={{ marginBottom: "40px" }}>
//         <p
//           style={{
//             fontSize: "13px",
//             fontWeight: 600,
//             color: "#374151",
//             marginBottom: "12px",
//             textTransform: "uppercase",
//             letterSpacing: "0.05em",
//           }}
//         >
//           Tags
//         </p>
//         <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
//           <button
//             onClick={() => {
//               setTagsMode("list");
//               setTagsOpen(true);
//             }}
//             style={btnStyle("#3B82F6")}
//           >
//             Open — List Mode
//           </button>
//           <button
//             onClick={() => {
//               setTagsMode("create");
//               setTagsOpen(true);
//             }}
//             style={btnStyle("#6366F1")}
//           >
//             Open — Create Mode
//           </button>
//         </div>

//         {selectedTags.length > 0 && (
//           <div style={{ marginTop: "16px" }}>
//             <p
//               style={{
//                 fontSize: "12px",
//                 color: "#64748B",
//                 marginBottom: "8px",
//               }}
//             >
//               Selected tags ({selectedTags.length}):
//             </p>
//             <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
//               {selectedTags.map((tag) => (
//                 <span
//                   key={tag.id}
//                   style={{
//                     display: "inline-flex",
//                     alignItems: "center",
//                     gap: "6px",
//                     padding: "4px 12px 4px 8px",
//                     borderRadius: "20px",
//                     background: `${tag.color_code}1A`,
//                     border: `1.5px solid ${tag.color_code}`,
//                     fontSize: "12.5px",
//                     fontWeight: 500,
//                     color: "#1E293B",
//                   }}
//                 >
//                   <span
//                     style={{
//                       width: 8,
//                       height: 8,
//                       borderRadius: "50%",
//                       background: tag.color_code,
//                       flexShrink: 0,
//                     }}
//                   />
//                   {tag.name}
//                 </span>
//               ))}
//             </div>
//             <RawData data={selectedTags} />
//           </div>
//         )}
//       </section>

//       {/* ── Lists section ── */}
//       <section>
//         <p
//           style={{
//             fontSize: "13px",
//             fontWeight: 600,
//             color: "#374151",
//             marginBottom: "12px",
//             textTransform: "uppercase",
//             letterSpacing: "0.05em",
//           }}
//         >
//           Lists
//         </p>
//         <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
//           <button
//             onClick={() => {
//               setListsMode("list");
//               setListsOpen(true);
//             }}
//             style={btnStyle("#16A34A")}
//           >
//             Open — List Mode
//           </button>
//           <button
//             onClick={() => {
//               setListsMode("create");
//               setListsOpen(true);
//             }}
//             style={btnStyle("#0891B2")}
//           >
//             Open — Create Mode
//           </button>
//         </div>

//         {selectedLists.length > 0 && (
//           <div style={{ marginTop: "16px" }}>
//             <p
//               style={{
//                 fontSize: "12px",
//                 color: "#64748B",
//                 marginBottom: "8px",
//               }}
//             >
//               Selected lists ({selectedLists.length}):
//             </p>
//             <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
//               {selectedLists.map((list) => (
//                 <span
//                   key={list.id}
//                   style={{
//                     display: "inline-flex",
//                     alignItems: "center",
//                     gap: "8px",
//                     padding: "5px 14px 5px 8px",
//                     borderRadius: "10px",
//                     background: "#F8FAFC",
//                     border: "1.5px solid #E2E8F0",
//                     fontSize: "12.5px",
//                     fontWeight: 500,
//                     color: "#1E293B",
//                   }}
//                 >
//                   <span
//                     style={{
//                       width: 26,
//                       height: 26,
//                       borderRadius: "7px",
//                       background: list.icon_bg,
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       flexShrink: 0,
//                     }}
//                   />
//                   {list.name}
//                 </span>
//               ))}
//             </div>
//             <RawData data={selectedLists} />
//           </div>
//         )}
//       </section>

//       {/* ── Dialogs ── */}
//       <ReminderTagsDialog
//         open={tagsOpen}
//         onClose={() => setTagsOpen(false)}
//         initialMode={tagsMode}
//         selectedTagIds={preSelectedTagIds}
//         onSelectionChange={(tags) => setSelectedTags(tags)}
//       />

//       <ReminderListsDialog
//         open={listsOpen}
//         onClose={() => setListsOpen(false)}
//         initialMode={listsMode}
//         selectedListIds={preSelectedListIds}
//         onSelectionChange={(lists) => setSelectedLists(lists)}
//       />
//     </div>
//   );
// };

// function RawData({ data }) {
//   return (
//     <details style={{ marginTop: "12px" }}>
//       <summary
//         style={{ fontSize: "11.5px", color: "#94A3B8", cursor: "pointer" }}
//       >
//         Raw selection data
//       </summary>
//       <pre
//         style={{
//           marginTop: "8px",
//           padding: "12px",
//           background: "#F8FAFC",
//           border: "1px solid #E2E8F0",
//           borderRadius: "8px",
//           fontSize: "11.5px",
//           color: "#334155",
//           overflowX: "auto",
//         }}
//       >
//         {JSON.stringify(data, null, 2)}
//       </pre>
//     </details>
//   );
// }

// const btnStyle = (bg) => ({
//   height: "36px",
//   padding: "0 18px",
//   borderRadius: "8px",
//   border: "none",
//   background: bg,
//   color: "#fff",
//   fontSize: "13px",
//   fontWeight: 500,
//   cursor: "pointer",
// });

// export default page;

// "use client";

// import React, { useState } from "react";

// import ReminderDialog from "./components/Reminderdialog/Reminderdialog";

// export default function page() {
//   const [open, setOpen] = useState(false);
//   const [mode, setMode] = useState("draft");

//   return (
//     <div
//       style={{
//         padding: "40px",
//         fontFamily: "sans-serif",
//         background: "#F1F5F9",
//         minHeight: "100vh",
//       }}
//     >
//       <h2
//         style={{
//           marginBottom: "24px",
//           fontSize: "18px",
//           fontWeight: 600,
//           color: "#0F172A",
//         }}
//       >
//         ReminderDialog — Test Page
//       </h2>
//       <div style={{ display: "flex", gap: "12px" }}>
//         <button
//           onClick={() => {
//             setMode("detail");
//             setOpen(true);
//           }}
//           style={btn("#1E293B")}
//         >
//           Open — Detail Mode
//         </button>
//         <button
//           onClick={() => {
//             setMode("draft");
//             setOpen(true);
//           }}
//           style={btn("#64748B")}
//         >
//           Open — Draft Mode
//         </button>
//       </div>

//       {open && <ReminderDialog mode={mode} onClose={() => setOpen(false)} />}
//     </div>
//   );
// }

// const btn = (bg) => ({
//   height: "36px",
//   padding: "0 20px",
//   borderRadius: "9px",
//   border: "none",
//   background: bg,
//   color: "#fff",
//   fontSize: "13px",
//   fontWeight: 500,
//   cursor: "pointer",
// });

// "use client";

// import React, { useState } from "react";
// import RemindMeDialog from "./components/Remindmedialog/Remindmedialog";

// const pageStyle = {
//   minHeight: "100vh",
//   background: "#F1F5F9",
//   display: "flex",
//   flexDirection: "column",
//   alignItems: "center",
//   justifyContent: "center",
//   gap: 20,
//   fontFamily: "system-ui,sans-serif",
//   padding: 24,
// };
// const card = {
//   background: "#fff",
//   borderRadius: 14,
//   padding: "18px 22px",
//   width: "100%",
//   maxWidth: 500,
//   boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
// };
// const cardTitle = {
//   fontSize: 12,
//   fontWeight: 700,
//   color: "#94A3B8",
//   textTransform: "uppercase",
//   letterSpacing: "0.07em",
//   marginBottom: 12,
//   margin: "0 0 12px",
// };
// const btnRow = { display: "flex", gap: 10 };
// const btn = (bg) => ({
//   height: 36,
//   padding: "0 20px",
//   borderRadius: 9,
//   border: "none",
//   background: bg,
//   color: "#fff",
//   fontSize: 13,
//   fontWeight: 500,
//   cursor: "pointer",
// });
// const rowWrap = { display: "flex", flexDirection: "column", gap: 6 };
// const configItem = { display: "flex", alignItems: "flex-start", gap: 12 };
// const configKey = {
//   fontSize: 12,
//   fontWeight: 600,
//   color: "#94A3B8",
//   minWidth: 140,
//   paddingTop: 2,
// };
// const configVal = {
//   fontSize: 13,
//   fontWeight: 500,
//   color: "#1E293B",
//   wordBreak: "break-all",
// };

// export default function page() {
//   const [open, setOpen] = useState(false);
//   const [init, setInit] = useState(null);
//   const [config, setConfig] = useState(null);

//   const openOnce = () => {
//     setInit(null);
//     setOpen(true);
//   };

//   const openRecurring = () => {
//     setInit({
//       isRecurring: true,
//       recurring: {
//         type: "WEEKLY",
//         repeatEvery: 1,
//         weekDays: [5],
//         repeatBy: "Day of the month",
//         neverEnds: true,
//         endsOnDate: null,
//         endsAfter: null,
//         startsOn: new Date(),
//         startsH: 9,
//         startsM: 0,
//       },
//     });
//     setOpen(true);
//   };

//   return (
//     <div style={pageStyle}>
//       <div style={card}>
//         <p style={cardTitle}>RemindMe Dialog</p>
//         <div style={btnRow}>
//           <button style={btn("#1E293B")} onClick={openOnce}>
//             Once
//           </button>
//           <button style={btn("#2563EB")} onClick={openRecurring}>
//             Recurring
//           </button>
//         </div>
//       </div>

//       {config && (
//         <div style={card}>
//           <p style={cardTitle}>Returned config</p>
//           <div style={rowWrap}>
//             {Object.entries(config).map(
//               ([k, v]) =>
//                 v !== null &&
//                 v !== undefined && (
//                   <div key={k} style={configItem}>
//                     <span style={configKey}>{k}</span>
//                     <span style={configVal}>
//                       {typeof v === "object" ? JSON.stringify(v) : String(v)}
//                     </span>
//                   </div>
//                 ),
//             )}
//           </div>
//         </div>
//       )}

//       {open && (
//         <RemindMeDialog
//           initialValue={init}
//           onClose={() => setOpen(false)}
//           onSet={(r) => {
//             setConfig(r);
//             setOpen(false);
//           }}
//         />
//       )}
//     </div>
//   );
// }

// "use client";
// import React, { useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { Plus, Pencil, Layers } from "lucide-react";
// import {
//   BarChart2,
//   Headphones,
//   Building2,
//   Wrench,
//   Truck,
//   Code2,
//   MessageSquare,
//   Telescope,
//   Shield,
//   Banknote,
//   Landmark,
//   GraduationCap,
//   Car,
//   Settings,
//   User,
//   Gift,
//   Heart,
//   Home,
//   Stethoscope,
//   Workflow,
// } from "lucide-react";

// import PipelineDrawer from "../leads-manager/components/Pipelinedrawer/Pipelinedrawer";
// import {
//   fetchLeadPipelines,
//   selectPipelineList,
//   selectPipelineLoading,
// } from "@/store/slices/leadPipelinesSlice";

// const ICON_MAP = {
//   chart: BarChart2,
//   support: Headphones,
//   buildings: Building2,
//   tools: Wrench,
//   truck: Truck,
//   code: Code2,
//   message: MessageSquare,
//   telescope: Telescope,
//   shield: Shield,
//   money: Banknote,
//   bank: Landmark,
//   education: GraduationCap,
//   car: Car,
//   settings: Settings,
//   user: User,
//   gift: Gift,
//   heart: Heart,
//   home: Home,
//   medical: Stethoscope,
//   workflow: Workflow,
// };

// function PipelineIcon({ name, size = 16 }) {
//   const Comp = ICON_MAP[name] || Settings;
//   return <Comp size={size} />;
// }

// const Page = () => {
//   const dispatch = useDispatch();
//   const pipelines = useSelector(selectPipelineList);
//   const loading = useSelector(selectPipelineLoading);

//   const [drawerOpen, setDrawerOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);

//   useEffect(() => {
//     dispatch(fetchLeadPipelines({ page_size: 20 }));
//   }, []);

//   const handleClose = () => {
//     setDrawerOpen(false);
//     setEditingId(null);
//     // Refresh list to reflect any creates/updates
//     dispatch(fetchLeadPipelines({ page_size: 20 }));
//   };

//   const openCreate = () => {
//     setEditingId(null);
//     setDrawerOpen(true);
//   };
//   const openEdit = (id) => {
//     setEditingId(id);
//     setDrawerOpen(true);
//   };

//   return (
//     <div style={{ padding: "32px", fontFamily: "sans-serif", maxWidth: 620 }}>
//       {/* Header */}
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginBottom: 24,
//         }}
//       >
//         <div>
//           <h2
//             style={{
//               margin: "0 0 3px",
//               fontSize: 18,
//               fontWeight: 700,
//               color: "#111827",
//             }}
//           >
//             Pipelines
//           </h2>
//           <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
//             {loading
//               ? "Loading…"
//               : `${pipelines.length} pipeline${pipelines.length !== 1 ? "s" : ""}`}
//           </p>
//         </div>
//         <button
//           onClick={openCreate}
//           style={{
//             display: "inline-flex",
//             alignItems: "center",
//             gap: 6,
//             height: 36,
//             padding: "0 16px",
//             background: "#1d4ed8",
//             color: "#fff",
//             border: "none",
//             borderRadius: 8,
//             fontSize: 13.5,
//             fontWeight: 600,
//             cursor: "pointer",
//           }}
//         >
//           <Plus size={14} /> New Pipeline
//         </button>
//       </div>

//       {/* List */}
//       {loading && pipelines.length === 0 ? (
//         <div
//           style={{
//             padding: "48px 0",
//             textAlign: "center",
//             color: "#9ca3af",
//             fontSize: 13,
//           }}
//         >
//           Loading pipelines…
//         </div>
//       ) : pipelines.length === 0 ? (
//         <div
//           style={{
//             padding: "48px 24px",
//             textAlign: "center",
//             background: "#f9fafb",
//             border: "1px dashed #d1d5db",
//             borderRadius: 12,
//           }}
//         >
//           <Layers size={30} style={{ color: "#d1d5db", marginBottom: 12 }} />
//           <p
//             style={{
//               margin: "0 0 4px",
//               fontSize: 14,
//               fontWeight: 600,
//               color: "#374151",
//             }}
//           >
//             No pipelines yet
//           </p>
//           <p style={{ margin: 0, fontSize: 12.5, color: "#9ca3af" }}>
//             Create your first pipeline to get started
//           </p>
//         </div>
//       ) : (
//         <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
//           {pipelines.map((p) => (
//             <div
//               key={p.id}
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 gap: 14,
//                 padding: "13px 16px",
//                 background: "#fff",
//                 border: "1px solid #e5e7eb",
//                 borderRadius: 10,
//                 boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
//               }}
//             >
//               {/* Icon badge */}
//               <div
//                 style={{
//                   width: 36,
//                   height: 36,
//                   borderRadius: 8,
//                   background: "#eff6ff",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   color: "#1d4ed8",
//                   flexShrink: 0,
//                 }}
//               >
//                 <PipelineIcon name={p.icon || "settings"} size={16} />
//               </div>

//               {/* Name + description */}
//               <div style={{ flex: 1, minWidth: 0 }}>
//                 <div
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 7,
//                     flexWrap: "wrap",
//                   }}
//                 >
//                   <span
//                     style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}
//                   >
//                     {p.name}
//                   </span>
//                   {p.is_default && (
//                     <span
//                       style={{
//                         fontSize: 10,
//                         fontWeight: 700,
//                         color: "#1d4ed8",
//                         background: "#eff6ff",
//                         border: "1px solid #bfdbfe",
//                         borderRadius: 20,
//                         padding: "1px 7px",
//                         letterSpacing: "0.04em",
//                       }}
//                     >
//                       DEFAULT
//                     </span>
//                   )}
//                 </div>
//                 {p.description ? (
//                   <p
//                     style={{
//                       margin: "2px 0 0",
//                       fontSize: 12,
//                       color: "#6b7280",
//                       whiteSpace: "nowrap",
//                       overflow: "hidden",
//                       textOverflow: "ellipsis",
//                     }}
//                   >
//                     {p.description}
//                   </p>
//                 ) : null}
//               </div>

//               {/* Edit button */}
//               <button
//                 onClick={() => openEdit(p.id)}
//                 style={{
//                   display: "inline-flex",
//                   alignItems: "center",
//                   gap: 5,
//                   height: 30,
//                   padding: "0 11px",
//                   background: "#f3f4f6",
//                   border: "1px solid #e5e7eb",
//                   borderRadius: 7,
//                   fontSize: 12.5,
//                   fontWeight: 500,
//                   color: "#374151",
//                   cursor: "pointer",
//                   flexShrink: 0,
//                 }}
//               >
//                 <Pencil size={12} /> Edit
//               </button>
//             </div>
//           ))}
//         </div>
//       )}

//       <PipelineDrawer
//         open={drawerOpen}
//         onClose={handleClose}
//         pipelineId={editingId}
//       />
//     </div>
//   );
// };

// export default Page;

"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import LeadContactDialog from "../leads-manager/leads-contact/components/LeadContactDialog/LeadContactDialog";
import InfluencerDialog from "../leads-manager/influncers/components/InfluencerDialog/InfluencerDialog";
import LinkSelectionDialog from "../leads-manager/components/LinkSelectionDialog/LinkSelectionDialog";

import {
  quickSearchLeadContacts,
  clearQuickSearch,
  selectQuickSearchResults,
  selectQuickSearchLoading,
} from "@/store/slices/leadContactSlice";

import {
  searchInfluencers,
  selectInfluencerSearchList,
  selectInfluencerSearchLoading,
} from "@/store/slices/influncersSlice";

/* ─────────────────────────────────────────────────────────────
   Demo page — all Redux + handlers live HERE, not in the dialog
───────────────────────────────────────────────────────────── */
export default function LinkSelectionDemoPage() {
  const dispatch = useDispatch();

  /* ── Redux selectors ── */
  const leadContactResults = useSelector(selectQuickSearchResults);
  const leadContactSearching = useSelector(selectQuickSearchLoading);
  const influencerResults = useSelector(selectInfluencerSearchList);
  const influencerSearching = useSelector(selectInfluencerSearchLoading);

  /* ── Sub-dialog open state ── */
  const [addLeadContactOpen, setAddLeadContactOpen] = useState(false);
  const [addInfluencerOpen, setAddInfluencerOpen] = useState(false);

  /* ── Client dialog state ── */
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState({
    __type: "lead_contact",
    id: "lc_001",
    contact_person: "Urban Hues Private Limited",
    entity_type: "PRIVATE_LIMITED_COMPANY",
    email: "porushlalwani30@yahoo.com",
    primary_phone: "+91 98765 43210",
    status: "ACTIVE",
  });
  const [isUpdatingClient, setIsUpdatingClient] = useState(false);

  /* ── Reference dialog state ── */
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState(null);
  const [isUpdatingRef, setIsUpdatingRef] = useState(false);

  /* ── Debounce timer ── */
  const debounceRef = useRef(null);

  /* ── Shared search handler (used by both dialogs) ── */
  const handleSearchChange = useCallback(
    (query, tabId) => {
      clearTimeout(debounceRef.current);

      // Empty query → clear results
      if (!query.trim()) {
        dispatch(clearQuickSearch());
        return;
      }

      debounceRef.current = setTimeout(() => {
        if (tabId === "lead_contact") {
          dispatch(quickSearchLeadContacts({ search: query, limit: 20 }));
        } else if (tabId === "influencer") {
          dispatch(searchInfluencers({ search: query, page_size: 20 }));
        }
        // "external" tab has no search — inputs only
      }, 280);
    },
    [dispatch],
  );

  /* ── Tab switch → clear stale results ── */
  const handleTabChange = useCallback(() => {
    clearTimeout(debounceRef.current);
    dispatch(clearQuickSearch());
  }, [dispatch]);

  /* ── Add-new router ── */
  const handleAddNew = useCallback((tabId) => {
    if (tabId === "lead_contact") setAddLeadContactOpen(true);
    if (tabId === "influencer") setAddInfluencerOpen(true);
  }, []);

  /* ── Client confirm ── */
  const handleClientConfirm = async (payload) => {
    setIsUpdatingClient(true);
    try {
      // Replace with real dispatch:
      // await dispatch(updateLead({ id: leadId, client_id: payload.id ?? null })).unwrap();
      await new Promise((r) => setTimeout(r, 700)); // simulate network
      setSelectedClient(
        payload.type === "__cleared" ? null : { ...payload, status: "ACTIVE" },
      );
      setClientDialogOpen(false);
      dispatch(clearQuickSearch());
    } finally {
      setIsUpdatingClient(false);
    }
  };

  /* ── Reference confirm ── */
  const handleRefConfirm = async (payload) => {
    setIsUpdatingRef(true);
    try {
      // Replace with real dispatch:
      // await dispatch(updateLead({ id: leadId, reference: payload.type === "__cleared" ? null : payload })).unwrap();
      await new Promise((r) => setTimeout(r, 700));
      setSelectedRef(payload.type === "__cleared" ? null : payload);
      setRefDialogOpen(false);
      dispatch(clearQuickSearch());
    } finally {
      setIsUpdatingRef(false);
    }
  };

  /* ── Cleanup on unmount ── */
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div style={{ padding: 40, fontFamily: "Poppins, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        LinkSelectionDialog — Demo
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>
        <strong>client</strong> mode = lead contact only &nbsp;|&nbsp;
        <strong>reference</strong> mode = lead contact / influencer / external
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={() => setClientDialogOpen(true)}
          style={{
            padding: "10px 22px",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open — Client Mode
        </button>
        <button
          onClick={() => setRefDialogOpen(true)}
          style={{
            padding: "10px 22px",
            background: "#0f766e",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open — Reference Mode
        </button>
      </div>

      {/* State preview */}
      <div
        style={{ marginTop: 32, display: "flex", gap: 20, flexWrap: "wrap" }}
      >
        {[
          { heading: "Selected Client", value: selectedClient },
          { heading: "Selected Reference", value: selectedRef },
        ].map(({ heading, value }) => (
          <div
            key={heading}
            style={{
              padding: "16px 20px",
              border: "1.5px solid #e5e7eb",
              borderRadius: 10,
              minWidth: 260,
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                marginBottom: 8,
              }}
            >
              {heading}
            </div>
            {value ? (
              <>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}
                >
                  {value.contact_person || value.name}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {[value.type || value.__type, value.email]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>None</div>
            )}
          </div>
        ))}
      </div>

      {/* ══ Dialogs ══ */}

      {/* Client mode */}
      <LinkSelectionDialog
        isOpen={clientDialogOpen}
        mode="client"
        selectedData={selectedClient}
        leadContactResults={leadContactResults}
        leadContactSearching={leadContactSearching}
        influencerResults={influencerResults}
        influencerSearching={influencerSearching}
        onClose={() => {
          setClientDialogOpen(false);
          dispatch(clearQuickSearch());
        }}
        onSearchChange={handleSearchChange}
        onTabChange={handleTabChange}
        onConfirm={handleClientConfirm}
        onAddNew={handleAddNew}
        isUpdating={isUpdatingClient}
      />

      {/* Reference mode */}
      <LinkSelectionDialog
        isOpen={refDialogOpen}
        mode="reference"
        selectedData={selectedRef}
        leadContactResults={leadContactResults}
        leadContactSearching={leadContactSearching}
        influencerResults={influencerResults}
        influencerSearching={influencerSearching}
        onClose={() => {
          setRefDialogOpen(false);
          dispatch(clearQuickSearch());
        }}
        onSearchChange={handleSearchChange}
        onTabChange={handleTabChange}
        onConfirm={handleRefConfirm}
        onAddNew={handleAddNew}
        isUpdating={isUpdatingRef}
      />

      {/* Add new lead contact */}
      <LeadContactDialog
        isOpen={addLeadContactOpen}
        mode="create"
        onClose={() => setAddLeadContactOpen(false)}
        onSuccess={() => setAddLeadContactOpen(false)}
      />

      {/* Add new influencer */}
      <InfluencerDialog
        isOpen={true}
        mode="create"
        onClose={() => setAddInfluencerOpen(false)}
        onSuccess={() => setAddInfluencerOpen(false)}
      />
    </div>
  );
}
