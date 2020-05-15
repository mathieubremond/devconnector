const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const Users = require('../../models/Users');

// @route   POST api/users
// @desc    Register an user
// @access  public
router.post(
    '/',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Please enter a strong password').isLength(3),
    ],
    async (req, res) => {
        console.log('[POST][/api/users]', req.body.email);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            // See if the user exists
            let user = await Users.findOne({ email });
            if (user) {
                return res.status(400).json({
                    errors: [
                        {
                            msg: 'User already exists',
                            param: 'email',
                        },
                    ],
                });
            }

            // Get user's gravatar
            const avatar = gravatar.url(email, {
                s: '200',
                r: 'pg',
                d: 'mm',
            });

            user = new Users({
                name,
                email,
                avatar,
                password,
            });

            // Encrypt the password
            const salt = await bcrypt.genSalt();
            user.password = await bcrypt.hash(password, salt);

            await user.save();

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
        } catch (e) {
            console.error(e.message);
            return res.status(500).send('Internal server error');
        }
    }
);

module.exports = router;
