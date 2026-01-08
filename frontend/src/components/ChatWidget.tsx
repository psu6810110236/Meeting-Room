import { useState, useEffect, useRef } from 'react';
import { 
  Box, TextField, IconButton, Paper, Typography, Badge, 
  Avatar, List, ListItemButton, ListItemAvatar, ListItemText, Divider, Alert, Dialog, DialogContent
} from '@mui/material';
import { 
    Chat as ChatIcon, Send, Close, SupportAgent, Person, 
    MarkChatUnread, AttachFile, DeleteOutline
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import Swal from 'sweetalert2'; 

interface Message {
  id: number;
  message: string;
  image_url?: string; 
  sender?: { id: number; username: string }; 
  sender_id?: number; 
  is_admin_reply: boolean;
  created_at?: string;
}

interface ChatRoom {
  roomId: string;
  name: string;
  unread?: number;
}

interface ChatWidgetProps {
  userId: number;
  role: string;
}

const ChatWidget = ({ userId, role }: ChatWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [adminActiveRooms, setAdminActiveRooms] = useState<ChatRoom[]>([]);
  const [unreadRooms, setUnreadRooms] = useState<Set<string>>(new Set());
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  
  const [userContext, setUserContext] = useState<string | null>(null); 
  // ✅ 1. เพิ่ม State สำหรับควบคุมการแสดงผล Notification
  const [showContext, setShowContext] = useState(true); 

  const [isTyping, setIsTyping] = useState(false); 
  const [typingTimeout, setTypingTimeout] = useState<any>(null); 
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [hoverMessageId, setHoverMessageId] = useState<number | null>(null);

  const currentRoomRef = useRef<string | null>(null);
  const openRef = useRef(open); 
  const roleRef = useRef(role);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);
  useEffect(() => { roleRef.current = role; }, [role]);

  // ✅ 2. เพิ่ม Effect: ถ้าข้อความมีคำว่า (completed) ให้รอ 3 วินาทีแล้วซ่อน
  useEffect(() => {
    setShowContext(true); // Reset ให้แสดงก่อนเสมอเมื่อข้อมูลเปลี่ยน
    if (userContext && userContext.includes('(completed)')) {
        const timer = setTimeout(() => {
            setShowContext(false);
        }, 3000); // 3 วินาที
        return () => clearTimeout(timer);
    }
  }, [userContext]);
  
  useEffect(() => { 
      openRef.current = open; 
      if(open && socket) {
          if (role === 'admin') {
             if (currentRoom) {
                 socket.emit('markAsRead', currentRoom);
                 setUnreadRooms(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(currentRoom);
                    return newSet;
                 });
             }
          } else {
             socket.emit('markAsRead', ''); 
             setUserUnreadCount(0);
          }
      } 
  }, [open, role, currentRoom, socket]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token: `Bearer ${token}` } 
    });

    newSocket.on('connect', () => {
      if (role === 'admin') {
        newSocket.emit('getActiveChats'); 
      } else {
        const myRoom = `user_${userId}`;
        setCurrentRoom(myRoom);
        newSocket.emit('joinRoom', myRoom); 
        newSocket.emit('getHistory', myRoom); 
      }
    });

    newSocket.on('unreadCountUpdate', (count: number) => {
        if (role !== 'admin') {
            if (!openRef.current) setUserUnreadCount(count);
            else newSocket.emit('markAsRead', '');
        }
    });

    newSocket.on('activeChats', (rooms: ChatRoom[]) => {
        setAdminActiveRooms(rooms);
        if (role === 'admin') {
            const newUnreadSet = new Set<string>();
            rooms.forEach(room => {
                newSocket.emit('joinRoom', room.roomId);
                if (room.unread && room.unread > 0) newUnreadSet.add(room.roomId);
            });
            setUnreadRooms(prev => new Set([...prev, ...newUnreadSet]));
        }
    });

    newSocket.on('userContext', (context: string) => {
        setUserContext(context);
    });

    newSocket.on('typing', () => setIsTyping(true));
    newSocket.on('stopTyping', () => setIsTyping(false));

    newSocket.on('receiveMessage', (msg: Message) => {
      setIsTyping(false);
      const senderId = msg.sender?.id || msg.sender_id;
      
      setMessages((prev) => {
         const isCurrentRoom = roleRef.current === 'admin' 
             ? currentRoomRef.current === `user_${senderId}` 
             : true;
         if (roleRef.current === 'admin' && !msg.is_admin_reply && !isCurrentRoom) return prev;
         if (prev.some(m => m.id === msg.id)) return prev;
         return [...prev, msg];
      });

      const isAdmin = roleRef.current === 'admin';
      const isMsgFromAdmin = Boolean(msg.is_admin_reply);
      const isFromMe = isAdmin ? isMsgFromAdmin : !isMsgFromAdmin;

      if (!isFromMe) {
          if (isAdmin && senderId) {
             const senderRoom = `user_${senderId}`;
             if (currentRoomRef.current !== senderRoom || !openRef.current) {
                 setUnreadRooms(prev => new Set(prev).add(senderRoom));
                 setAdminActiveRooms(prev => {
                     if (prev.some(r => r.roomId === senderRoom)) return prev;
                     return [...prev, { roomId: senderRoom, name: msg.sender?.username || `User ${senderId}` }];
                 });
                 newSocket.emit('joinRoom', senderRoom);
             } else {
                 newSocket.emit('markAsRead', senderRoom);
             }
          } else {
             if (!openRef.current) setUserUnreadCount(prev => prev + 1);
             else newSocket.emit('markAsRead', '');
          }
      }
    });

    newSocket.on('messageDeleted', (messageId: number) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    newSocket.on('history', (historyMsgs: any[]) => {
        setMessages(historyMsgs);
    });

    newSocket.on('adminNotification', (data: any) => {
       if (role === 'admin' && data.roomId) {
          if (currentRoomRef.current !== data.roomId || !openRef.current) {
              setUnreadRooms(prev => new Set(prev).add(data.roomId));
              newSocket.emit('getActiveChats');
          }
       }
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [userId, role]); 

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, currentRoom, isTyping, selectedImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if ((!inputText.trim() && !selectedImage) || !socket || !currentRoom) return;
    
    if (selectedImage) {
        socket.emit('sendMessage', {
            message: inputText, 
            image: selectedImage, 
            targetRoomId: role === 'admin' ? currentRoom : undefined 
        });
        clearInput();
    } else {
        socket.emit('sendMessage', {
            message: inputText,
            targetRoomId: role === 'admin' ? currentRoom : undefined 
        });
        clearInput();
    }
  };
  
  const handleDeleteMessage = (messageId: number) => {
      if (!socket || !messageId) return;

      Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to delete this message?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          socket.emit('deleteMessage', messageId);
          Swal.fire(
            'Deleted!',
            'Your message has been deleted.',
            'success'
          );
        }
      });
  };

  const clearInput = () => {
      setInputText('');
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      socket?.emit('stopTyping', currentRoom);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      if (socket && currentRoom) {
          socket.emit('typing', currentRoom);
          if (typingTimeout) clearTimeout(typingTimeout);
          const timeout = setTimeout(() => {
              socket.emit('stopTyping', currentRoom);
          }, 1000); 
          setTypingTimeout(timeout);
      }
  };

  const handleAdminSelectRoom = (roomId: string) => {
      setUnreadRooms(prev => {
          const newSet = new Set(prev);
          newSet.delete(roomId);
          return newSet;
      });
      setCurrentRoom(roomId);
      setUserContext(null); 
      setMessages([]); 
      socket?.emit('joinRoom', roomId); 
      socket?.emit('getHistory', roomId); 
      socket?.emit('markAsRead', roomId);
  };

  const handleBackToRoomList = () => {
      setCurrentRoom(null);
      setMessages([]);
      setUserContext(null);
  };

  return (
    <>
      <IconButton 
        onClick={() => setOpen(!open)}
        sx={{
          position: 'fixed', bottom: 30, right: 30, 
          bgcolor: '#4f46e5', color: 'white', 
          width: 60, height: 60, boxShadow: 6,
          '&:hover': { bgcolor: '#4338ca' },
          zIndex: 1200 
        }}
      >
        <Badge badgeContent={role === 'admin' ? unreadRooms.size : userUnreadCount} color="error" overlap="circular">
          {open ? <Close /> : <ChatIcon fontSize="large" />}
        </Badge>
      </IconButton>

      {open && (
        <Paper sx={{
          position: 'fixed', bottom: 100, right: 30,
          width: 350, height: 500, 
          zIndex: 1200, 
          display: 'flex', flexDirection: 'column',
          borderRadius: 4, overflow: 'hidden', boxShadow: 6
        }}>
          {/* Header */}
          <Box sx={{ p: 2, bgcolor: '#4f46e5', color: 'white', display: 'flex', flexDirection: 'column' }}>
             <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                    {role === 'admin' && currentRoom && (
                        <IconButton size="small" onClick={handleBackToRoomList} sx={{color: 'white', mr: 1}}>
                            <Close fontSize="small" sx={{transform: 'rotate(180deg)'}} /> 
                        </IconButton>
                    )}
                    <Typography fontWeight="bold">
                        {role === 'admin' ? (currentRoom ? `Chat` : 'Inbox') : '💬 Customer Support'}
                    </Typography>
                </Box>
             </Box>
             {/* ✅ 3. เช็คเงื่อนไข showContext เพื่อซ่อน/แสดง Alert */}
             {role === 'admin' && userContext && currentRoom && showContext && (
                 <Alert severity="info" sx={{ mt: 1, py: 0, fontSize: '0.75rem' }}>
                     {userContext}
                 </Alert>
             )}
          </Box>

          {/* Content */}
          <Box sx={{ flexGrow: 1, bgcolor: '#f8fafc', overflowY: 'auto', p: 2 }} ref={scrollRef}>
            {role === 'admin' && !currentRoom ? (
                <List>
                    {adminActiveRooms.map((room, index) => (
                        <div key={room.roomId || index}>
                            <ListItemButton onClick={() => handleAdminSelectRoom(room.roomId)} sx={{ bgcolor: unreadRooms.has(room.roomId) ? '#eff6ff' : 'transparent' }}>
                                <ListItemAvatar>
                                    <Badge variant="dot" color="error" invisible={!unreadRooms.has(room.roomId)}>
                                        <Avatar><Person /></Avatar>
                                    </Badge>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={room.name} 
                                    secondary={unreadRooms.has(room.roomId) ? "New message!" : "Click to reply"} 
                                    primaryTypographyProps={{ fontWeight: unreadRooms.has(room.roomId) ? 'bold' : 'normal' }}
                                />
                            </ListItemButton>
                            <Divider />
                        </div>
                    ))}
                </List>
            ) : (
                <>
                {messages.map((m, i) => {
                    const isMe = role === 'admin' ? m.is_admin_reply : !m.is_admin_reply;
                    const canDelete = isMe || role === 'admin';

                    return (
                        <Box 
                            key={i} 
                            sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', mb: 1.5 }}
                            onMouseEnter={() => setHoverMessageId(m.id)}
                            onMouseLeave={() => setHoverMessageId(null)}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, flexDirection: isMe ? 'row' : 'row-reverse' }}>
                                {/* ปุ่มลบ */}
                                {canDelete && hoverMessageId === m.id && (
                                    <IconButton size="small" onClick={() => handleDeleteMessage(m.id)} sx={{ opacity: 0.6, '&:hover': { opacity: 1, color: 'red' } }}>
                                        <DeleteOutline fontSize="small" />
                                    </IconButton>
                                )}

                                <Box sx={{ 
                                    bgcolor: isMe ? '#4f46e5' : 'white',
                                    color: isMe ? 'white' : 'black',
                                    p: 1.5, borderRadius: 2, maxWidth: '200px', 
                                    boxShadow: 1,
                                    borderBottomRightRadius: isMe ? 0 : 2,
                                    borderBottomLeftRadius: isMe ? 2 : 0
                                }}>
                                    {m.image_url && (
                                        <Box 
                                            component="img" 
                                            src={m.image_url} 
                                            onClick={() => setPreviewImage(m.image_url!)} 
                                            sx={{ 
                                                maxWidth: '100%', 
                                                borderRadius: 1, 
                                                mb: m.message ? 1 : 0,
                                                cursor: 'pointer', 
                                                '&:hover': { opacity: 0.9 } 
                                            }} 
                                        />
                                    )}
                                    {m.message && <Typography variant="body2">{m.message}</Typography>}
                                </Box>
                            </Box>
                        </Box>
                    );
                })}
                {isTyping && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5, opacity: 0.7 }}>
                        <Typography variant="caption" sx={{ fontStyle: 'italic' }}>typing...</Typography>
                    </Box>
                )}
                </>
            )}
          </Box>

          {/* Input Area */}
          {(!((role === 'admin' && !currentRoom))) && (
              <Box sx={{ p: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: 'white' }}>
                {selectedImage && (
                    <Box sx={{ position: 'relative', width: 'fit-content', mb: 1 }}>
                        <Box 
                            component="img" 
                            src={selectedImage} 
                            sx={{ maxHeight: 100, borderRadius: 2, border: '1px solid #e2e8f0' }} 
                        />
                        <IconButton 
                            size="small" 
                            onClick={handleClearImage}
                            sx={{ 
                                position: 'absolute', top: -10, right: -10, 
                                bgcolor: 'rgba(0,0,0,0.6)', color: 'white',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } 
                            }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                        type="file" 
                        accept="image/*" 
                        hidden 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                    />
                    <IconButton color={selectedImage ? "primary" : "default"} onClick={() => fileInputRef.current?.click()}>
                        <AttachFile />
                    </IconButton>
                    
                    <TextField 
                    fullWidth size="small" placeholder="Type a message..." 
                    value={inputText} onChange={handleTyping}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    InputProps={{ sx: { borderRadius: 3 } }}
                    />
                    <IconButton color="primary" onClick={handleSend} sx={{ ml: 1 }}><Send /></IconButton>
                </Box>
              </Box>
          )}
        </Paper>
      )}

      {/* Dialog (Lightbox) */}
      <Dialog 
        open={!!previewImage} 
        onClose={() => setPreviewImage(null)}
        maxWidth="lg"
        onClick={() => setPreviewImage(null)} 
      >
        <DialogContent sx={{ p: 0, bgcolor: 'black', display: 'flex', justifyContent: 'center' }}>
            <img 
                src={previewImage || ''} 
                alt="Full preview" 
                style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} 
            />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChatWidget;