const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ENHANCED CORS =====
app.use(cors({
  origin: [
    'https://dhineshwaranp.github.io',
    'https://*.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== RATE LIMITING =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: { 
    success: false, 
    message: 'Too many requests from this IP, please try again after 15 minutes' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  const now = new Date();
  const logTime = now.toLocaleTimeString();
  console.log(`[${logTime}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ===== SMTP TRANSPORTER FOR RAILWAY =====
console.log('🔧 Initializing SMTP transporter for Railway...');
console.log('📧 SMTP Host:', process.env.SMTP_HOST || 'Not set');
console.log('🔐 SMTP User:', process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}...` : 'Not set');

let transporter = null;

try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      // Railway-specific optimizations
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      socketTimeout: 15000, // 15 seconds
      connectionTimeout: 10000, // 10 seconds
      tls: {
        rejectUnauthorized: false // Important for Railway
      }
    });

    // Test connection with timeout
    const testTimeout = setTimeout(() => {
      console.log('⚠️ SMTP connection test timed out. Proceeding anyway...');
    }, 10000);

    transporter.verify((error, success) => {
      clearTimeout(testTimeout);
      if (error) {
        console.error('❌ SMTP Connection Error:', error.message);
        console.log('⚠️ Emails will be logged but not sent');
        transporter = null;
      } else {
        console.log('✅ SMTP Connection Verified! Ready to send emails.');
        console.log('📤 From:', process.env.SMTP_USER);
        console.log('📥 To:', process.env.TO_EMAIL || process.env.SMTP_USER);
      }
    });

  } else {
    console.log('⚠️ SMTP credentials not fully configured in Railway variables');
    console.log('💡 Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    console.log('📝 Emails will be logged only');
  }
} catch (error) {
  console.error('❌ SMTP Initialization Error:', error.message);
  transporter = null;
}

// ===== HELPER FUNCTIONS =====
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
  
  return errors;
};

const generateEmailContent = (name, email, message) => {
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'long'
  });

  return {
    text: `
📧 NEW PORTFOLIO CONTACT - RAILWAY SMTP
========================================

👤 Name: ${name}
📧 Email: ${email}
⏰ Time: ${timestamp}
🚀 Host: Railway (SMTP: ${process.env.SMTP_HOST})

📝 Message:
${message}

========================================
Sent from Dhineshwaran's Portfolio Website
Backend: Railway with SMTP
`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Contact - Railway SMTP</title>
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
        .railway-badge { background: #0d0d0d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block; margin-left: 10px; }
        .smtp-badge { background: #4f46e5; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block; margin-left: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📧 New Portfolio Contact</h2>
            <p>Railway Deployment <span class="railway-badge">Railway</span> <span class="smtp-badge">SMTP</span></p>
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
                <span class="label">⏰ Timestamp</span>
                <span class="value">${timestamp} (IST)</span>
            </div>
            
            <div class="field">
                <span class="label">📝 Message</span>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="field">
                <span class="label">🚀 Delivery Method</span>
                <span class="value">
                    Railway + SMTP
                    <span class="smtp-badge">${process.env.SMTP_HOST}</span>
                </span>
            </div>
        </div>
        
        <div class="footer">
            <p>This message was sent from Dhineshwaran's portfolio website contact form.</p>
            <p>Powered by Railway • SMTP Email Delivery • Node.js Backend</p>
        </div>
    </div>
</body>
</html>`
  };
};

// ===== ROUTES =====

// Health endpoint with SMTP status
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio Backend API Running on Railway',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    smtpConfigured: !!transporter,
    smtpHost: process.env.SMTP_HOST || 'Not configured',
    corsEnabled: true,
    rateLimiting: '30 requests/15 minutes',
    endpoints: {
      health: 'GET /api/health',
      contact: 'POST /api/contact/send'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Portfolio Backend API',
    service: 'Contact Form with SMTP Email',
    deployed: 'Railway',
    url: 'https://portfolio-backened-production-3a16.up.railway.app',
    documentation: 'Visit /api/health for API status',
    email: 'SMTP configured: ' + (transporter ? 'Yes' : 'No')
  });
});

// Contact form endpoint
app.post('/api/contact/send', async (req, res) => {
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
    
    // Log the submission
    console.log('📧 Contact Form Submission:', {
      name,
      email,
      messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString(),
      smtpAvailable: !!transporter
    });
    
    let emailSent = false;
    let emailError = null;
    
    // Try to send email via SMTP
    if (transporter) {
      try {
        const mailOptions = {
          from: `"Dhineshwaran Portfolio" <${process.env.SMTP_USER}>`,
          to: process.env.TO_EMAIL || process.env.SMTP_USER,
          replyTo: email,
          subject: `Portfolio Contact: ${name}`,
          text: emailContent.text,
          html: emailContent.html,
          headers: {
            'X-Portfolio-Contact': 'true',
            'X-Backend': 'Railway',
            'X-SMTP-Host': process.env.SMTP_HOST
          }
        };
        
        // Send with timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('SMTP timeout after 15 seconds'));
          }, 15000);
          
          transporter.sendMail(mailOptions, (error, info) => {
            clearTimeout(timeout);
            if (error) {
              reject(error);
            } else {
              console.log('✅ SMTP Email sent successfully!');
              console.log('📤 Message ID:', info.messageId);
              resolve(info);
            }
          });
        });
        
        emailSent = true;
        
      } catch (smtpError) {
        emailError = smtpError.message;
        console.error('❌ SMTP Error:', smtpError.message);
        // Don't fail the request - continue with logging
      }
    }
    
    // Success response
    res.json({
      success: true,
      message: emailSent 
        ? 'Message sent successfully! I\'ll get back to you soon.' 
        : 'Message received! (Logged on server)',
      timestamp: new Date().toISOString(),
      emailSent: emailSent,
      smtpUsed: !!transporter,
      note: emailSent ? undefined : 'Email delivery attempted but failed. Your message has been logged.'
    });
    
  } catch (error) {
    console.error('❌ Contact endpoint error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      { method: 'GET', path: '/', description: 'API Welcome' },
      { method: 'GET', path: '/api/health', description: 'Health Check' },
      { method: 'POST', path: '/api/contact/send', description: 'Send Contact Message' }
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled Error:', err.message);
  
  res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again later.',
    timestamp: new Date().toISOString()
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`
🚀 PORTFOLIO BACKEND - RAILWAY SMTP EDITION
============================================

✅ Server Information:
   • Port: ${PORT}
   • Environment: ${process.env.NODE_ENV || 'development'}
   • Node.js: ${process.version}
   • Started: ${new Date().toLocaleString()}

✅ SMTP Configuration:
   • Host: ${process.env.SMTP_HOST || 'Not set'}
   • Port: ${process.env.SMTP_PORT || '587'}
   • User: ${process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '...' : 'Not set'}
   • Status: ${transporter ? '✅ CONNECTED' : '❌ DISCONNECTED'}

✅ API Endpoints:
   • GET  /              - API welcome
   • GET  /api/health    - Health check (with SMTP status)
   • POST /api/contact/send - Send contact via SMTP

✅ Features:
   • SMTP Email Delivery
   • CORS enabled for GitHub Pages
   • Rate limiting (30 requests/15 min)
   • HTML & Text emails
   • Input validation

============================================
`);
});

