import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js"
import Message from "../models/message.models.js";
import axios from "axios";

const getAllMessages = asyncHandler(async (req, res) => {
    const { senderId, receiverId } = req.body;
    console.log(senderId, receiverId);

    const roomId = [senderId, receiverId].sort().join("_");

    const messages = await Message.find({ roomId: roomId });

    return res
        .status(200)
        .json(
            new ApiResponse(200, messages, "Messages retrieved successfully")
        );
});

const translateMessage = asyncHandler(async (req, res) => {
    const { sourceLanguage, targetLanguage, message } = req.body;

    const response = await axios({
        method: "POST",
        url: process.env.TRANSLATION_URL,
        headers: {
            "x-rapidapi-key": process.env.X_RAPIDAPI_KEY,
            "x-rapidapi-host": process.env.X_RAPIDAPI_HOST,
            "Content-Type": "application/json",
        },
        data: {
            from: sourceLanguage,
            to: targetLanguage,
            html: message,
        },
    });

    const translatedMessage = response.data;
    
    if(!translateMessage){
        throw new ApiError(500,"Message Translation Failed");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                translatedMessage,
                "Message translated successfully"
            )
        );
});

export { getAllMessages, translateMessage };
