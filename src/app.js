import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import Message from "./models/message.models.js"
// import ChatRoom from "./models/chat_room.models.js"

const app = express();

const server = createServer(app);
const io = new Server(server);

const onlineUsers = new Map();

io.on('connection', (socket) => {
    socket.on('userOnline', (userId) => {
        onlineUsers.set(userId, socket.id);
        io.emit('userStatus', { userId, status: 'online' });
    });

    socket.on('userOffline', (userId) => {
        onlineUsers.delete(userId);
        io.emit('userStatus', { userId, status: 'offline' });
    });

    socket.on('checkUserStatus', (userId) => {
        const status = onlineUsers.has(userId) ? 'online' : 'offline';
        socket.emit('userStatus', { userId, status });
    });

    socket.on('joinRoom', async ({ userId, receiverId }) => {
        const roomId = [userId, receiverId].sort().join('_');
        socket.join(roomId);
        console.log(`User ${userId} joined room ${roomId}`);

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: receiverId },
                { senderId: receiverId, receiverId: userId }
            ]
        }).sort({ createdAt: 1 });

        socket.emit('previousMessages', messages);
    });

    socket.on('sendMessage', async ({ senderId, receiverId, messageText, translatedText }) => {
        const roomId = [senderId, receiverId].sort().join('_');

        const message = new Message({
            roomId,
            senderId,
            receiverId,
            messageText,
            translatedText,
        });

        await message.save();

        io.to(roomId).emit('receiveMessage', message);
    });

    socket.on('disconnect', () => {
        const userId = [...onlineUsers.entries()].find(([_, id]) => id === socket.id)?.[0];
        if (userId) {
            onlineUsers.delete(userId);
            io.emit('userStatus', { userId, status: 'offline' });
        }
        console.log('Client disconnected');
    });
});

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(express.static("public"));
app.use(cookieParser());

// import router
import userRouter from "./routes/user.routes.js"
import messageRouter from "./routes/message.routes.js"

// routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);

export {
    app,
    server
};