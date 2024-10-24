const express = require('express');
const dealerRouter = express.Router();
const Dealer = require('../models/dealer');
const Category = require('../models/category');


dealerRouter.post('/api/add-dealers', async (req, res) => {
    try {
        let data = req.body;
        // console.log(data);

        if (!Array.isArray(data)) {
            data = [data];
        }

        const dealerPromises = data.map(async (item) => {
            const category = await Category.findOne({ category: item.category }).exec();
        
            if (!category) {
                throw new Error('Valid category is required');
            }
        
            let logo = item.logo !== 'null' ? item.logo : undefined;
            let banner = item.banner !== 'null' ? item.banner : undefined;
        
            const contactPersons = [];
            for (let i = 1; i <= 3; i++) {
                if (item[`personName${i}`] && item[`personName${i}`] !== 'null') {
                    contactPersons.push({
                        name: item[`personName${i}`],
                        designation: item[`personPost${i}`] !== 'null' ? item[`personPost${i}`] : undefined,
                        contact: item[`personContact${i}`] !== 'null' ? item[`personContact${i}`].toString() : undefined,
                        whatsapp: item[`personWhatsapp${i}`] !== 'null' ? item[`personWhatsapp${i}`].toString() : undefined,
                        email: item[`personEmail${i}`] !== 'null' ? item[`personEmail${i}`] : undefined,
                    });
                }
            }
        
            // const isIndian = item.isIndian === "null" || item.isIndian === null || item.isIndian === undefined ? false : item.isIndian;
            const isVerified = item.isVerified === 1 ? true : false;
        
            // Handle latitude and longitude
            const latitude = (item.latitude && item.latitude !== 'null') ? Number(item.latitude) : undefined;
            const longitude = (item.longitude && item.longitude !== 'null') ? Number(item.longitude) : undefined;
        
            // Create dealer entry
            const dealer = await Dealer.create({
                logo: logo,
                banner: banner,
                businessName: item.businessName,
                role: item.role,
                address: item.address,
                city: item.city,
                district: item.district,
                state: item.state,
                country: item.country,
                contact: item.contact.toString(),
                whatsapp: item.whatsapp ? item.whatsapp.toString() : undefined,
                email: item.email,
                socialMedia: {
                    facebook: item.facebook,
                    twitter: item.twitter,
                    instagram: item.instagram,
                    youtube: item.youtube,
                },
                year: item.year,
                latitude: latitude,  
                longitude: longitude,  
                isIndian: false,
                isVerified: isVerified,
                about: item.about,
                contactPersons,
                category: category._id,
                locationUrl: item.locationUrl,
                size: item.size,
            });
        
            return dealer; 
        });
        

        const dealers = await Promise.all(dealerPromises);
        res.status(200).json({ message: 'Dealers saved successfully', dealers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while saving dealers', details: error.message });
    }
});


dealerRouter.get('/api/dealer-profile/:id', async (req, res) => {
    try {
        // Fetch the company profile by ID and populate the category
        const profile = await Dealer.findById(req.params.id).populate('category');
        if (!profile) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        // Ensure category image is converted to Base64 if it exists
        let categoryWithBase64Image;
        if (profile.category) {
            categoryWithBase64Image = {
                ...profile.category._doc,
                image: profile.category.image && profile.category.image.data ? {
                    data: profile.category.image.data.toString('base64'),
                    contentType: profile.category.image.contentType
                } : undefined,
            };
        }

        // Convert logo and banner to Base64 if they exist
        const profileWithBase64Images = {
            ...profile._doc, // Use _doc to get the raw MongoDB document
            logo: profile.logo && profile.logo.data ? {
                data: profile.logo.data.toString('base64'),
                contentType: profile.logo.contentType
            } : undefined,
            banner: profile.banner && profile.banner.data ? {
                data: profile.banner.data.toString('base64'),
                contentType: profile.banner.contentType
            } : undefined,
            category: categoryWithBase64Image // Replace category with the modified version
        };

        // Send the modified profile object as a response
        res.status(200).json(profileWithBase64Images);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching the company profile', details: error.message });
    }
});


dealerRouter.get('/api/dealers', async (req, res) => {
    try {
        
        const { page = 1, limit = 12, categoryName, businessName, isIndian } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};

        // Filter by category name
        if (categoryName) {
            const category = await Category.findOne({ category: categoryName }).exec();

            if (!category) {
                return res.status(404).json({
                    message: `No dealers found for category: ${categoryName}`,
                    dealers: [],
                    totalPages: 0,
                    currentPage: Number(page),
                });
            }

            filter.category = category._id;
        }

        // Filter by business name (case-insensitive)
        if (businessName) {
            filter.businessName = { $regex: new RegExp(businessName, 'i') }; 
        }

        // Filter by Indian dealers
        if (isIndian) {
            filter.isIndian = isIndian === 'true'; // Convert query parameter to boolean
        }

        const totalDealers = await Dealer.countDocuments(filter);

        const dealers = await Dealer.find(filter)
            .skip(skip)
            .limit(Number(limit))
            .populate('category')
            .lean()
            .exec();

        // Add logo and banner paths
        dealers.forEach(dealer => {
            dealer.logoPath = dealer.logo || null;
            dealer.bannerPath = dealer.banner || null;
        });

        const totalPages = Math.ceil(totalDealers / limit);

        res.status(200).json({
            dealers,
            totalPages,
            currentPage: Number(page),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching dealers', details: error.message });
    }
});


module.exports = dealerRouter;