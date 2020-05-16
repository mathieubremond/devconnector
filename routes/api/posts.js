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

// @route   GET api/posts/:id
// @desc    get post
// @access  private
router.get('/:id', auth, async (req, res) => {
    const id = req.params.id;
    try {
        const post = await Post.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ errors: [{ msg: 'Post not found' }] });

        return res.json(post);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId')
            return res.status(404).json({
                errors: [{ msg: 'Post not found' }],
            });
        return res.status(500).send('Internal server error');
    }
});

// @route   DELETE api/posts/:id
// @desc    delete post
// @access  private
router.delete('/:id', auth, async (req, res) => {
    const id = req.params.id;
    try {
        const post = await Post.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ errors: [{ msg: 'Post not found' }] });

        if (post.user.toString() !== req.user.id) {
            return res
                .status(401)
                .json({ errors: [{ msg: 'Not authorized' }] });
        }

        await Post.deleteOne({ _id: post._id });

        return res.json(post);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId')
            return res.status(404).json({
                errors: [{ msg: 'Post not found' }],
            });
        return res.status(500).send('Internal server error');
    }
});

// @route   PUT api/posts/likes/:id
// @desc    like a post
// @access  private
router.put('/likes/:id', auth, async (req, res) => {
    const id = req.params.id;
    try {
        const post = await Post.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ errors: [{ msg: 'Post not found' }] });

        const isAlreadyLiked =
            post.likes.filter(like => like.user.toString() === req.user.id)
                .length > 0;

        if (isAlreadyLiked) {
            return res
                .status(400)
                .json({ errors: [{ msg: 'Post already liked' }] });
        }

        post.likes.unshift({
            user: req.user.id,
        });
        await post.save();

        return res.json(post.likes);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId')
            return res.status(404).json({
                errors: [{ msg: 'Post not found' }],
            });
        return res.status(500).send('Internal server error');
    }
});

// @route   DELETE api/posts/likes/:id
// @desc    unlike a post
// @access  private
router.delete('/likes/:id', auth, async (req, res) => {
    const id = req.params.id;
    try {
        const post = await Post.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ errors: [{ msg: 'Post not found' }] });

        const isAlreadyLiked =
            post.likes.filter(like => like.user.toString() === req.user.id)
                .length > 0;

        if (!isAlreadyLiked) {
            return res
                .status(400)
                .json({ errors: [{ msg: 'Post has not yet been liked' }] });
        }

        post.likes = post.likes.reduce((accumulator, current) => {
            if (current.user.toString() !== req.user.id)
                accumulator.push(current);
            return accumulator;
        }, []);

        await post.save();

        return res.json(post.likes);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId')
            return res.status(404).json({
                errors: [{ msg: 'Post not found' }],
            });
        return res.status(500).send('Internal server error');
    }
});

// @route   POST api/posts
// @desc    comment on a post
// @access  private
router.post(
    '/comment/:id',
    [auth, [check('text', 'Text is required').not().isEmpty()]],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { text } = req.body;
        const userId = req.user.id;
        const id = req.params.id;

        try {
            const user = await User.findById(userId).select('-password');
            if (!user)
                return res
                    .status(404)
                    .json({ errors: [{ msg: 'User not found' }] });

            const post = await Post.findById(id);
            if (!post)
                return res
                    .status(404)
                    .json({ errors: [{ msg: 'Post not found' }] });

            const newComment = {
                text,
                user: userId,
                name: user.name,
                avatar: user.avatar,
            };
            post.comments.unshift(newComment);
            await post.save();
            return res.json(post.comments);
        } catch (error) {
            console.error(error.message);
            return res.status(500).send('Internal server error');
        }
    }
);

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    delete a comment on aa post
// @access  private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    const id = req.params.id;
    const commentId = req.params.comment_id;

    try {
        const post = await Post.findById(id);
        if (!post)
            return res
                .status(404)
                .json({ errors: [{ msg: 'Post not found' }] });

        const comment = post.comments.find(
            comment =>
                comment._id.toString() === commentId &&
                comment.user.toString() === req.user.id
        );

        if (!comment) {
            return res
                .status(404)
                .json({ errors: [{ msg: 'Comment not found' }] });
        }

        const removeIndex = post.comments
            .map(item => item._id.toString())
            .indexOf(commentId);
        post.comments.splice(removeIndex, 1);

        await post.save();

        return res.json(post.comments);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId')
            return res.status(404).json({
                errors: [{ msg: 'Post not found' }],
            });
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;
