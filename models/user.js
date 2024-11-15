const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNo: {
        type: String,
        required: true,
        validate: {
            validator: (value) => {
                const re = /^\d{10}$/;
                return re.test(value);
            },
            message: "Please enter a valid 10-digit phone number",
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (value) => {
                const re = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
                return value.match(re);
            },
            message: "Please Enter a Valid Email Address",
        }
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    userType: {
        type: String,
        enum: ['user', 'admin', 'added'],
        default: 'user'
    },
    package: {
        type: Number,
        required: true,
    },
    type: {
        type: Number,
        required: true,
    },
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    },
    gstin: {
        type: String,
        // required: true,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    
    certificate: {
        data: Buffer,
        contentType: String
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CompanyProfile', 
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
    },
    addedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

const User = mongoose.model("User", userSchema);
module.exports = User;
