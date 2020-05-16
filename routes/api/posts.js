const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Post = require('../../models/Post');
const User = require('../../models/Users');
const Profile = require('../../models/Profile');

// @route   POST api/posts
// @desc    create a post
// @access  private
router.post(
    '/',
    [auth, [check('text', 'Text is required').not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { text } = req.body;
        const userId = req.user.id;

        try {
            const user = await User.findById(userId).select('-password');
            if (!user)
                return res
                    .status(404)
                    .json({ errors: [{ msg: 'User not found' }] });

            const newPost = {
                text,
                user: userId,
                name: user.name,
                avatar: user.avatar,
            };
            const post = new Post(newPost);
            await post.save();
            return res.json(post);
        } catch (error) {
            console.error(error.message);
            return res.status(500).send('Internal server error');
        }
    }
);

// @route   GET api/posts
// @desc    get all post
// @access  private
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        return res.json(posts);
    } catch (error) {
        console.error(error.message);
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;
