import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase:true,
            trim:true
        },
        password:{
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['online','offline'],
        },
        profilePicture: {
            type: String,
            default: 'https://res.cloudinary.com/dnqdcxldn/image/upload/v1726504736/l60Hf_te3txt.png',
        },
        selectedLanguage: {
            type: String
        },
        lastSeen: {
            type: Date,
        },
        refreshToken: {
            type: String
        }
    },
    {timestamps:true}
);

// A pre-save middleware for the Mongoose schema that runs before saving a document.
// It ensures that the password is hashed before being stored in the database.
userSchema.pre("save", async function (next) {

    // If the password field has not been modified (e.g., during an update operation),
    // the middleware exits early and proceeds to the next step.
    if (!this.isModified("password")) 
        return next();

    // If the password has been modified (or it's a new document), 
    // hash the password using bcrypt with a salt of 10 rounds.
    this.password = await bcrypt.hash(this.password, 10);

    // Call `next()` to continue with the save operation.
    next();
});

// A schema method to compare the provided password with the hashed password stored in the database.
userSchema.methods.isPasswordCorrect = async function (password) {
    // bcrypt.compare compares the plain text password with the hashed password.
    // It returns `true` if the passwords match, `false` otherwise.
    return await bcrypt.compare(password, this.password);
}

// A method to generate a JWT access token for the user.
userSchema.methods.generateAccessToken = function () {
    // The token payload includes the user's ID, username, and email.
    // The token is signed with the `ACCESS_TOKEN_SECRET` from environment variables
    // and has an expiration time defined by `ACCESS_TOKEN_EXPIRY`.
    return jwt.sign(
        {
            _id: this._id, 
            username: this.username, 
            email: this.email
        }, 
        process.env.ACCESS_TOKEN_SECRET, 
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

// A method to generate a JWT refresh token for the user.
userSchema.methods.generateRefreshToken = function () {
    // The refresh token only contains the user's ID in the payload.
    // The token is signed with the `REFRESH_TOKEN_SECRET` and has a different expiration time.
    return jwt.sign(
        {
            _id: this._id
        }, 
        process.env.REFRESH_TOKEN_SECRET, 
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

export const User = mongoose.model('User',userSchema);