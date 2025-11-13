# Code Signing Guide for Ten10 Desktop App

## Overview

Code Signing is a process where software developers digitally sign their applications to:

1. **Verify identity** - Prove that the software actually comes from you
2. **Ensure integrity** - Ensure the code hasn't been changed after signing
3. **Prevent security warnings** - Windows SmartScreen and macOS Gatekeeper allow smoother installation
4. **Build trust** - Users can trust that the software is authentic

**Without signing**, users will see warnings like:

- Windows: "Windows protected your PC" / "Unknown publisher"
- macOS: "App cannot be opened because the developer cannot be verified"

## Current Status

⚠️ **NOT YET IMPLEMENTED** - This feature is planned but not yet configured.

- ✅ **Tauri Signer**: Configured (for updater signing)
- ⏳ **Windows Code Signing**: Waiting for certificate purchase
- ⏳ **macOS Code Signing**: Future feature
- ✅ **Workflow**: Ready with placeholders (commented out in `.github/workflows/release.yml`)

## Recommended Certificate Providers

### 1. Sectigo (formerly Comodo)

- **Price**: ~$200-300/year
- **Advantages**: Reliable, relatively fast verification process
- **Supports**: Windows and macOS
- **Link**: [https://sectigo.com/ssl-certificates-tls/code-signing](https://sectigo.com/ssl-certificates-tls/code-signing)

### 2. DigiCert

- **Price**: ~$400-500/year
- **Advantages**: Most trusted, excellent support
- **Supports**: Windows and macOS
- **Link**: [https://www.digicert.com/signing/code-signing-certificates](https://www.digicert.com/signing/code-signing-certificates)

### 3. SSL.com

- **Price**: ~$200-400/year
- **Advantages**: Good prices, EV (Extended Validation) option
- **Supports**: Windows and macOS
- **Link**: [https://www.ssl.com/code-signing/](https://www.ssl.com/code-signing/)

### 4. GlobalSign

- **Price**: ~$300-400/year
- **Advantages**: Established company, fast process
- **Supports**: Windows and macOS
- **Link**: [https://www.globalsign.com/en/code-signing-certificate](https://www.globalsign.com/en/code-signing-certificate)

## Certificate Types

### Standard Code Signing Certificate

- **Verification**: Organization Validation (OV)
- **Price**: Lower (~$200-300/year)
- **SmartScreen**: May show warning initially until reputation builds
- **Recommended for**: Independent developers, small projects

### EV Code Signing Certificate

- **Verification**: Extended Validation
- **Price**: Higher (~$400-600/year)
- **SmartScreen**: No warning immediately, instant reputation
- **USB Token**: Requires physical USB token (cannot store in cloud)
- **Recommended for**: Companies, commercial applications

## Purchase Process

### Step 1: Choose Provider and Certificate

1. Select a provider from the list above
2. Decide if you need Standard or EV
3. Click "Buy Now" / "Order"

### Step 2: Identity Verification

The provider will require:

- **For registered companies**:
  - Company registration number
  - Incorporation documents
  - Activity confirmation (sometimes)
  - Phone verification
- **For individuals**:
  - Government-issued ID
  - Proof of address (utility bill/municipal tax)
  - Phone or video verification

**Note**: Verification process can take 1-7 business days.

### Step 3: Receive Certificate

- **Standard**: `.pfx` or `.p12` file received via email
- **EV**: Physical USB token sent by mail

### Step 4: Store Certificate

⚠️ **Very Important**:

- Store the certificate in a safe place
- Keep backup (encrypted!) in another location
- Don't share the password or file with anyone
- If the certificate is stolen, you'll need to revoke it and purchase a new one

## Integration with GitHub Actions

After receiving the certificate, configure it in GitHub Actions.

### Windows Code Signing

#### 1. Convert Certificate to Base64

**On Windows (PowerShell):**

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("your-certificate.pfx")) | Out-File certificate-base64.txt
```

**On Linux/macOS:**

```bash
base64 -i your-certificate.pfx -o certificate-base64.txt
```

#### 2. Configure GitHub Secrets

Go to your GitHub repository:
`https://github.com/yossi-weinberger/ten10/settings/secrets/actions`

Add the following secrets:

1. **`WINDOWS_CERTIFICATE`**

   - Value: Content of `certificate-base64.txt` file (entire text)

2. **`WINDOWS_CERTIFICATE_PASSWORD`**
   - Value: Certificate password

#### 3. Update Workflow

Uncomment the code signing sections in `.github/workflows/release.yml`:

```yaml
- name: Build Tauri app
  uses: tauri-apps/tauri-action@v0.5
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    # Uncomment when Windows certificate is available:
    WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
    WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
  with:
    tagName: ${{ github.ref_name }}
    releaseName: "Ten10 ${{ github.ref_name }}"
    # ... rest of config
```

**Note**: The `tauri-action` automatically handles certificate decoding and signing. You don't need to manually decode the certificate - just provide the Base64-encoded certificate and password as environment variables.

#### 4. Configure Tauri (Optional)

If you need custom signing settings, update `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  },
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

**Note**: In Tauri V2, updater settings are under `plugins`, not `bundle`.

**Default behavior**: If not configured, `tauri-action` uses default Windows signing settings.

### macOS Code Signing

(Future - currently Windows only)

## Verification

### Check Signature (Windows)

After build, verify the file is signed:

```powershell
# PowerShell
Get-AuthenticodeSignature "path\to\Ten10_0.2.9_x64.msi"
```

Expected result:

```
Status        : Valid
StatusMessage : Signature verified.
SignerCertificate : ...
```

### Test SmartScreen

Install the app on a clean Windows machine and check:

- **Standard Cert**: May show warning initially
- **EV Cert**: Should install without warnings

## FAQ

### Is a certificate mandatory?

Not technically required, but highly recommended:

- ✅ **With certificate**: Users can install easily
- ❌ **Without certificate**: Security warnings deter users

### Can I get a free certificate?

No. Code signing certificates require professional identity verification and are always paid.

### How long does verification take?

- **Standard**: 1-3 business days
- **EV**: 3-7 business days (including USB token shipping)

### What happens when the certificate expires?

- Renew the certificate before it expires
- Already signed applications will continue to work
- Cannot sign new builds with an expired certificate

### Do I need a separate certificate for each platform?

- Windows: Dedicated certificate for Windows
- macOS: Dedicated certificate for macOS (via Apple Developer Program)
- Linux: Not needed (AppImage doesn't require signing)

## Additional Resources

- [Tauri Code Signing Documentation](https://tauri.app/v1/guides/distribution/sign-windows)
- [Microsoft: Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/security/threat-protection/windows-defender-application-control/use-code-signing-for-better-control-and-protection)
- [Apple Developer Program](https://developer.apple.com/programs/) (for macOS)

---

**Last Updated**: January 2025  
**Author**: Ten10 Development Team
