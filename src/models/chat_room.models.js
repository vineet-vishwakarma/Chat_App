import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            }
        ],
        lastMessage: String,
    },
    {timestamps: true}
);

const ChatRoom = mongoose.model('ChatRoom',chatRoomSchema);
export default ChatRoom;