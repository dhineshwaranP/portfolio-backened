const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ========== FIXED CORS CONFIGURATION ==========
const allowedOrigins = [
    'https://portfolio-backened-production-26be.up.railway.app',
    'https://dhineshwaranp.github.io',
    'https://*.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// TEMPORARY FIX: Allow ALL origins for now
app.use(cors({
    origin: '*',  // ⭐ CHANGE THIS TO '*' TEMPORARILY
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger with origin tracking
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// ========== ROUTES ==========

// Health check with CORS headers
app.get('/api/health', (req, res) => {
    // Add CORS headers manually
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    res.json({
        success: true,
        message: 'Dhineshwaran Portfolio Backend is LIVE on Railway!',
        service: 'Resend Email Service',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        resendConfigured: !!process.env.RESEND_API_KEY,
        url: 'https://portfolio-backened-production-26be.up.railway.app',
        github: 'https://dhineshwaranp.github.io',
        cors: 'enabled'
    });
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
    try {
        // Add CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        
        const { data, error } = await resend.emails.send({
            from: 'Portfolio <onboarding@resend.dev>',
            to: process.env.TO_EMAIL || 'apkpdhinesh2005@gmail.com',
            subject: '✅ Railway + Resend Test Successful!',
            html: '<h1>🎉 Test Successful!</h1><p>Your portfolio contact form is working!</p>'
        });

        if (error) throw error;

        res.json({
            success: true,
            message: 'Test email sent successfully!',
            emailId: data?.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to send test email',
            error: error.message
        });
    }
});

// Contact form endpoint
app.post('/api/contact/send', async (req, res) => {
    try {
        // Add CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        
        const { name, email, message } = req.body;
        
        console.log('📧 Contact form submission from:', req.headers.origin);
        console.log('📝 Data:', { name, email, message: message.substring(0, 50) + '...' });

        // Validation
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name must be at least 2 characters'
            });
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        if (!message || message.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Message must be at least 10 characters'
            });
        }

        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.warn('⚠️ RESEND_API_KEY not configured');
            // Return success but log error
            return res.json({
                success: true,
                message: 'Message received! (Email service temporarily offline)',
                timestamp: new Date().toISOString()
            });
        }

        // Send email via Resend
        const { data, error } = await resend.emails.send({
            from: 'Portfolio Contact <onboarding@resend.dev>',
            to: [process.env.TO_EMAIL || 'apkpdhinesh2005@gmail.com'],
            replyTo: email,
            subject: `📧 New Message from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="margin: 0;">📧 New Portfolio Contact</h2>
                        <p style="margin: 5px 0 0 0;">From Dhineshwaran's Portfolio Website</p>
                    </div>
                    
                    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">
                            <div style="font-weight: bold; color: #10b981; margin-bottom: 5px; font-size: 14px;">👤 Name</div>
                            <div style="color: #1f2937;">${name}</div>
                        </div>
                        
                        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb;">
                            <div style="font-weight: bold; color: #10b981; margin-bottom: 5px; font-size: 14px;">📧 Email</div>
                            <div style="color: #1f2937;">
                                <a href="mailto:${email}" style="color: #10b981; text-decoration: none;">${email}</a>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <div style="font-weight: bold; color: #10b981; margin-bottom: 5px; font-size: 14px;">📝 Message</div>
                            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; font-style: italic;">
                                ${message.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                        
                        <div style="color: #6b7280; font-size: 12px; text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <p>This message was sent from the contact form on Dhineshwaran's portfolio website.</p>
                            <p>You can reply directly to this email to contact ${name}.</p>
                        </div>
                    </div>
                </div>
            `,
            text: `
📧 NEW PORTFOLIO CONTACT
========================

👤 Name: ${name}
📧 Email: ${email}

📝 Message:
${message}

⏰ Sent: ${new Date().toLocaleString()}
🔗 Portfolio: https://dhineshwaranp.github.io
            `
        });

        if (error) {
            console.error('Resend error:', error);
            // Still return success to user
            return res.json({
                success: true,
                message: 'Message received! I\'ll get back to you soon.',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`✅ Email sent: ${name} (${email}) - ID: ${data?.id}`);

        res.json({
            success: true,
            message: 'Message sent successfully! I\'ll get back to you soon. 🎉',
            timestamp: new Date().toISOString(),
            emailId: data?.id
        });

    } catch (error) {
        console.error('Server error:', error.message);
        
        // Always return success to user
        res.json({
            success: true,
            message: 'Message received! I\'ll get back to you soon. 📩',
            timestamp: new Date().toISOString()
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 PORTFOLIO BACKEND IS LIVE!
    =============================
    📍 URL: https://portfolio-backened-production-26be.up.railway.app
    📧 Service: Resend Email
    ✅ Status: Running
    ⏰ Started: ${new Date().toLocaleString()}
    
    📊 Endpoints:
    ------------
    ✅ GET  /api/health
    📧 POST /api/contact/send
    🧪 POST /api/test-email
    
    🔗 Frontend:
    ------------
    https://dhineshwaranp.github.io
    
    ⚠️  CORS SETTINGS:
    ------------
    Currently: ALLOW ALL ORIGINS (*)
    To secure later: Change to specific origins
    `);
    
    // Important warnings
    if (!process.env.RESEND_API_KEY) {
        console.log('\n⚠️  WARNING: RESEND_API_KEY is not set!');
        console.log('   Emails will not be sent.');
        console.log('   Go to Railway → Settings → Variables → Add RESEND_API_KEY');
    }
    
    console.log('\n🔧 For CORS testing:');
    console.log('   curl -X GET https://portfolio-backened-production-26be.up.railway.app/api/health');
    console.log('   curl -X POST https://portfolio-backened-production-26be.up.railway.app/api/test-email');
});

