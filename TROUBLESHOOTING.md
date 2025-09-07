# Firebase Phone Authentication Troubleshooting

## Common Issues and Solutions

### 1. Error: `auth/invalid-app-credential`

**Cause**: Phone Authentication is not properly configured in Firebase Console.

**Solution**:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`apex-21cd0`)
3. Navigate to **Authentication > Sign-in method**
4. Click on **Phone** provider
5. Enable it by clicking the toggle switch
6. Save the changes

### 2. Error: `auth/app-not-authorized`

**Cause**: Your app domain is not authorized for Phone Authentication.

**Solution**:
1. In Firebase Console, go to **Authentication > Settings**
2. Scroll down to **Authorized domains**
3. Add your domain:
   - For development: `localhost`
   - For production: your actual domain
4. Save changes

### 3. Error: `auth/quota-exceeded`

**Cause**: You've exceeded the free SMS quota for Phone Authentication.

**Solution**:
1. Upgrade to Firebase Blaze (pay-as-you-go) plan
2. Or add test phone numbers for development

### 4. reCAPTCHA Issues

**Cause**: reCAPTCHA is not properly configured.

**Solution**:
1. Make sure you're testing on `localhost:5173`
2. Check browser console for reCAPTCHA errors
3. Try refreshing the page and trying again

## Testing Setup

### For Development Testing:

1. **Add Test Phone Numbers**:
   - Go to Firebase Console > Authentication > Sign-in method > Phone
   - Add your phone number in the "Test phone numbers" section
   - Format: `+919876543210` (with country code)

2. **Test the App**:
   - Use the test phone number you added
   - You'll receive a test SMS with a verification code
   - The code will be visible in Firebase Console logs

### For Production:

1. **Enable Phone Authentication** (as shown above)
2. **Add your domain** to authorized domains
3. **Upgrade to Blaze plan** if you need more SMS quota
4. **Test with real phone numbers**

## Debugging Steps

1. **Check Firebase Console**:
   - Verify Phone Authentication is enabled
   - Check if your domain is authorized
   - Look at the Authentication logs for errors

2. **Check Browser Console**:
   - Look for reCAPTCHA errors
   - Check network requests to Firebase
   - Verify the Firebase config is correct

3. **Test Firebase Connection**:
   - Use the "Test Firebase Connection" button in the app
   - Verify the project ID and domain match your Firebase project

## Common Configuration Issues

### Wrong Firebase Config:
Make sure your `firebase.js` config matches your Firebase project:
- `projectId` should be `apex-21cd0`
- `authDomain` should be `apex-21cd0.firebaseapp.com`

### Domain Issues:
- For local development, use `localhost`
- Make sure the port (`5173`) is included if needed
- For production, add your actual domain

### Phone Number Format:
- The app expects 10-digit Indian numbers
- It automatically adds `+91` country code
- Test numbers should include the country code in Firebase Console

## Next Steps

1. **Enable Phone Authentication** in Firebase Console
2. **Add test phone numbers** for development
3. **Test the connection** using the test button
4. **Try authentication** with a test number
5. **Check logs** in Firebase Console for any remaining issues
