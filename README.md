# Portfolio Backend - Contact Form API

Backend server for handling contact form submissions from Dhineshwaran's portfolio website.

## Features
- ✅ Email notifications via Gmail SMTP
- ✅ Input validation & sanitization
- ✅ Rate limiting (10 requests/15 minutes)
- ✅ CORS security
- ✅ Health check endpoint
- ✅ HTML & plain text email templates
- ✅ Error handling & logging

## Quick Start

### 1. Prerequisites
- Node.js 16+
- Gmail account with 2FA enabled

### 2. Setup
```bash
# Clone/Download the backend files
mkdir portfolio-backend
cd portfolio-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Gmail credentials