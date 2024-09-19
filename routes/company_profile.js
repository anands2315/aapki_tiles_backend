const express = require('express');
const companyProfileRouter = express.Router();
const CompanyProfile = require('../models/company_profile');
const Category = require('../models/category');


companyProfileRouter.post('/api/add-company-profiles', async (req, res) => {
    try {
        let data = req.body;

        if (!Array.isArray(data)) {
            data = [data];
        }

        const profilePromises = data.map(async (item) => {

            let categoryId = null;
            if (item.category) {
                const category = await Category.findOne({ category: item.category });
                if (category) {
                    categoryId = category._id;
                }
            }

            const sizes = [item.size1, item.size2, item.size3].filter(size => size && size !== 'null');

            // Create contact persons
            const contactPersons = [];
            for (let i = 1; i <= 5; i++) {
                if (item[`contactPersonsName${i}`] && item[`contactPersonsName${i}`] !== 'null') {
                    contactPersons.push({
                        name: item[`contactPersonsName${i}`],
                        designation: item[`designation${i}`] !== 'null' ? item[`designation${i}`] : undefined,
                        contact: item[`contact${i}`] !== 'null' ? item[`contact${i}`] : undefined,
                        whatsapp: item[`whatsapp${i}`] !== 'null' ? item[`whatsapp${i}`] : undefined,
                        email: item[`email${i}`] !== 'null' ? item[`email${i}`] : undefined,
                    });
                }
            }

            return CompanyProfile.create({
                businessName: item.businessName,
                brandName: item.brandName,
                address: item.address,
                city: item.city,
                district: item.district,
                state: item.state,
                country: item.country,
                companyContact: item.companyContact.toString(),
                companyWhatsapp: item.companyWhatsapp ? item.companyWhatsapp.toString() : undefined,
                email: item.companyEmail,
                website: item.companyWebsite,
                contactPersons,
                category: categoryId,
                size: sizes,
            });
        });

        await Promise.all(profilePromises);
        res.status(200).json({ message: 'Company profiles saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while saving company profiles', details: error.message });
    }
});

companyProfileRouter.get('/api/company-profiles', async (req, res) => {
    try {
        const { categoryName, page = 1, limit = 12 } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};

        if (categoryName) {
            // Find the category by name
            const category = await Category.findOne({ category: categoryName });
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
            // Filter by category ID
            filter.category = category._id;
        }

        // Count total number of profiles based on the filter (category or not)
        const totalProfiles = await CompanyProfile.countDocuments(filter);

        // Fetch company profiles with pagination based on the filter
        const profiles = await CompanyProfile.find(filter)
            .populate('category')
            .skip(skip)
            .limit(Number(limit))
            .lean()
            .exec();

        const totalPages = Math.ceil(totalProfiles / limit);

        res.status(200).json({
            profiles,
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
        const profile = await CompanyProfile.findById(req.params.id).populate('category');
        if (!profile) {
            return res.status(404).json({ message: 'Company profile not found' });
        }
        res.status(200).json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching the company profile', details: error.message });
    }
});

// PUT /api/company-profiles/:id - Update a profile by ID
companyProfileRouter.put('/api/company-profiles/:id', async (req, res) => {
    try {
        const updateData = req.body;

        // Look up the category
        let categoryId = null;
        if (updateData.category) {
            const category = await Category.findOne({ category: updateData.category });
            if (category) {
                categoryId = category._id;
            }
        }

        // Extract and clean size data
        const sizes = [updateData.size1, updateData.size2, updateData.size3].filter(size => size && size !== 'null');

        // Create contact persons
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

        const profile = await CompanyProfile.findByIdAndUpdate(req.params.id, {
            ...updateData,
            category: categoryId,
            size: sizes,
            contactPersons,
        }, { new: true }).populate('category');

        if (!profile) {
            return res.status(404).json({ message: 'Company profile not found' });
        }

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
