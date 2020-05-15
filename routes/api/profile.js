const express = require('express');
const router = express.Router();
const Profile = require('../../models/Profile');
const User = require('../../models/Users');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   GET api/profile/me
// @desc    get my profile
// @access  private
router.get('/me', auth, async (req, res) => {
    try {
        // Find the profile from the currently authenticated user
        const profile = await Profile.findOne({
            user: req.user.id,
        }).populate('user', ['name', 'avatar']);

        if (!profile) {
            return res.status(404).json({
                errors: [{ msg: 'Profile not found' }],
            });
        }

        res.json(profile);
    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Internal server error');
    }
});

// @route   POST api/profile
// @desc    create a profile
// @access  private
router.post(
    '/',
    [
        auth,
        [
            check('status', 'status is required').not().isEmpty(),
            check('skills', 'skills is required').not().isEmpty(),
        ],
    ],
    async (req, res) => {
        console.log('[POST][/api/profile]', req.body);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            skills,
            githubusername,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin,
        } = req.body;

        // Build profile object
        const profileFields = {};
        profileFields.user = req.user.id;
        if (company) profileFields.company = company;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (bio) profileFields.bio = bio;
        if (status) profileFields.status = status;
        if (githubusername) profileFields.githubusername = githubusername;
        if (skills)
            profileFields.skills = skills.split(',').map(skill => skill.trim());

        // Build social object
        profileFields.social = {};
        if (youtube) profileFields.social.youtube = youtube;
        if (facebook) profileFields.social.facebook = facebook;
        if (twitter) profileFields.social.twitter = twitter;
        if (instagram) profileFields.social.instagram = instagram;
        if (linkedin) profileFields.social.linkedin = linkedin;

        console.log('[POST][/api/profile]', profileFields);

        try {
            let profile = await Profile.findOne({ user: req.user.id });
            if (profile) {
                // Update the existing profile
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id },
                    { $set: profileFields },
                    { new: true }
                );
            } else {
                // Create the profile
                profile = new Profile(profileFields);
                await profile.save();
            }

            res.json(profile);
        } catch (error) {
            console.error(error.message);
            res.status(500).send('Internal server error');
        }
    }
);

module.exports = router;
