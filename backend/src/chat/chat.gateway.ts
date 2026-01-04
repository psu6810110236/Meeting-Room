import { 
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, 
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true }) 
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1]; 
      if (token) {
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'yourSecretKey' });
        client.data.user = payload; 
        
        const roomId = payload.role === 'admin' ? 'admin_room' : `user_${payload.sub}`;
        client.join(roomId);

        if (payload.role !== 'admin') {
            const unreadCount = await this.chatService.getUnreadCount(payload.sub, payload.role);
            client.emit('unreadCountUpdate', unreadCount);
        }
      } else {
        client.disconnect(); 
      }
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {}

  @SubscribeMessage('sendMessage')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: { message: string; targetRoomId?: string, image?: string }) {
    const user = client.data.user;
    if (!user) return;

    const isAdmin = user.role === 'admin';
    const roomId = isAdmin ? payload.targetRoomId : `user_${user.sub}`;
    if (!roomId) return;

    const savedMsg = await this.chatService.saveMessage(user.sub, payload.message, isAdmin, roomId, payload.image);
    this.server.to(roomId).emit('receiveMessage', savedMsg);

    if (isAdmin) {
       const userId = Number(roomId.split('_')[1]); 
       const unread = await this.chatService.getUnreadCount(userId, 'user');
       this.server.to(roomId).emit('unreadCountUpdate', unread);
    } else {
       this.server.to('admin_room').emit('adminNotification', { roomId }); 
       
       // Auto-reply logic (Optional)
       const now = new Date();
       const hour = now.getHours();
       if (hour < 9 || hour >= 18) {
           // ... (Auto reply logic เหมือนเดิม)
       }
    }
  }

  // ✅ ฟังก์ชันใหม่: รับคำสั่งลบข้อความ
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(@ConnectedSocket() client: Socket, @MessageBody() messageId: number) {
      const user = client.data.user;
      if (!user) return;

      const deletedMsg = await this.chatService.deleteMessage(messageId, user.sub, user.role);
      
      if (deletedMsg) {
          // แจ้งทุกคนในห้องว่าข้อความนี้หายไปแล้ว (ส่ง ID ไป)
          this.server.to(deletedMsg.room_id).emit('messageDeleted', messageId);
      }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
      const user = client.data.user;
      if (!user) return;
      
      const targetRoom = user.role === 'admin' ? roomId : `user_${user.sub}`;
      await this.chatService.markAsRead(targetRoom, user.role);
      
      if (user.role !== 'admin') {
          const unreadCount = await this.chatService.getUnreadCount(user.sub, user.role);
          client.emit('unreadCountUpdate', unreadCount);
      }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
      client.join(roomId);
      const user = client.data.user;
      if (user && user.role === 'admin' && roomId.startsWith('user_')) {
          const targetUserId = Number(roomId.split('_')[1]);
          const contextInfo = await this.chatService.getUserLatestBookingContext(targetUserId);
          if (contextInfo) {
              client.emit('userContext', contextInfo);
          }
      }
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
      client.to(roomId).emit('typing', { username: client.data.user.username });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
      client.to(roomId).emit('stopTyping');
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
      const messages = await this.chatService.getMessages(roomId);
      client.emit('history', messages);
  }

  @SubscribeMessage('getActiveChats')
  async handleGetActiveChats(@ConnectedSocket() client: Socket) {
      const chats = await this.chatService.getActiveChats();
      client.emit('activeChats', chats);
  }
}