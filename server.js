const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Railway CORS - Allow all GitHub Pages and your frontend
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://dhineshwaranp.github.io',
    'https://*.github.io'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Request logging for Railway
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rate limiting
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true
});

// Email transporter for Railway
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Test email config
transporter.verify((error) => {
  if (error) {
    console.error('Email config error:', error.message);
  } else {
    console.log('✅ Email ready on Railway');
  }
});

// Validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateContactForm = (name, email, message) => {
  const errors = [];
  if (!name || name.trim().length < 2) errors.push('Name min 2 chars');
  if (!email || !isValidEmail(email)) errors.push('Valid email required');
  if (!message || message.trim().length < 10) errors.push('Message min 10 chars');
  if (name && name.length > 100) errors.push('Name max 100 chars');
  if (message && message.length > 2000) errors.push('Message max 2000 chars');
  return errors;
};

// Generate email
const generateEmailContent = (name, email, message) => {
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  return {
    text: `
📧 PORTFOLIO CONTACT (Railway)
===============================
Name: ${name}
Email: ${email}
Message: ${message}
Time: ${timestamp}
`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #10b981, #0d9488); color: white; padding: 25px; text-align: center;">
    <h2>📧 New Portfolio Message</h2>
    <p>Railway Deployment</p>
  </div>
  <div style="padding: 30px; background: #f9fafb;">
    <p><strong>👤 Name:</strong> ${name}</p>
    <p><strong>📧 Email:</strong> <a href="mailto:${email}">${email}</a></p>
    <div style="background: white; padding: 15px; border-left: 4px solid #10b981; margin: 15px 0;">
      ${message.replace(/\n/g, '<br>')}
    </div>
    <p><strong>⏰ Time:</strong> ${timestamp} (IST)</p>
    <p><strong>🚀 Host:</strong> Railway</p>
  </div>
</body>
</html>
`
  };
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Running on Railway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Contact endpoint
app.post('/api/contact/send', contactLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    const errors = validateContactForm(name, email, message);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const emailContent = generateEmailContent(name, email, message);
    
    const mailOptions = {
      from: `"Portfolio" <${process.env.GMAIL_USER}>`,
      to: process.env.TO_EMAIL || process.env.GMAIL_USER,
      replyTo: email,
      subject: `Portfolio: ${name}`,
      text: emailContent.text,
      html: emailContent.html
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`✅ Railway Email Sent: ${email}`);
    
    res.json({
      success: true,
      message: 'Message sent!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Railway Email Error:', error);
    
    let errorMessage = 'Failed to send. Try later.';
    if (error.code === 'EAUTH') errorMessage = 'Email config error';
    if (error.code === 'EENVELOPE') errorMessage = 'Invalid email';
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    endpoints: ['GET /api/health', 'POST /api/contact/send']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Railway Error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 PORTFOLIO BACKEND ON RAILWAY
===============================
✅ Server: http://localhost:${PORT}
✅ Health: /api/health
✅ Contact: /api/contact/send
✅ Node: ${process.version}
✅ Time: ${new Date().toLocaleString()}
`);
});
