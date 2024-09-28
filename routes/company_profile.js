const express = require('express');
const companyProfileRouter = express.Router();
const multer = require('multer');
const CompanyProfile = require('../models/company_profile');
const Category = require('../models/category');

const storage = multer.memoryStorage(); // Store images in memory as Buffer
const upload = multer({ storage: storage });


companyProfileRouter.post('/api/add-company-profiles', upload.fields([{ name: 'logo' }, { name: 'banner' }]), async (req, res) => {
    try {
        let data = req.body;
        console.log(data);

        if (!Array.isArray(data)) {
            data = [data];
        }

        const profilePromises = data.map(async (item) => {
            // Check for category validity
            const category = await Category.findOne({ category: item.category }).exec();
            if (!category) {
                throw new Error('Valid category is required');
            }

            // Prepare logo and banner
            const logo = req.files['logo'] ? {
                data: req.files['logo'][0].buffer,
                contentType: req.files['logo'][0].mimetype
            } : undefined;

            const banner = req.files['banner'] ? {
                data: req.files['banner'][0].buffer,
                contentType: req.files['banner'][0].mimetype
            } : undefined;

            // Parse contact persons if it's a string
            let contactPersons = [];
            if (typeof item.contactPersons === 'string') {
                contactPersons = JSON.parse(item.contactPersons);
            }

            // Parse social media data if it's a string
            let socialMedia = {};
            if (typeof item.socialMedia === 'string') {
                socialMedia = JSON.parse(item.socialMedia);
            }

            // Parse size array if it's a string
            let size = [];
            if (typeof item.size === 'string') {
                size = JSON.parse(item.size);
            }

            const isIndian = item.isIndian === "null" || item.isIndian === null || item.isIndian === undefined ? false : item.isIndian === 'true';
            const isVerified = item.isVerified === "true";

            // Create company profile entry
            const companyProfile = await CompanyProfile.create({
                logo: logo,
                banner: banner,
                businessName: item.businessName,
                brandName: item.brandName,
                address: item.address,
                city: item.city,
                district: item.district,
                state: item.state,
                country: item.country,
                companyContact: item.companyContact.toString(),
                companyWhatsapp: item.companyWhatsapp ? item.companyWhatsapp.toString() : undefined,
                email: item.email,
                website: item.website,
                socialMedia: socialMedia, // Store parsed social media
                contactPersons: contactPersons.length > 0 ? contactPersons : undefined, // Only include if not empty
                category: category._id, // Set the category ID
                size: size, // Store parsed size array
                isIndian: isIndian,
                isVerified: isVerified,
            });

            // Return the created company profile object
            return companyProfile; // This will contain the created company profile object
        });

        const companyProfiles = await Promise.all(profilePromises);
        res.status(200).json({ message: 'Company profiles saved successfully', companyProfiles });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while saving company profiles', details: error.message });
    }
});



