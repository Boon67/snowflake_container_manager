# Snowflake Keypair Authentication Setup

This guide explains how to set up keypair authentication for your Snowflake connection, which is more secure than password authentication.

## Overview

Keypair authentication uses a private/public key pair instead of a password. The private key is stored locally and used to sign authentication requests, while the public key is registered with your Snowflake user account.

## Benefits

- **Enhanced Security**: No passwords transmitted over the network
- **Key Rotation**: Easy to rotate keys without changing application code
- **Compliance**: Meets stricter security requirements
- **Automation**: Better for automated deployments and CI/CD

## Step 1: Generate Key Pair

### Option A: Using OpenSSL (Recommended)

```bash
# Create secrets directory if it doesn't exist
mkdir -p secrets

# Generate private key (encrypted with passphrase)
openssl genrsa -aes256 -out secrets/snowflake_private_key.p8 2048

# Generate public key from private key
openssl rsa -in secrets/snowflake_private_key.p8 -pubout -out secrets/snowflake_public_key.pub

# Set secure permissions
chmod 600 secrets/snowflake_private_key.p8
chmod 644 secrets/snowflake_public_key.pub

# Optional: Convert to unencrypted private key (less secure but simpler)
# openssl rsa -in secrets/snowflake_private_key.p8 -out secrets/snowflake_private_key_unencrypted.p8
```

### Option B: Using ssh-keygen

```bash
# Create secrets directory if it doesn't exist
mkdir -p secrets

# Generate key pair
ssh-keygen -t rsa -b 2048 -f secrets/snowflake_key

# Convert private key to PKCS#8 format
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
    -in secrets/snowflake_key -out secrets/snowflake_private_key.p8

# Extract public key
ssh-keygen -f secrets/snowflake_key.pub -e -m PKCS8 > secrets/snowflake_public_key.pub

# Set secure permissions
chmod 600 secrets/snowflake_private_key.p8
chmod 644 secrets/snowflake_public_key.pub

# Clean up temporary files
rm secrets/snowflake_key secrets/snowflake_key.pub
```

## Step 2: Register Public Key with Snowflake

### Method 1: Using Snowflake Web UI

1. Log into your Snowflake account
2. Click on your username in the top right
3. Select **My Profile**
4. Go to the **MFA & Password** tab
5. In the **Public Keys** section, click **+ Public Key**
6. Copy and paste your public key content
7. Click **Save**

### Method 2: Using SQL Commands

```sql
-- Connect to Snowflake with your existing credentials
USE ROLE ACCOUNTADMIN;

-- Set the public key for your user (replace with your actual public key)
ALTER USER your_username SET RSA_PUBLIC_KEY='MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...';

-- Verify the key was set
DESC USER your_username;
```

### Method 3: Using SnowSQL

```bash
# Connect with existing credentials
snowsql -a your_account -u your_username

# Set public key
ALTER USER your_username SET RSA_PUBLIC_KEY_FP='SHA256:fingerprint_here';
```

## Step 3: Configure Application

### Update Environment Variables

Edit your `.env` file:

```env
# Comment out password authentication
# SNOWFLAKE_PASSWORD=your_password

# Enable keypair authentication
SNOWFLAKE_PRIVATE_KEY_PATH=./secrets/snowflake_private_key.p8
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=your_passphrase_if_encrypted
```

### File Paths

You can use:
- **Relative paths** (recommended): `./secrets/snowflake_private_key.p8`
- **Absolute paths**: `/home/user/secrets/snowflake_private_key.p8`
- **Environment-specific paths**: `./secrets/development/dev_private_key.p8`

## Step 4: Test Connection

Start your application and check the logs:

```bash
# Start the application
./start.sh

# Look for this log message:
# "Using keypair authentication for Snowflake"
# "Successfully connected to Snowflake"
```

## Security Best Practices

### 1. Protect Private Keys

```bash
# Set restrictive permissions
chmod 600 secrets/snowflake_private_key.p8

# Verify permissions
ls -la secrets/
```

### 2. Use Key Passphrases

Always encrypt your private keys with a strong passphrase:

```bash
# Generate encrypted key
openssl genrsa -aes256 -out secrets/snowflake_private_key.p8 2048
```

### 3. Key Rotation

Regularly rotate your keys:

```bash
# Generate new key pair
openssl genrsa -aes256 -out secrets/snowflake_private_key_new.p8 2048
openssl rsa -in secrets/snowflake_private_key_new.p8 -pubout -out secrets/snowflake_public_key_new.pub

# Update Snowflake with new public key
# Update application configuration
# Remove old keys securely
rm secrets/snowflake_private_key.p8 secrets/snowflake_public_key.pub
mv secrets/snowflake_private_key_new.p8 secrets/snowflake_private_key.p8
mv secrets/snowflake_public_key_new.pub secrets/snowflake_public_key.pub
```

### 4. Environment-Specific Keys

Use different keys for different environments:

```
secrets/
├── README.md
├── development/
│   ├── snowflake_dev_key.p8
│   └── snowflake_dev_key.pub
├── staging/
│   ├── snowflake_staging_key.p8
│   └── snowflake_staging_key.pub
└── production/
    ├── snowflake_prod_key.p8
    └── snowflake_prod_key.pub
```

## Troubleshooting

### Common Issues

1. **"Failed to load private key"**
   - Check file path and permissions
   - Verify passphrase is correct
   - Ensure key is in correct format (PEM/PKCS#8)

2. **"Authentication failed"**
   - Verify public key is registered with Snowflake user
   - Check that private key matches registered public key
   - Ensure user has correct permissions

3. **"File not found"**
   - Use absolute paths in production
   - Check working directory when using relative paths

### Debug Connection

Add debug logging to see connection details:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Validate Key Format

```bash
# Check private key format
openssl rsa -in rsa_key.p8 -text -noout

# Check public key format
openssl rsa -in rsa_key.p8 -pubout -text -noout
```

## Docker/Container Considerations

When using containers, mount keys as volumes:

```yaml
# docker-compose.yml
version: '3.8'
services:
  config-manager:
    build: .
    volumes:
      - ./keys:/app/keys:ro
    environment:
      - SNOWFLAKE_PRIVATE_KEY_PATH=/app/keys/snowflake_key.p8
```

## Production Deployment

1. **Secure Key Storage**: Use secret management systems
2. **Key Rotation**: Implement automated key rotation
3. **Monitoring**: Monitor for authentication failures
4. **Backup**: Securely backup private keys

## Additional Resources

- [Snowflake Keypair Authentication Documentation](https://docs.snowflake.com/en/user-guide/key-pair-auth.html)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [Cryptography Best Practices](https://owasp.org/www-project-cryptographic-storage-cheat-sheet/) 