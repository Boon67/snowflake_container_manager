# Secrets Directory

This directory is for storing sensitive files like:
- Snowflake private keys for keypair authentication
- SSL certificates
- Other sensitive configuration files

## Important Security Notes:
- This directory is in .gitignore to prevent committing secrets
- Set proper file permissions (600) for private keys
- Use strong passphrases for encrypted private keys

## Keypair Authentication Setup:
1. Place your Snowflake private key (PEM format) in this directory
2. Set SNOWFLAKE_PRIVATE_KEY_PATH in .env to point to the key file
3. Set SNOWFLAKE_PRIVATE_KEY_PASSPHRASE if your key is encrypted
4. Set SNOWFLAKE_AUTH_METHOD=keypair in .env

Example .env configuration:
```
SNOWFLAKE_AUTH_METHOD=keypair
SNOWFLAKE_PRIVATE_KEY_PATH=secrets/snowflake_private_key.pem
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=your_passphrase_if_encrypted
```
