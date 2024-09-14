const nodemailer = require('nodemailer');

const appPassword = 'eysr wezr hjia unkc';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'anandksingh098@gmail.com',
        pass: appPassword
    }
});

const sendOtpMail = (email, otp) => {
    const receiver = {
        from: 'anandksingh098@gmail.com',
        to: email,
        subject: 'Beon Business Email Verification',
        text: `Thank you for signing up. Please verify your email address using the OTP below:\n
            ${otp}\n
        Enter this OTP in the verification form to complete your registration.
        If you did not request this, please ignore this email.`
    };

    transporter.sendMail(receiver, (error, info) => {
        if (error) {
            return console.log('Error sending OTP email:', error);
        }
        console.log('Email sent: ' + info.response);
    });
};

const sendResetPasswordMail = (email, resetUrl) => {
    const receiver = {
        from: 'support@beonbusiness.com',
        to: email,
        subject: 'Reset Password',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\nPlease click on the following link, or paste this into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    transporter.sendMail(receiver, (error, info) => {
        if (error) {
            return console.log('Error sending reset password email:', error);
        }
        console.log('Reset password email sent: ' + info.response);
    });
};

module.exports = {
    sendOtpMail,
    sendResetPasswordMail
};
