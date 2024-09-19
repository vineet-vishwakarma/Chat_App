import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Error while generating Tokens");
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    const { username, email, password, selectedLanguage } = req.body;
    
    if (
        [email, username, password].some( 
            field => !field.trim()
        )
    ) { 
        throw new ApiError(400, "All fields are required !!!")
    }
    
    const existedUser = await User.findOne({
        $or: [ {email}, {username} ]
    });

    if(existedUser){
        throw new ApiError(409, "User already exist !!!")
    }
    
    if(selectedLanguage=='Choose Language' || selectedLanguage==''){
        selectedLanguage='English'
    }

    let profilePictureLocalPath;
    if (req.files && Array.isArray(req.files.profilePicture) && req.files.profilePicture.length > 0) {
        profilePictureLocalPath = req.files.profilePicture[0].path
    }
    
    const profilePicture = await uploadOnCloudinary(profilePictureLocalPath);

    const user = await User.create({
        username,
        email,
        password,
        profilePicture: profilePicture?.url || "https://res.cloudinary.com/dnqdcxldn/image/upload/v1726504736/l60Hf_te3txt.png",
        selectedLanguage
    })

    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    if(!createdUser){
        throw new ApiError(500,"User Registration Failed")
    }

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: createdUser, accessToken, refreshToken
            },
            "User Registered Successfully !!!"
        )
    )
})

const loginUser = asyncHandler(async(req,res)=>{
    const { email, username ,password } = req.body;
    
    if(!username && !email){
        throw new ApiError(400, "Username and Email are required !!!")
    }

    const user = await User.findOne({ 
        $or: [ {email},{username} ]
    });
    
    if(!user){
        throw new ApiError(404,"User does not exist !!!")
    }

    const isPasswordVaild = await user.isPasswordCorrect(password);
    
    if(!isPasswordVaild){
        throw new ApiError(401,"Invalid Password !!!")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    
    const loggedInUser = await User.findById(user._id).select( "-password -refreshToken" );

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User Logged In Successfully !!!"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200,
            {},
            "User Logged Out Successfully"
        )
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changePassword = asyncHandler(async(req,res)=>{
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Incorrect Password");
    }

    user.password=newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    console.log(req.user);
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "User retrieved successfully"
        )
    )
})

// const updateDefaultLanguage = asyncHandler(async(req,res)=>{
//     const { language } = req.body;
//     const user = await User.findById(req.user._id).select("-password -refreshToken");
    
//     user.defaultLanguage = language;
//     await user.save({validateBeforeSave: false});
    
//     return res
//     .status(200)
//     .json(new ApiResponse(
//         200, 
//         {}, 
//         "Default language updated successfully"
//     ))
// })

const updateProfilePicture = asyncHandler(async(req,res) => {
    const profilePictureLocalPath = req.file?.path;

    if(!profilePictureLocalPath){
        throw new ApiError(400, "Profile Picture is required");
    }

    const profilePicture = await uploadOnCloudinary(profilePictureLocalPath);

    if(!profilePicture.url){
        throw new ApiError(400, "Error while uploading on Profile Picture");
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                profilePicture: profilePicture.url
            }
        },
        { new: true }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Profile Picture updated successfully"
    ));
})

const getAllUser = asyncHandler(async (req,res)=> {
    const { currentUserId } = req.query;
    
    if (!currentUserId) {
        return res.status(400).json({ message: 'Current user ID is required' });
    }

    const users = await User.find({ 
        _id: { $ne: currentUserId } 
    }).select("-password -refreshToken");
    res.status(200).json(new ApiResponse(
        200,
        users,
        "Users retrieved successfully"
    ));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    // updateDefaultLanguage,
    updateProfilePicture,
    getAllUser,
}