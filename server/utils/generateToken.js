const jwt = require("jsonwebtoken");

// role is either "user" or "admin"
const generateToken = (account, role) => {
  return jwt.sign(
    { id: account._id, username: account.username, email: account.email, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = generateToken;