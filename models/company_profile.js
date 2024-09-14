const mongoose = require('mongoose');

const companyProfileSchema = new mongoose.Schema({
    logo: {
        data: Buffer,
        contentType: String,
    },
    banner: {
        data: Buffer,
        contentType: String,
    },
    businessName: {
        type: String,
        required: true
    },
    brandName: {
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
    companyContact: {
        type: String,
        required: true,
    },
    companyWhatsapp: {
        type: String,
    },
    email: {
        type: String,
        required: true
    },
    website: {
        type: String,
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
        ref: 'Category' 
    },
    size: [String] 
}, {
    timestamps: true,
});

companyProfileSchema.virtual('logoPath').get(function () {
    return this.logo ? `data:${this.logo.contentType};base64,${this.logo.data.toString('base64')}` : null;
});

companyProfileSchema.virtual('bannerPath').get(function () {
    return this.banner ? `data:${this.banner.contentType};base64,${this.banner.data.toString('base64')}` : null;
});

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);

module.exports = CompanyProfile;