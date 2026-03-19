#!/bin/bash
# Wellman Fitness: Automated Vercel & Railway Deployment Script
# This script automates the deployment process using CLI tools
# Prerequisites: vercel CLI, railway CLI installed and authenticated

echo "======================================"
echo "Wellman Fitness Deployment Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required CLIs are installed
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Install with: npm install -g vercel${NC}"
    exit 1
fi

if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Install with: npm install -g @railway/cli${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Both CLIs found${NC}"
echo ""

# Step 1: Deploy Backend to Railway
echo -e "${BLUE}Step 1: Deploying Backend to Railway...${NC}"
echo "1. Run: railway login"
echo "2. Run: railway init"
echo "3. Run: railway add"
echo "4. Select PostgreSQL for database"
echo ""
read -p "Have you completed Railway setup? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying backend..."
    railway up
    echo -e "${GREEN}✓ Backend deployed${NC}"
    
    # Get Railway URL
    RAILWAY_URL=$(railway domains 2>/dev/null | head -1)
    echo -e "${BLUE}Railway Backend URL: ${RAILWAY_URL}${NC}"
else
    echo -e "${YELLOW}Skipping Railway deployment${NC}"
fi

echo ""

# Step 2: Deploy Frontend to Vercel
echo -e "${BLUE}Step 2: Deploying Frontend to Vercel...${NC}"
echo "Running: vercel"
vercel

echo ""
VERCEL_URL=$(vercel inspect --json | jq -r '.creator.url' 2>/dev/null)
echo -e "${BLUE}Vercel Frontend URL: ${VERCEL_URL}${NC}"

echo ""
echo -e "${GREEN}======================================"
echo "Deployment Complete!"
echo "======================================"
echo "Backend:  ${RAILWAY_URL}"
echo "Frontend: ${VERCEL_URL}"
echo "=====================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update Railway CORS_ALLOWED_ORIGINS with Vercel URL"
echo "2. Update Vercel VITE_API_BASE_URL with Railway URL"
echo "3. Test the application at ${VERCEL_URL}"
