#!/usr/bin/env node

/**
 * VAPID Key Generation Script for Pulse Notifications
 * 
 * This script generates VAPID key pairs for Web Push notifications
 * and creates configuration files for both backend and frontend use.
 * 
 * Usage: node generate-vapid-keys.js
 */

const fs = require('fs');
const path = require('path');

// Check if web-push is available, if not install it
let webpush;
try {
  webpush = require('web-push');
} catch (error) {
  console.log('📦 Installing web-push package...');
  const { execSync } = require('child_process');
  execSync('npm install web-push', { stdio: 'inherit' });
  webpush = require('web-push');
}

console.log('🔐 Generating VAPID keys for Pulse Notifications...');
console.log('================================================');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!');
console.log('');
console.log('📋 Generated Keys:');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('');

// Create vapid-keys.json for backend use
const vapidConfig = {
  publicKey: vapidKeys.publicKey,
  privateKey: vapidKeys.privateKey,
  generatedAt: new Date().toISOString(),
  contact: 'mailto:admin@pulse-app.com' // You can update this
};

const vapidFilePath = path.join(__dirname, 'vapid-keys.json');
fs.writeFileSync(vapidFilePath, JSON.stringify(vapidConfig, null, 2));

console.log('💾 Created vapid-keys.json with configuration');
console.log('');

// Create Terraform variables file
const tfVarsContent = `# VAPID Keys for Web Push Notifications
# Generated on: ${new Date().toISOString()}

vapid_public_key  = "${vapidKeys.publicKey}"
vapid_private_key = "${vapidKeys.privateKey}"
vapid_contact     = "mailto:admin@pulse-app.com"
`;

const tfVarsPath = path.join(__dirname, 'pulse-notifications', 'terraform.tfvars');
fs.writeFileSync(tfVarsPath, tfVarsContent);

console.log('🏗️  Created terraform.tfvars for infrastructure deployment');
console.log('');

// Create frontend configuration
const frontendConfigPath = path.join(__dirname, 'pulse-mobile', 'vapid-config.json');
const frontendConfig = {
  publicKey: vapidKeys.publicKey,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(frontendConfigPath, JSON.stringify(frontendConfig, null, 2));

console.log('📱 Created vapid-config.json for frontend use');
console.log('');

// Update .gitignore files to protect private keys
const rootGitignorePath = path.join(__dirname, '.gitignore');
const gitignoreContent = `
# VAPID Keys (contains private key - keep secure!)
vapid-keys.json
pulse-notifications/terraform.tfvars
pulse-mobile/vapid-config.json
`;

let existingGitignore = '';
if (fs.existsSync(rootGitignorePath)) {
  existingGitignore = fs.readFileSync(rootGitignorePath, 'utf8');
}

if (!existingGitignore.includes('vapid-keys.json')) {
  fs.appendFileSync(rootGitignorePath, gitignoreContent);
  console.log('🔒 Updated .gitignore to protect VAPID private keys');
} else {
  console.log('🔒 .gitignore already configured for VAPID keys');
}

console.log('');
console.log('🚀 VAPID Key Generation Complete!');
console.log('==================================');
console.log('');
console.log('📁 Files created:');
console.log('  - vapid-keys.json (root) - Backend configuration');
console.log('  - pulse-notifications/terraform.tfvars - Infrastructure variables');
console.log('  - pulse-mobile/vapid-config.json - Frontend configuration');
console.log('');
console.log('🔐 Security Notes:');
console.log('  - Private key is in vapid-keys.json - keep this secure!');
console.log('  - Files are added to .gitignore automatically');
console.log('  - Public key can be safely shared');
console.log('');
console.log('📋 Next Steps:');
console.log('  1. cd pulse-notifications && terraform apply');
console.log('  2. Deploy the updated Lambda functions');
console.log('  3. Update the frontend to use new API');
console.log('');