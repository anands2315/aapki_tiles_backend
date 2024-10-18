const express = require('express');
const bcryptjs = require('bcryptjs');
const User = require("../models/user");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Otp = require('../models/otp');
const { sendOtpMail, sendResetPasswordMail } = require('../utils/mailer');
const userRouter = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

userRouter.post('/api/signUp', upload.single('certificate'), async (req, res) => {
    try {
        const { name, email, password, phoneNo, userType = 'user', package = 0, gstin, type = 0 } = req.body;

        const otpRecord = await Otp.findOne({ email });
        if (!otpRecord || !otpRecord.otpVerified) {
            return res.status(400).json({ msg: "Email not verified. Please verify your email before signing up." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: "User with the same email already exists!" });
        }

        const hashedPassword = await bcryptjs.hash(password, 8);

        let user = new User({
            email,
            password: hashedPassword,
            name,
            phoneNo,
            userType,
            package,
            gstin,
            isVerified: false,
            certificate: {
                data: req.file.buffer,
                contentType: req.file.mimetype
            },
            type
        });

        user = await user.save();
        await Otp.deleteOne({ email });

        // Return user data with the certificate in Base64 format
        const userResponse = {
            ...user._doc,
            certificate: {
                data: user.certificate.data.toString('base64'),
                contentType: user.certificate.contentType,
            }
        };

        res.json(userResponse);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



userRouter.post('/api/addUsers', async (req, res) => {
    try {
       const {
            name,
            email,
            password,
            phoneNo,
            userType = 'user',
            package = 1,
            type = 0,
            gstin,
            addedBy,
        } = req.body;

        // Check if email is verified
        const otpRecord = await Otp.findOne({ email });
        if (!otpRecord || !otpRecord.otpVerified) {
            return res.status(400).json({ msg: "Email not verified. Please verify your email before signing up." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: "User with the same email already exists!" });
        }

        // Hash the password
        const hashedPassword = await bcryptjs.hash(password, 8);

        const adminUser = await User.findById(addedBy);
        if (!adminUser) {
            return res.status(404).json({ msg: "Admin user not found." });
        }
        const certificate = adminUser.certificate; // Assuming the admin user has a 'certificate' field
        const companyId = adminUser.companyId; // Assuming the admin user has a 'certificate' field

        // Create a new user
        let user = new User({
            email,
            password: hashedPassword,
            name,
            phoneNo,
            userType,
            package,
            type,
            gstin,
            certificate,
            isVerified: true,
            addedBy: addedBy,
            companyId:companyId
        });

        // Save the user to the database
        user = await user.save();

        // Update the main user with the added user's ID
        await User.findByIdAndUpdate(addedBy, { $push: { addedUsers: user._id } });


        // Optionally delete the OTP record
        await Otp.deleteOne({ email });

        // Return the created user object in the response
        res.json({ msg: 'User Created' });
    } catch (e) {
        console.error(e); // Log the error for debugging
        res.status(500).json({ error: e.message });
    }
});


userRouter.patch('/api/updateAddedUser/:userId', async (req, res) => {
    try {
        const { userId } = req.params; // Get user ID from URL params
        const { name, phoneNo, email } = req.body; // Get fields to update from request body

        // Find the existing user by ID
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ msg: "User not found." });
        }

        // Update only specific fields if they are not null or empty
        const updatedData = {
            name: name || existingUser.name,  // Retain previous value if null/empty
            phoneNo: phoneNo || existingUser.phoneNo,  // Retain previous value if null/empty
            email: email || existingUser.email  // Retain previous value if null/empty
        };

        // Update the user in the database
        await User.findByIdAndUpdate(userId, updatedData, { new: true });

        // Return a success message
        res.json({ msg: 'User updated successfully' });
    } catch (e) {
        console.error(e); // Log the error for debugging
        res.status(500).json({ error: e.message });
    }
});

