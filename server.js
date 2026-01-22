const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://dhineshwaranp.github.io',
    'https://*.github.io'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting to prevent spam
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create Nodemailer transporter with Render-compatible settings
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },
  connectionTimeout: 10000,
  tls: {
    rejectUnauthorized: false
  }
});

// Test email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
    console.log('ℹ️ Trying to proceed anyway...');
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Validation helper functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateContactForm = (name, email, message) => {
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!email || !isValidEmail(email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!message || message.trim().length < 10) {
    errors.push('Message must be at least 10 characters');
  }
  
  if (name && name.length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }
  
  if (message && message.length > 2000) {
    errors.push('Message cannot exceed 2000 characters');
  }
  
  return errors;
};

// Generate email content
const generateEmailContent = (name, email, message) => {
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  const textContent = `
📧 NEW PORTFOLIO CONTACT MESSAGE
=================================

👤 SENDER DETAILS:
• Name: ${name}
• Email: ${email}

📝 MESSAGE:
${message}

⏰ TIMESTAMP:
${timestamp}

📱 SENT FROM:
Dhineshwaran's Portfolio Website
  `;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); color: white; padding: 25px; text-align: center; }
        .content { padding: 30px; }
        .field { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; color: #10b981; display: block; margin-bottom: 5px; font-size: 14px; }
        .value { color: #1f2937; }
        .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 15px 0; font-style: italic; }
        .footer { background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        a { color: #10b981; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📧 New Portfolio Contact Message</h2>
            <p>From Dhineshwaran's Portfolio Website</p>
        </div>
        
        <div class="content">
            <div class="field">
                <span class="label">👤 Name</span>
                <span class="value">${name}</span>
            </div>
            
            <div class="field">
                <span class="label">📧 Email</span>
                <span class="value">
                    <a href="mailto:${email}">${email}</a>
                </span>
            </div>
            
            <div class="field">
                <span class="label">📝 Message</span>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="field">
                <span class="label">⏰ Timestamp</span>
                <span class="value">${timestamp}</span>
            </div>
            
            <div class="field">
                <span class="label">💼 Portfolio</span>
                <span class="value">
                    <a href="https://dhineshwaranp.github.io">https://dhineshwaranp.github.io</a>
                </span>
            </div>
        </div>
        
        <div class="footer">
            <p>This message was sent from the contact form on Dhineshwaran's portfolio website.</p>
            <p>You can reply directly to this email to contact ${name}.</p>
        </div>
    </div>
</body>
</html>
  `;

  return { text: textContent, html: htmlContent };
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio Backend API is running',
    service: 'Contact Form Email Service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Contact form endpoint
app.post('/api/contact/send', contactLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate input
    const validationErrors = validateContactForm(name, email, message);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Generate email content
    const emailContent = generateEmailContent(name, email, message);

    // Email configuration
    const mailOptions = {
      from: `"Portfolio Contact" <${process.env.GMAIL_USER}>`,
      to: process.env.TO_EMAIL || 'apkpdhinesh2005@gmail.com',
      replyTo: email,
      subject: 'New Portfolio Contact Message',
      text: emailContent.text,
      html: emailContent.html,
      headers: {
        'X-Portfolio-Contact': 'true',
        'X-Sender-Name': name,
        'X-Sender-Email': email
      }
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Log successful submission
    console.log(`✅ Email sent: ${name} (${email})`);

    // Success response
    res.json({
      success: true,
      message: 'Message sent successfully! I\'ll get back to you soon.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);

    // Handle specific error types
    let errorMessage = 'Failed to send message. Please try again later.';
    let statusCode = 500;

    if (error.code === 'EAUTH') {
      errorMessage = 'Email configuration error. Please contact the website administrator.';
      statusCode = 503;
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address. Please check your email and try again.';
      statusCode = 400;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please try again in a moment.';
      statusCode = 504;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: {
      health: 'GET /api/health',
      contact: 'POST /api/contact/send'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 PORTFOLIO BACKEND SERVER STARTED
  ====================================
  🌐 Local: http://localhost:${PORT}
  🔧 Environment: ${process.env.NODE_ENV || 'development'}
  ⏰ Started: ${new Date().toLocaleString()}
  
  📊 Available Endpoints:
  ----------------------
  ✅ GET  /api/health          - Health check
  📧 POST /api/contact/send    - Send contact message
  
  📧 Email Configuration:
  ----------------------
  From: ${process.env.GMAIL_USER || 'Not configured'}
  To: ${process.env.TO_EMAIL || 'apkpdhinesh2005@gmail.com'}
  Status: ${process.env.GMAIL_USER ? 'Configured' : '⚠️ Not configured'}
  SMTP: smtp.gmail.com:587 (Render-compatible)
  `);
});
