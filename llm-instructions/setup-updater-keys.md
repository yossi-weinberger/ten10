# Setup Updater Signing Keys

## Generate RSA Key Pair

To enable secure auto-updates, you need to generate an RSA key pair using the Tauri CLI:

**On Windows (PowerShell):**

```powershell
npx @tauri-apps/cli signer generate -w $env:USERPROFILE\.tauri\ten10.key
```

**On Unix/Mac:**

```bash
npm run tauri signer generate -- -w ~/.tauri/ten10.key
```

This will create two files:

- **Private key**: `~/.tauri/ten10.key` (Unix/Mac) or `C:\Users\[YOU]\.tauri\ten10.key` (Windows) - keep this SECRET!
- **Public key**: Will be displayed in terminal output

**Important**: Save the password you enter - you'll need it for GitHub Secrets!

## Setup Steps

### 1. Generate Keys (Run Locally)

**On Windows (PowerShell):**

```powershell
npx @tauri-apps/cli signer generate -w $env:USERPROFILE\.tauri\ten10.key
```

**On Unix/Mac:**

```bash
npm run tauri signer generate -- -w ~/.tauri/ten10.key
```

**Output will look like:**

```
Private key saved to: ~/.tauri/ten10.key (or C:\Users\[YOU]\.tauri\ten10.key)
Public key: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk...
```

**Save:**

- The password you entered (needed for GitHub Secret `TAURI_KEY_PASSWORD`)
- The private key file location
- The public key (for `tauri.conf.json`)

### 2. Save Private Key to GitHub Secrets

1. Read the private key file:

   **On Windows (PowerShell):**

   ```powershell
   Get-Content $env:USERPROFILE\.tauri\ten10.key
   ```

   **On Unix/Mac:**

   ```bash
   cat ~/.tauri/ten10.key
   ```

2. Get the public key:

   **On Windows (PowerShell):**

   ```powershell
   Get-Content $env:USERPROFILE\.tauri\ten10.key.pub
   ```

   **On Unix/Mac:**

   ```bash
   cat ~/.tauri/ten10.key.pub
   ```

3. Go to GitHub repository: `https://github.com/yossi-weinberger/ten10/settings/secrets/actions`

4. Add the following secrets:

   | Secret Name              | Value                                         | How to Get                                                                                                 |
   | ------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
   | `TAURI_PRIVATE_KEY`      | Entire content of private key file            | Copy from `Get-Content $env:USERPROFILE\.tauri\ten10.key` (Windows) or `cat ~/.tauri/ten10.key` (Unix/Mac) |
   | `TAURI_KEY_PASSWORD`     | The password you entered when generating keys | What you typed in step 1                                                                                   |
   | `VITE_SUPABASE_URL`      | Your Supabase URL                             | From `.env` file                                                                                           |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key                        | From `.env` file                                                                                           |

   **Note**: Even though desktop app is offline, these Supabase secrets are needed because `supabaseClient.ts` is imported during the build process.

5. (Optional) Also save the public key as a secret:
   - Name: `TAURI_PUBLIC_KEY`
   - Value: The public key string (from `ten10.key.pub` file)

### 3. Update tauri.conf.json

1. Get the public key:

   **On Windows (PowerShell):**

   ```powershell
   Get-Content $env:USERPROFILE\.tauri\ten10.key.pub
   ```

   **On Unix/Mac:**

   ```bash
   cat ~/.tauri/ten10.key.pub
   ```

2. Replace the placeholder in `src-tauri/tauri.conf.json` (line 39):

```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_ACTUAL_PUBLIC_KEY_HERE"
    }
  }
}
```

**Note**: In Tauri V2, the updater config is under `plugins`, not `bundle`.

Paste the actual public key from step 1.

### 4. Commit and Push

After updating `tauri.conf.json`:

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: configure updater public key"
git push
```

### 5. Verify Setup

After completing these steps:

1. Test release: `npm run release 0.2.14-test` (use a test version)
2. Check GitHub Actions: `https://github.com/yossi-weinberger/ten10/actions`
3. Verify build succeeded
4. Download and install the `.msi` file
5. Verify app launches successfully
6. Check Settings page - "Version Info" card should appear
7. Test "Check for Updates" button

## Security Notes

⚠️ **CRITICAL**: Never commit or share the private key!

- The private key should only exist in:
  - Your local machine (for testing)
  - GitHub Secrets (for CI/CD)

✅ The public key is safe to commit to the repository.

## Troubleshooting

### Error: "Invalid signature"

- Verify the public key in `tauri.conf.json` matches the one generated
- Check that `TAURI_PRIVATE_KEY` in GitHub Secrets is correct

### Error: "Cannot find private key"

- Ensure `TAURI_PRIVATE_KEY` is set in GitHub repository secrets
- Verify the secret name is exactly `TAURI_PRIVATE_KEY`

## Next Steps

After setting up the keys:

1. The GitHub Actions workflow will automatically sign releases
2. Desktop app will verify updates using the public key
3. Users will receive secure, auto-verified updates
