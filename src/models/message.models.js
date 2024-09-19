import mongoose from "mongoose";

const messageSchema = mongoose.Schema(
    {   
        roomId:{
            type:String,
            required:true,
        },
        senderId:{
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        receiverId:{
            type: mongoose.Schema.ObjectId,
            ref: 'User',
        },
        messageText:{
            type: String,
            required: true
        },
        translatedText:{
            type: String,
        },
        isRead:{
            type: Boolean,
            default: false
        }
    },
    {timestamps: true}
);

const Message = mongoose.model('Message',messageSchema);
export default Message;