// GET /api/company-profiles - Get all company profiles
companyProfileRouter.get('/api/company-profiles', async (req, res) => {
    try {
        const { categoryName, businessName, page = 1, limit = 12 } = req.query;
        const skip = (page - 1) * limit;

        // Initialize the filter object
        let filter = {};

        // Filter by category if categoryName is provided
        if (categoryName) {
            const category = await Category.findOne({ category: categoryName });
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            filter.category = category._id;
        }

        // Filter by businessName if provided (partial match with case insensitivity)
        if (businessName) {
            filter.businessName = { $regex: new RegExp(businessName, 'i') }; // case-insensitive match
        }

        // Count the total number of profiles based on the filter (category, businessName, or both)
        const totalProfiles = await CompanyProfile.countDocuments(filter);

        // Fetch company profiles with pagination based on the filter
        const profiles = await CompanyProfile.find(filter)
            .populate('category')
            .skip(skip)
            .limit(Number(limit))
            .lean()
            .exec();

        const totalPages = Math.ceil(totalProfiles / limit);

        // Convert logo and banner to Base64 if they exist
        const profilesWithBase64Images = profiles.map(profile => ({
            ...profile,
            logo: profile.logo && profile.logo.data ? {
                data: profile.logo.data.toString('base64'),
                contentType: profile.logo.contentType
            } : undefined,
            banner: profile.banner && profile.banner.data ? {
                data: profile.banner.data.toString('base64'),
                contentType: profile.banner.contentType
            } : undefined,
        }));

        // Return the filtered profiles with pagination info
        res.status(200).json({
            profiles: profilesWithBase64Images,
            totalPages,
            currentPage: Number(page),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching company profiles', details: error.message });
    }
});


// GET /api/company-profiles/:id - Read a single profile by ID
companyProfileRouter.get('/api/company-profiles/:id', async (req, res) => {
    try {
        // Fetch the company profile by ID and populate the category
        const profile = await CompanyProfile.findById(req.params.id).populate('category');
        if (!profile) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        // Ensure category image is converted to Base64 if it exists
        let categoryWithBase64Image;
        if (profile.category) {
            categoryWithBase64Image = {
                ...profile.category._doc, // Use _doc to get the raw MongoDB document of category
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


// PUT /api/company-profiles/:id - Update a profile by ID
companyProfileRouter.put('/api/company-profiles/:id', upload.fields([{ name: 'logo' }, { name: 'banner' }]), async (req, res) => {
    try {
        const updateData = req.body;

        // Look up the existing profile
        const existingProfile = await CompanyProfile.findById(req.params.id);
        if (!existingProfile) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

        // Look up the category ID if a category name is provided
        let categoryId = null;
        if (updateData.category) {
            const category = await Category.findOne({ category: updateData.category });
            if (category) {
                categoryId = category._id;
            }
        }

        // Prepare logo and banner files, if provided
        const logo = req.files['logo'] ? {
            data: req.files['logo'][0].buffer,
            contentType: req.files['logo'][0].mimetype
        } : undefined;

        const banner = req.files['banner'] ? {
            data: req.files['banner'][0].buffer,
            contentType: req.files['banner'][0].mimetype
        } : undefined;

        // Extract and clean size data
        const sizes = [updateData.size1, updateData.size2, updateData.size3].filter(size => size && size !== 'null');

        // Create contact persons array
        const contactPersons = [];
        for (let i = 1; i <= 5; i++) {
            if (updateData[`contactPersonsName${i}`] && updateData[`contactPersonsName${i}`] !== 'null') {
                contactPersons.push({
                    name: updateData[`contactPersonsName${i}`],
                    designation: updateData[`designation${i}`] !== 'null' ? updateData[`designation${i}`] : undefined,
                    contact: updateData[`contact${i}`] !== 'null' ? updateData[`contact${i}`] : undefined,
                    whatsapp: updateData[`whatsapp${i}`] !== 'null' ? updateData[`whatsapp${i}`] : undefined,
                    email: updateData[`email${i}`] !== 'null' ? updateData[`email${i}`] : undefined,
                });
            }
        }
        const updateFields = {
            businessName: updateData.businessName || existingProfile.businessName,
            brandName: updateData.brandName || existingProfile.brandName,
            address: updateData.address || existingProfile.address,
            city: updateData.city || existingProfile.city,
            district: updateData.district || existingProfile.district,
            state: updateData.state || existingProfile.state,
            country: updateData.country || existingProfile.country,
            companyContact: updateData.companyContact || existingProfile.companyContact,
            companyWhatsapp: updateData.companyWhatsapp || existingProfile.companyWhatsapp,
            email: updateData.email || existingProfile.email,
            website: updateData.website || existingProfile.website,
            socialMedia: updateData.socialMedia || existingProfile.socialMedia,
            year: updateData.year || existingProfile.year,
            latitude: updateData.latitude || existingProfile.latitude,
            longitude: updateData.longitude || existingProfile.longitude,
            isIndian: updateData.isIndian !== undefined ? updateData.isIndian : existingProfile.isIndian,
            isVerified: updateData.isVerified !== undefined ? updateData.isVerified : existingProfile.isVerified,
            about: updateData.about || existingProfile.about,
            locationUrl: updateData.locationUrl || existingProfile.locationUrl,
            category: categoryId || existingProfile.category,
            size: sizes.length > 0 ? sizes : existingProfile.size,
            contactPersons: contactPersons.length > 0 ? contactPersons : existingProfile.contactPersons,
            logo: logo || existingProfile.logo,
            banner: banner || existingProfile.banner,
        };

        const profile = await CompanyProfile.findByIdAndUpdate(req.params.id, updateFields, { new: true }).populate('category');

        // Return the updated profile
        res.status(200).json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while updating the company profile', details: error.message });
    }
});


// DELETE /api/company-profiles/:id - Delete a profile by ID
companyProfileRouter.delete('/api/company-profiles/:id', async (req, res) => {
    try {
        const result = await CompanyProfile.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ message: 'Company profile not found' });
        }
        res.status(200).json({ message: 'Company profile deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while deleting the company profile', details: error.message });
    }
});

module.exports = companyProfileRouter;
