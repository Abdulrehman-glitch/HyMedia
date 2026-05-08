const jwt = require("jsonwebtoken");
const { createUser, validateUserCredentials } = require("../services/users.service");
const { getJwtSecret } = require("../middleware/auth.middleware");

function issueToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: "2h" }
  );
}

async function signup(req, res, next) {
  try {
    const { displayName, email, password } = req.body;

    if (!displayName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Display name, email and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const user = await createUser({ displayName, email, password });
    const token = issueToken(user);

    return res.status(201).json({
      success: true,
      message: "HyMedia account created successfully.",
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const user = await validateUserCredentials(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = issueToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user
  });
}

module.exports = {
  signup,
  login,
  me
};