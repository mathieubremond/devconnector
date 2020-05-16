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

        //console.log('[POST][/api/profile]', profileFields);

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

// @route   GET api/profile
// @desc    get all profiles
// @access  public
router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', [
            'name',
            'avatar',
        ]);
        res.json(profiles);
    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Internal server error');
    }
});

// @route   GET api/profile/user/:user_id
// @desc    get a user's profile by user id
// @access  public
router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.findOne({
            user: req.params.user_id,
        }).populate('user', ['name', 'avatar']);
        if (!profile) {
            return res.status(404).json({
                errors: [{ msg: 'Profile not found' }],
            });
        }
        return res.json(profile);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId')
            return res.status(404).json({
                errors: [{ msg: 'Profile not found' }],
            });
        return res.status(500).send('Internal server error');
    }
});

// @route   DELETE api/profile/user/:user_id
// @desc    delete profile, user and post
// @access  private
router.delete('/', auth, async (req, res) => {
    try {
        // @todo remove user's posts

        // Remove the logged in user's profile
        await Profile.findOneAndRemove({ user: req.user.id });

        // Remove the current logged in user
        await User.findOneAndRemove({ _id: req.user.id });

        return res.json({ msg: 'User deleted' });
    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Internal server error');
    }
});

// @route   PUT /api/profile/experience
// @desc    add profile experience
// @access  private
router.put(
    '/experience',
    [
        auth,
        [
            check('title', 'Title is required').not().isEmpty(),
            check('company', 'Company is required').not().isEmpty(),
            check('from', 'From date is required').not().isEmpty(),
        ],
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(500).json({ errors: [{ msg: errors.array() }] });
        }

        const {
            title,
            company,
            from,
            location,
            to,
            current,
            description,
        } = req.body;

        const newExperience = {
            title,
            company,
            to,
            from,
            location,
            current,
            description,
        };

        try {
            const userId = req.user.id;
            const profile = await Profile.findOne({ user: userId });
            if (!profile)
                return res
                    .status(404)
                    .json({ errors: [{ msg: 'No profile found' }] });
            profile.experience.unshift(newExperience);
            await profile.save();
            return res.json(profile);
        } catch (error) {
            console.error(error.message);
            return res.status(500).send('Internal server error');
        }
    }
);

// @route   DELETE /api/profile/experience/:experience_id
// @desc    delete profile experience from profile
// @access  private
router.delete('/experience/:experience_id', auth, async (req, res) => {
    const id = req.params.experience_id;
    const userId = req.user.id;

    try {
        const profile = await Profile.findOne({ user: userId });
        if (!profile)
            return res
                .status(404)
                .json({ errors: [{ msg: 'No profile found' }] });

        // We iterate through the array and remove the item with an id equal
        // to the one passed in the request body
        profile.experience = profile.experience.reduce(
            (accumulator, current) => {
                if (current._id.equals(id)) accumulator.push(current);
                return accumulator;
            },
            []
        );

        await profile.save();
        return res.json(profile);
    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;
