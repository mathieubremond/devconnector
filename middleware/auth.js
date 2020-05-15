const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
    // Get token from the header
    const token = req.header('x-auth-token');
    if (!token)
        return res.status(401).json({
            errors: [
                {
                    msg: 'No token, authorization denied',
                    param: 'x-auth-token',
                },
            ],
        });

    // Verify the token
    try {
        const secret = config.get('jwtSecret');
        const decoded = jwt.verify(token, secret);
        req.user = decoded.user;
        next();
    } catch (e) {
        console.error(e.message);
        return res.status(500).send('Internal server error');
    }
};
