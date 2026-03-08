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

"use client";
import React from "react";
import ReminderDialog from "./components/Reminderdialog/Reminderdialog";

const page = () => {
  return (
    <div>
      <ReminderDialog mode="detail" onClose={() => {}} />
    </div>
  );
};

export default page;
