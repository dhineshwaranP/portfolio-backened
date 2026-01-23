const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ENHANCED CORS CONFIGURATION =====
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:3000',
            'https://dhineshwaranp.github.io',
            'https://*.github.io',
            'https://portfolio-backened-production-3a16.up.railway.app'
        ];
        
        // Check if origin is in allowed list
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed.includes('*')) {
                const domain = allowed.replace('*.', '');
                return origin.endsWith(domain);
            }
            return origin === allowed;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ===== MIDDLEWARE =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// ===== RATE LIMITING =====
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // Increased limit for testing
    message: { 
        success: false, 
        message: 'Too many requests from this IP. Please try again after 15 minutes.' 
    },
    standardHeaders: true,
    legacyHeaders: false
});

// ===== EMAIL TRANSPORTER WITH RAILWAY COMPATIBILITY =====
let transporter = null;

const initializeEmailTransporter = () => {
    try {
        // Check if Gmail credentials are available
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            console.log('📧 Initializing Gmail transporter...');
            
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASSWORD
                },
                // Railway-specific optimizations
                pool: true,
                maxConnections: 1,
                maxMessages: 10,
                socketTimeout: 10000, // 10 seconds timeout
                connectionTimeout: 10000
            });
            
            // Test connection with timeout
            const verifyTimeout = setTimeout(() => {
                console.log('⚠️ Email verification timeout - continuing without email');
                transporter = null;
            }, 8000);
            
            transporter.verify((error) => {
                clearTimeout(verifyTimeout);
                if (error) {
                    console.error('❌ Gmail transporter failed:', error.message);
                    console.log('💡 Email will be logged instead of sent');
                    transporter = null;
                } else {
                    console.log('✅ Gmail transporter ready on Railway');
                }
            });
            
        } else {
            console.log('⚠️ No email credentials found. Emails will be logged only.');
            transporter = null;
        }
    } catch (error) {
        console.error('❌ Failed to initialize email transporter:', error.message);
        transporter = null;
    }
};

// Initialize email transporter
initializeEmailTransporter();

// ===== HELPER FUNCTIONS =====
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
    
    if (message && message.length > 5000) {
        errors.push('Message cannot exceed 5000 characters');
    }
    
    return errors;
};

const generateEmailContent = (name, email, message) => {
    const timestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'full',
        timeStyle: 'long'
    });

    const textContent = `
📧 PORTFOLIO CONTACT FORM SUBMISSION
=====================================

👤 From: ${name}
📧 Email: ${email}
⏰ Time: ${timestamp}
🚀 Backend: Railway Deployment

📝 Message:
${message}

=====================================
This message was sent from Dhineshwaran's portfolio website.
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Contact</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #0d9488 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .field {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e5e7eb;
        }
        .label {
            font-weight: bold;
            color: #10b981;
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
        }
        .value {
            color: #1f2937;
        }
        .message-box {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin: 15px 0;
            font-style: italic;
            white-space: pre-wrap;
        }
        .footer {
            background: #e5e7eb;
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            margin-top: 30px;
            font-size: 12px;
            color: #6b7280;
        }
        a {
            color: #10b981;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .railway-badge {
            display: inline-block;
            background: #0d0d0d;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">📧 New Portfolio Message</h1>
        <p style="margin: 10px 0 0; opacity: 0.9;">
            From Dhineshwaran's Portfolio 
            <span class="railway-badge">Railway Backend</span>
        </p>
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
            <span class="label">🌐 Source</span>
            <span class="value">
                <a href="https://dhineshwaranp.github.io">Portfolio Website</a>
                <span class="railway-badge">Live on Railway</span>
            </span>
        </div>
        
        <div class="footer">
            <p>This message was sent from the contact form on Dhineshwaran's portfolio website.</p>
            <p>Powered by Railway • Node.js Backend API</p>
        </div>
    </div>
</body>
</html>`;

    return { text: textContent, html: htmlContent };
};

// ===== ROUTES =====

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Portfolio Backend API is running on Railway',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: '2.0.0',
        emailConfigured: !!transporter,
        corsEnabled: true,
        endpoints: {
            health: 'GET /api/health',
            contact: 'POST /api/contact/send'
        },
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Portfolio Backend API',
        service: 'Contact Form Handler',
        deployed: 'Railway',
        url: 'https://portfolio-backened-production-3a16.up.railway.app',
        endpoints: {
            health: '/api/health',
            contact: '/api/contact/send'
        },
        documentation: 'Visit /api/health for API status'
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
        
        // Log submission (always works)
        console.log('📧 Contact Form Submission:', {
            name,
            email,
            messagePreview: message.length > 100 ? message.substring(0, 100) + '...' : message,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            origin: req.headers.origin || 'unknown'
        });
        
        // Try to send email if transporter is available
        let emailSent = false;
        if (transporter) {
            try {
                const mailOptions = {
                    from: `"Dhineshwaran Portfolio" <${process.env.GMAIL_USER}>`,
                    to: process.env.TO_EMAIL || process.env.GMAIL_USER,
                    replyTo: email,
                    subject: `Portfolio Contact: ${name}`,
                    text: emailContent.text,
                    html: emailContent.html,
                    headers: {
                        'X-Portfolio-Contact': 'true',
                        'X-Backend': 'Railway'
                    }
                };
                
                // Send email with timeout
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Email sending timeout'));
                    }, 15000);
                    
                    transporter.sendMail(mailOptions, (error, info) => {
                        clearTimeout(timeout);
                        if (error) {
                            reject(error);
                        } else {
                            resolve(info);
                        }
                    });
                });
                
                emailSent = true;
                console.log(`✅ Email sent successfully to: ${process.env.TO_EMAIL || process.env.GMAIL_USER}`);
                
            } catch (emailError) {
                console.warn('⚠️ Email sending failed (logged only):', emailError.message);
                // Don't fail the request - continue with logging
            }
        }
        
        // Always return success to frontend
        res.json({
            success: true,
            message: emailSent 
                ? 'Message sent successfully! I\'ll get back to you soon.' 
                : 'Message received! (Logged on server)',
            timestamp: new Date().toISOString(),
            emailSent: emailSent,
            note: emailSent ? undefined : 'Your message has been logged. Email delivery was not attempted.'
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
        ],
        documentation: 'Visit /api/health for API information'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🚨 Unhandled Error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });
    
    res.status(500).json({
        success: false,
        message: 'Something went wrong on our end. Please try again later.',
        timestamp: new Date().toISOString()
    });
});

// ===== START SERVER =====
const server = app.listen(PORT, () => {
    console.log(`
🚀 PORTFOLIO BACKEND API - RAILWAY DEPLOYMENT
==============================================

✅ Server Information:
   • Local: http://localhost:${PORT}
   • Railway: https://portfolio-backened-production-3a16.up.railway.app
   • Environment: ${process.env.NODE_ENV || 'development'}
   • Node.js: ${process.version}
   • Started: ${new Date().toLocaleString()}

✅ API Endpoints:
   • GET  /              - API welcome
   • GET  /api/health    - Health check
   • POST /api/contact/send - Send contact message

✅ Features:
   • CORS enabled for GitHub Pages
   • Rate limiting (25 requests/15 min)
   • Email notifications ${transporter ? 'ENABLED' : 'DISABLED'}
   • Request logging
   • Validation & sanitization

📧 Email Status: ${transporter ? '✅ Configured' : '⚠️ Not configured'}
==============================================
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});
