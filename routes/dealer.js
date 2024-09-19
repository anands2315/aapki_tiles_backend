const express = require('express');
const dealerRouter = express.Router();
const Dealer = require('../models/dealer');
const multer = require('multer');
const Category = require('../models/category');


// Configure multer to handle image uploads in memory as Buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

dealerRouter.post('/api/add-dealers', async (req, res) => {
    try {
        let data = req.body;

        if (!Array.isArray(data)) {
            data = [data];
        }

        // Process each dealer in the incoming request
        const dealerPromises = data.map(async (item) => {
            // Fetch only category1 from the Category collection
            const category = await Category.findOne({ category: item.category1 }).exec();

            // If category1 is invalid or missing, throw an error
            if (!category) {
                throw new Error('Valid category1 is required');
            }

            let logo = item.logo !== 'null' ? item.logo : undefined;
            let banner = item.banner !== 'null' ? item.banner : undefined;

            // Prepare contact persons data
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

            // Handle isIndian (store false if "null" or null)
            const isIndian = item.isIndian === "null" || item.isIndian === null || item.isIndian === undefined ? false : item.isIndian;

            // Handle isVerified (convert 0 or null to false, 1 to true)
            const isVerified = item.isVerified === 1 ? true : false;

            // Create the dealer record with the provided data
            return Dealer.create({
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
                latitude: item.latitude !== "null" ? Number(item.latitude) : undefined,
                longitude: item.longitude !== "null" ? Number(item.longitude) : undefined,
                isIndian: isIndian,
                isVerified: isVerified,
                about: item.about,
                contactPersons,
                category: category._id,  // Use the category1's ID
                subCategories: [item.subCategory1, item.subCategory2, item.subCategory3].filter(sub => sub && sub !== 'null'),
                locationUrl: item.locationUrl,
            });
        });

        // Await the creation of all dealer records
        await Promise.all(dealerPromises);
        res.status(200).json({ message: 'Dealers saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while saving dealers', details: error.message });
    }
});


// GET /api/dealers - Fetch paginated list of dealers with image paths
dealerRouter.get('/api/dealers', async (req, res) => {
    try {
        const { page = 1, limit = 12, categoryName } = req.query;
        const skip = (page - 1) * limit;

        // Check if a category name filter is provided
        let categoryFilter = {};
        if (categoryName) {
            const category = await Category.findOne({ category: categoryName }).exec();

            // If category not found, return empty response
            if (!category) {
                return res.status(404).json({
                    message: `No dealers found for category: ${categoryName}`,
                    dealers: [],
                    totalPages: 0,
                    currentPage: Number(page)
                });
            }

            // Filter dealers by category ID
            categoryFilter = { category: category._id };
        }

        // Count total number of dealers based on category
        const totalDealers = await Dealer.countDocuments(categoryFilter);

        // Fetch dealers with pagination and category filter
        const dealers = await Dealer.find(categoryFilter)
            .skip(skip)
            .limit(Number(limit))
            .populate('category', 'category')
            .lean()
            .exec();

        // You no longer need to add image paths with base64 encoding as `logo` and `banner` are already strings
        dealers.forEach(dealer => {
            dealer.logoPath = dealer.logo || null; // Keep as is or null if empty
            dealer.bannerPath = dealer.banner || null; // Keep as is or null if empty
        });

        // Calculate total pages
        const totalPages = Math.ceil(totalDealers / limit);

        // Send response with dealers and pagination info
        res.status(200).json({
            dealers,
            totalPages,
            currentPage: Number(page)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching dealers', details: error.message });
    }
});




module.exports = dealerRouter;