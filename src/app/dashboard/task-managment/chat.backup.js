// "use client";
// import { useState, useRef } from "react";
// import UserMentionsDropdown from "@/app/components/UserMentionsDropdown/UserMentionsDropdown";
// import { Send, X } from "lucide-react";
// import styles from "./page.module.scss";

// export default function ChatPage() {
//   const [message, setMessage] = useState("");
//   const [mentionedUsers, setMentionedUsers] = useState([]);
//   const [showMentions, setShowMentions] = useState(false);
//   const [mentionQuery, setMentionQuery] = useState("");

//   const inputRef = useRef(null);

//   const handleInputChange = (e) => {
//     const value = e.target.value;
//     const cursorPos = e.target.selectionStart;

//     setMessage(value);

//     // Find @ symbol before cursor
//     const textBeforeCursor = value.slice(0, cursorPos);
//     const lastAtIndex = textBeforeCursor.lastIndexOf("@");

//     if (lastAtIndex !== -1) {
//       const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

//       // Only show if no space after @
//       if (!textAfterAt.includes(" ") && textAfterAt.length <= 50) {
//         setMentionQuery(textAfterAt);
//         setShowMentions(true);
//       } else {
//         setShowMentions(false);
//       }
//     } else {
//       setShowMentions(false);
//     }
//   };

//   const handleMentionSelect = (user) => {
//     // Check if user already mentioned
//     if (mentionedUsers.find((u) => u.id === user.id)) {
//       setShowMentions(false);
//       return;
//     }

//     // Replace @query with @username in message
//     const cursorPos = inputRef.current.selectionStart;
//     const textBeforeCursor = message.slice(0, cursorPos);
//     const lastAtIndex = textBeforeCursor.lastIndexOf("@");
//     const beforeMention = message.slice(0, lastAtIndex);
//     const afterMention = message.slice(cursorPos);
//     const newMessage = `${beforeMention}@${user.name} ${afterMention}`;

//     setMessage(newMessage);
//     setMentionedUsers([...mentionedUsers, user]);
//     setShowMentions(false);
//   };

//   const handleRemoveMention = (userId) => {
//     setMentionedUsers(mentionedUsers.filter((u) => u.id !== userId));
//   };

//   const handleSendMessage = () => {
//     if (!message.trim()) return;

//     console.log("Sending message:", {
//       text: message,
//       mentions: mentionedUsers.map((u) => ({ id: u.id, name: u.name })),
//     });

//     // Reset
//     setMessage("");
//     setMentionedUsers([]);
//     setShowMentions(false);
//   };

//   const handleKeyDown = (e) => {
//     // Don't submit on Enter if mentions dropdown is open
//     if (e.key === "Enter" && !e.shiftKey && !showMentions) {
//       e.preventDefault();
//       handleSendMessage();
//     }
//   };

//   return (
//     <div className={styles.chatContainer}>
//       <div className={styles.chatMessages}>
//         <p className={styles.instruction}>
//           Type <strong>@</strong> to mention users
//         </p>
//       </div>

//       {mentionedUsers.length > 0 && (
//         <div className={styles.mentionedChips}>
//           <span className={styles.chipsLabel}>Mentioned:</span>
//           {mentionedUsers.map((user) => (
//             <div key={user.id} className={styles.userChip}>
//               <span>{user.name}</span>
//               <button
//                 type="button"
//                 onClick={() => handleRemoveMention(user.id)}
//                 className={styles.chipRemove}
//               >
//                 <X size={14} />
//               </button>
//             </div>
//           ))}
//         </div>
//       )}

//       <div className={styles.inputContainer}>
//         <div className={styles.inputWrapper}>
//           <textarea
//             ref={inputRef}
//             value={message}
//             onChange={handleInputChange}
//             onKeyDown={handleKeyDown}
//             placeholder="Type a message... Use @ to mention users"
//             className={styles.messageInput}
//             rows={1}
//           />

