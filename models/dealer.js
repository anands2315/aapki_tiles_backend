const mongoose = require('mongoose');

const dealerSchema = new mongoose.Schema({
    logo: {
        type: String,  
    },
    banner: {
        type: String,
    },
    businessName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    district: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    contact: {
        type: String,
        required: true,
    },
    whatsapp: {
        type: String,
    },
    email: {
        type: String,
        required: true
    },
    socialMedia: {
        facebook: { type: String },
        twitter: { type: String },
        instagram: { type: String },
        youtube: { type: String }
    },
    year: {
        type: Number,
    },
    latitude: {
        type: Number,
    },
    longitude: {
        type: Number,
    },
    isIndian: {
        type: Boolean,
        default: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    about: {
        type: String,
    },
    contactPersons: [{
        name: { type: String },
        designation: { type: String },
        contact: { type: String },
        whatsapp: { type: String },
        email: { type: String },
    }],
    locationUrl: {
        type: String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
   
    size: {
        type: [String],
        default: ['0'] 
    },
}, {
    timestamps: true,
});


const Dealer = mongoose.model('Dealer', dealerSchema);

module.exports = Dealer;
