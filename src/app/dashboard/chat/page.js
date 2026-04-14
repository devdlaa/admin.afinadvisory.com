'use client';
import { useState } from 'react';
import ChatMessage from './components/ChatMessage/ChatMessage';
import ChatSidebar from './components/ChatSidebar/ChatSidebar';
import styles from './DemoPage.module.scss';

export default function DemoPage() {
  // Dummy messages with various types
  const dummyMessages = [
    {
      id: 1,
      senderId: 'user2',
      type: 'text',
      content: 'Hey! How are you doing today?',
      timestamp: '10:30 AM',
      status: 'read'
    },
    {
      id: 2,
      senderId: 'user1',
      type: 'text',
      content: 'I\'m doing great! Just working on this new chat interface.',
      timestamp: '10:31 AM',
      status: 'read'
    },
    {
      id: 3,
      senderId: 'user1',
      type: 'text',
      content: 'It has so many cool features!',
      timestamp: '10:31 AM',
      status: 'read'
    },
    {
      id: 4,
      senderId: 'user2',
      type: 'text',
      content: 'That sounds interesting! Can you show me?',
      timestamp: '10:33 AM',
      status: 'read'
    },
    {
      id: 5,
      senderId: 'user1',
      type: 'image',
      content: 'Here\'s a beautiful sunset I captured yesterday 🌅',
      media: {
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        width: 400,
        height: 300,
        showDownload: true,
        fileName: 'sunset.jpg'
      },
      timestamp: '10:35 AM',
      status: 'delivered'
    },
    {
      id: 6,
      senderId: 'user2',
      type: 'text',
      content: 'Wow! That\'s absolutely stunning! 😍 Where was this taken?',
      timestamp: '10:36 AM',
      status: 'read'
    },
    {
      id: 7,
      senderId: 'user1',
      type: 'text',
      content: 'It was taken at the beach near my house. I go there every evening for a walk. The sunsets there are always incredible, but yesterday was particularly special. The colors were just perfect - all those oranges, pinks, and purples blending together. I actually stood there for about 30 minutes just watching the sky change colors. It was one of those moments where you just feel grateful to witness such natural beauty. You should definitely come visit sometime and we can watch the sunset together!',
      timestamp: '10:37 AM',
      status: 'sent'
    },
    {
      id: 8,
      senderId: 'user2',
      type: 'text',
      content: 'I would love that! Let me check my schedule',
      timestamp: '10:38 AM',
      status: 'read'
    },
    {
      id: 9,
      senderId: 'user2',
      type: 'file',
      content: 'Here\'s my availability for next week',
      fileInfo: {
        fileName: 'My_Schedule_NextWeek.pdf',
        fileSize: '2.4 MB',
        mimeType: 'application/pdf',
        hasPreview: true,
        previewUrl: 'https://via.placeholder.com/48/EF4444/FFFFFF?text=PDF',
        url: '/files/schedule.pdf'
      },
      timestamp: '10:40 AM',
      status: 'read'
    },
    {
      id: 10,
      senderId: 'user1',
      type: 'text',
      content: 'Perfect! How about Thursday evening?',
      timestamp: '10:42 AM',
      status: 'delivered'
    },
    {
      id: 11,
      senderId: 'user2',
      type: 'video',
      content: 'Speaking of beautiful places, check out this video from my last trip!',
      media: {
        url: '/videos/vacation.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400',
        duration: '1:23'
      },
      timestamp: '10:45 AM',
      status: 'read'
    },
    {
      id: 12,
      senderId: 'user1',
      type: 'text',
      content: 'Amazing! Where is that?',
      timestamp: '10:47 AM',
      status: 'sent'
    },
    {
      id: 13,
      senderId: 'user2',
      type: 'link',
      content: 'It\'s in New Zealand! Check out this article about it: https://example.com/new-zealand-travel',
      linkPreview: {
        url: 'https://example.com/new-zealand-travel',
        title: '10 Must-Visit Places in New Zealand',
        description: 'Discover the breathtaking landscapes and hidden gems of New Zealand, from fjords to mountains to pristine beaches.',
        domain: 'example.com',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400'
      },
      timestamp: '10:48 AM',
      status: 'read'
    },
    {
      id: 14,
      senderId: 'user1',
      type: 'text',
      content: 'Adding it to my bucket list! 📝',
      timestamp: '10:50 AM',
      status: 'delivered'
    },
    {
      id: 15,
      senderId: 'user1',
      type: 'text',
      content: 'By the way, have you seen the latest update?',
      timestamp: '10:50 AM',
      status: 'sent'
    },
    {
      id: 16,
      senderId: 'user2',
      type: 'file',
      content: 'Yeah! I even made some notes. Here\'s the Excel file',
      fileInfo: {
        fileName: 'Project_Updates_Q1.xlsx',
        fileSize: '856 KB',
        mimeType: 'application/vnd.ms-excel',
        hasPreview: false,
        url: '/files/updates.xlsx'
      },
      timestamp: '10:52 AM',
      status: 'read'
    },
    
    {
      id: 18,
      senderId: 'user2',
      type: 'text',
      content: 'Haha that\'s hilarious! 😂',
      timestamp: '10:56 AM',
      status: 'read'
    },
    {
      id: 19,
      senderId: 'user2',
      type: 'file',
      fileInfo: {
        fileName: 'Meeting_Notes.docx',
        fileSize: '1.2 MB',
        mimeType: 'application/msword',
        hasPreview: false,
        url: '/files/notes.docx'
      },
      timestamp: '10:58 AM',
      status: 'read'
    },
    {
      id: 20,
      senderId: 'user1',
      type: 'text',
      content: 'Thanks! I\'ll review it tonight 👍',
      timestamp: '11:00 AM',
      status: 'sent'
    }
  ];

  const currentUserId = 'user1';

  // Process messages for grouping
  const processedMessages = dummyMessages.map((message, index) => {
    const prevMessage = dummyMessages[index - 1];
    const nextMessage = dummyMessages[index + 1];
    
    const isSender = message.senderId === currentUserId;
    
    // Group if same sender as previous message
    const isGrouped = Boolean(
      prevMessage && prevMessage.senderId === message.senderId
    );
    
    // Show avatar only for last message in group
    const showAvatar = Boolean(
      !nextMessage || nextMessage.senderId !== message.senderId
    );
    
    return {
      ...message,
      isSender,
      isGrouped,
      showAvatar
    };
  });

  const handleMediaClick = (media) => {
    console.log('Media clicked:', media);
    // You can implement full-screen viewer here
    alert('Media viewer would open here');
  };

  const handleDownload = (url, fileName) => {
    console.log('Download:', url, fileName);
    alert(`Downloading: ${fileName}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebarWrapper}>
        <ChatSidebar />
      </div>
      <div className={styles.mainContent}>
        {/* Chat Header */}
        <div className={styles.chatHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>JD</div>
            <div className={styles.headerInfo}>
              <div className={styles.chatName}>John Doe</div>
              <div className={styles.chatStatus}>online</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.iconBtn}>🔍</button>
            <button className={styles.iconBtn}>⋮</button>
          </div>
        </div>

        {/* Messages Area */}
        <div className={styles.messagesArea}>
          {processedMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isSender={message.isSender}
              isGrouped={message.isGrouped}
              showAvatar={message.showAvatar}
              onMediaClick={handleMediaClick}
              onDownload={handleDownload}
            />
          ))}
        </div>

        {/* Message Input */}
        <div className={styles.messageInput}>
          <button className={styles.attachBtn}>📎</button>
          <input 
            type="text" 
            placeholder="Type a message..."
            className={styles.textInput}
          />
          <button className={styles.sendBtn}>Send</button>
        </div>
      </div>
    </div>
  );
}