//           <button
//             type="button"
//             onClick={handleSendMessage}
//             disabled={!message.trim()}
//             className={styles.sendBtn}
//           >
//             <Send size={20} />
//           </button>
//         </div>

//         {showMentions && (
//           <UserMentionsDropdown
//             inputRef={inputRef}
//             query={mentionQuery}
//             onSelect={handleMentionSelect}
//             onClose={() => setShowMentions(false)}
//           />
//         )}
//       </div>
//     </div>
//   );
// }


// .chatContainer {
//   max-width: 800px;
//   margin: 0 auto;
//   padding: 20px;
//   display: flex;
//   flex-direction: column;
//   height: 100vh;
//   gap: 16px;
// }

// .chatMessages {
//   flex: 1;
//   overflow-y: auto;
//   padding: 20px;
//   background: #f8fafc;
//   border-radius: 12px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
// }

// .instruction {
//   color: #64748b;
//   font-size: 14px;
//   text-align: center;

//   strong {
//     color: #3b82f6;
//     font-weight: 600;
//   }
// }

// .mentionedChips {
//   display: flex;
//   align-items: center;
//   gap: 8px;
//   padding: 12px 16px;
//   background: #f1f5f9;
//   border-radius: 8px;
//   flex-wrap: wrap;
// }

// .chipsLabel {
//   font-size: 12px;
//   color: #64748b;
//   font-weight: 500;
// }

// .userChip {
//   display: inline-flex;
//   align-items: center;
//   gap: 6px;
//   padding: 4px 8px 4px 12px;
//   background: #3b82f6;
//   color: #ffffff;
//   border-radius: 16px;
//   font-size: 13px;
//   font-weight: 500;
//   animation: chipSlideIn 0.2s ease;

//   span {
//     line-height: 1;
//   }
// }

// .chipRemove {
//   background: none;
//   border: none;
//   padding: 2px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   cursor: pointer;
//   color: #ffffff;
//   opacity: 0.8;
//   transition: opacity 0.2s;
//   border-radius: 50%;

//   &:hover {
//     opacity: 1;
//     background: rgba(255, 255, 255, 0.2);
//   }
// }

// .inputContainer {
//   position: relative;
//   background: #ffffff;
//   border: 1px solid #e2e8f0;
//   border-radius: 12px;
//   padding: 12px;
//   transition: border-color 0.2s;

//   &:focus-within {
//     border-color: #3b82f6;
//     box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
//   }
// }

// .inputWrapper {
//   display: flex;
//   align-items: flex-end;
//   gap: 12px;
// }

// .messageInput {
//   flex: 1;
//   border: none;
//   outline: none;
//   resize: none;
//   font-size: 14px;
//   font-family: inherit;
//   line-height: 1.5;
//   max-height: 120px;
//   overflow-y: auto;
//   padding: 4px 0;

//   &::placeholder {
//     color: #94a3b8;
//   }

//   &::-webkit-scrollbar {
//     width: 4px;
//   }

//   &::-webkit-scrollbar-thumb {
//     background: #cbd5e1;
//     border-radius: 2px;
//   }
// }

// .sendBtn {
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   width: 36px;
//   height: 36px;
//   background: #3b82f6;
//   color: #ffffff;
//   border: none;
//   border-radius: 8px;
//   cursor: pointer;
//   transition: all 0.2s;
//   flex-shrink: 0;

//   &:hover:not(:disabled) {
//     background: #2563eb;
//     transform: scale(1.05);
//   }

//   &:active:not(:disabled) {
//     transform: scale(0.95);
//   }

//   &:disabled {
//     opacity: 0.4;
//     cursor: not-allowed;
//   }
// }

// @keyframes chipSlideIn {
//   from {
//     opacity: 0;
//     transform: scale(0.8);
//   }
//   to {
//     opacity: 1;
//     transform: scale(1);
//   }
// }

// @media (max-width: 768px) {
//   .chatContainer {
//     padding: 12px;
//   }

//   .mentionedChips {
//     padding: 8px 12px;
//   }

//   .inputContainer {
//     padding: 8px;
//   }
// }
