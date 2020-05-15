const express = require('express');
const auth = require('../../middleware/auth');
const Users = require('../../models/Users');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('config');
const router = express.Router();

// @route   GET api/auth
// @desc    get the authenticated user
// @access  private
router.get('/', auth, async (req, res) => {
    try {
        const user = await Users.findById(req.user.id).select('-password');
        res.json(user);
    } catch (e) {
        console.error(e.message);
        res.status(500).send('Internal server error');
    }
});

// @route   POST api/auth
// @desc    authenticate a user & get auth token
// @access  public
router.post(
    '/',
    [
        check('email', 'Email is required').isEmail(),
        check('password', 'Password is required').not().isEmpty(),
    ],
    async (req, res) => {
        console.log('[POST][/api/auth]');

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            // Check if user exists
            const user = await Users.findOne({ email });
            if (!user) {
                return res.status(400).json({
                    errors: [{ msg: 'Invalid credentials' }],
                });
            }

            // Check if password is correct
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    errors: [{ msg: 'Invalid credentials' }],
                });
            }

            // Generate the token
            // Return the json web token
            const payload = {
                user: { id: user.id },
            };
            const secret = config.get('jwtSecret');
            jwt.sign(
                payload,
                secret,
                {
                    expiresIn: 360000, // an hour is 3600
                },
                (e, token) => {
                    if (e) throw e;
                    res.json({ token });
                }
            );
        } catch (error) {
            console.error(error.message);
            return res.status(500).send('Internal server error');
        }
    }
);

module.exports = router;
