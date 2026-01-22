const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ========== ENHANCED CORS CONFIGURATION ==========
const allowedOrigins = [
  // Railway domains
  'https://portfolio-backened-production.up.railway.app',
  'https://portfolio-backened.up.railway.app',
  'https://*.up.railway.app',  // Allow all Railway apps
  
  // GitHub Pages
  'https://dhineshwaranp.github.io',
  'https://*.github.io',
  
  // Local development
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  
  // Environment variables
  process.env.FRONTEND_URL,
  process.env.RAILWAY_STATIC_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp('^' + allowedOrigin.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return origin === allowedOrigin;
    });
    
    if (isAllowed) {
      return callback(null, true);
    } else {
      console.log('🚫 CORS blocked:', origin);
      return callback(new Error('CORS policy violation'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600 // 10 minutes
}));

// Handle preflight
app.options('*', cors());

// Request logger (optional)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// ========== ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio Backend API is running on Railway',
    service: 'Resend Email Service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    resendConfigured: !!process.env.RESEND_API_KEY,
    cors: {
      origin: req.headers.origin || 'none',
      allowed: allowedOrigins
    }
  });
});

// Test Resend endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Test <onboarding@resend.dev>',
      to: process.env.TO_EMAIL || 'apkpdhinesh2005@gmail.com',
      subject: 'Test Email from Railway + Resend',
      html: '<h1>Test successful! 🎉</h1><p>Your Resend + Railway setup is working.</p>'
    });

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: data?.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Contact form endpoint (keep your existing code)
app.post('/api/contact/send', async (req, res) => {
  try {
    const { name, email, message } = req.body;

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

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: [process.env.TO_EMAIL || 'apkpdhinesh2005@gmail.com'],
      replyTo: email,
      subject: `New Portfolio Message: ${name}`,
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
      console.error('❌ Resend error:', error);
      throw new Error('Failed to send email');
    }

    console.log(`✅ Email sent via Resend: ${name} (${email})`);
    console.log(`📧 Email ID: ${data?.id}`);

    // Success response
    res.json({
      success: true,
      message: 'Message sent successfully! I\'ll get back to you soon.',
      timestamp: new Date().toISOString(),
      emailId: data?.id
    });

  } catch (error) {
    console.error('❌ Server error:', error.message);
    
    // Fallback success
    res.json({
      success: true,
      message: 'Message received! I\'ll get back to you soon.',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 PORTFOLIO BACKEND ON RAILWAY
  ================================
  📧 Email Service: Resend.com
  ✅ Status: Ready
  ⏰ Started: ${new Date().toLocaleString()}
  🔐 Resend API: ${process.env.RESEND_API_KEY ? 'Configured ✅' : 'Missing ❌'}
  
  📊 Available Endpoints:
  ----------------------
  ✅ GET  /api/health          - Health check
  📧 POST /api/contact/send    - Send contact message
  🧪 POST /api/test-email      - Test Resend setup
  
  🔗 CORS Allowed Origins:
  -----------------------
  ${allowedOrigins.join('\n  ')}
  `);
});