userRouter.get("/api/addUser", auth, async (req, res) => {
    try {
        const addedBy = req.query.addedBy;
        const addedUsers = await User.find({ addedBy: addedBy });
        res.json(addedUsers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

userRouter.delete('/api/deleteAddedUser/:addedBy', auth, async (req, res) => {
    try {
        const { addedBy } = req.params;
        const { userId: mainUserId } = req.body;
       
        const deletedUser = await User.findByIdAndDelete(addedBy);

        if (!deletedUser) {
            return res.status(404).json({ msg: "User not found!" });
        }

        await User.findByIdAndUpdate(mainUserId, { $pull: { addedUsers: addedBy } });

        res.json({ msg: "User deleted successfully!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


userRouter.post('/api/sendOtp', async (req, res) => {
    try {
        const { email } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: "User with the same email already exists!" });
        }

        const existingOtp = await Otp.findOne({ email });
        if (existingOtp) {
            return res.status(200).json({ msg: "Verification in progress. Please check your email for OTP." });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        let otpRecord = new Otp({
            email,
            otp,
            otpExpires,
            otpVerified: false
        });

        await otpRecord.save();
        sendOtpMail(email, otp);

        res.json({ msg: "OTP sent to your email. Please verify to complete the sign-up." });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

userRouter.post('/api/verifyOtp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const otpRecord = await Otp.findOne({ email });
        if (!otpRecord || otpRecord.otp !== otp || otpRecord.otpExpires < Date.now()) {
            return res.status(400).json({ msg: "Invalid or expired OTP." });
        }

        otpRecord.otpVerified = true;
        await otpRecord.save();

        res.json({ msg: "Email verified successfully." });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

userRouter.post('/api/resendOtp', async (req, res) => {
    try {
        const { email } = req.body;
        const otpRecord = await Otp.findOne({ email });

        if (!otpRecord) {
            return res.status(400).json({ msg: "User not found. Please sign up first." });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

        otpRecord.otp = otp;
        otpRecord.otpExpires = otpExpires;

        await otpRecord.save();
        sendOtpMail(email, otp);

        res.json({ msg: "OTP resent successfully. Please check your email." });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

userRouter.post('/api/signin', async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "User with this email does not exist!" });
        }

        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Incorrect password." });
        }

        const token = jwt.sign({ id: user._id }, "passwordKey");

        // Prepare response with the certificate in Base64 format
        const userResponse = {
            token,
            ...user._doc,
            certificate: user.certificate ? {
                data: user.certificate.data.toString('base64'),
                contentType: user.certificate.contentType,
            } : null // Handle case where certificate might not be present
        };

        res.json(userResponse);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


userRouter.post('/api/forgetPassword', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "User with this email does not exist!" });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // Token expires in 1 hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpires;

        await user.save();

        const resetUrl = `https://beonbusiness.com/resetPassword/${resetToken}`;
        sendResetPasswordMail(email, resetUrl);

        res.json({ msg: "Password reset token sent to your email." });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

userRouter.post('/api/resetPassword/:resetToken', async (req, res) => {
    try {
        const { resetToken } = req.params;
        const { newPassword } = req.body;

        const user = await User.findOne({ resetPasswordToken: resetToken, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ msg: "Invalid or expired reset token." });
        }

        const hashedPassword = await bcryptjs.hash(newPassword, 8);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ msg: "Password reset successfully." });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

userRouter.get("/api/user", async (req, res) => {
    try {
        const users = await User.find({});

        const usersWithCertificates = users.map(user => {
            const userObj = user.toObject();
            if (user.certificate && user.certificate.data) {
                return {
                    ...userObj,
                    certificate: {
                        data: user.certificate.data.toString('base64'),
                        contentType: user.certificate.contentType,
                    }
                };
            }
            return userObj;
        });

        res.json(usersWithCertificates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


userRouter.put('/api/updateUser/:id', upload.single('certificate'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phoneNo, userType, package, gstin, isVerified, companyId } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ msg: "User not found!" });
        }

        // Update user fields only if they are defined
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (phoneNo !== undefined) user.phoneNo = phoneNo;
        if (userType !== undefined) user.userType = userType;
        if (package !== undefined) user.package = package;
        if (gstin !== undefined) user.gstin = gstin; // Update gstin only if provided
        if (isVerified !== undefined) user.isVerified = isVerified;
        if (companyId !== undefined) user.companyId = companyId; // Update companyId if provided

        // Update certificate if provided
        if (req.file) {
            user.certificate = {
                data: req.file.buffer,
                contentType: req.file.mimetype
            };
        }

        await user.save();

        // Return updated user with the certificate in Base64 format
        const updatedUserResponse = {
            ...user._doc,
            certificate: user.certificate ? {
                data: user.certificate.data.toString('base64'),
                contentType: user.certificate.contentType,
            } : null // Handle case where certificate might not be present
        };

        res.json(updatedUserResponse);
    } catch (e) {
        res.status(500).json({ error: e.message });
        console.log(e.message);
    }
});




userRouter.delete("/api/deleteUser/:id", async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ msg: "User not found!" });
        }
        res.json({ msg: "User deleted successfully!" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = userRouter;
