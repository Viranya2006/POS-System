const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function to create a user in Firebase Auth without signing them in
 * This prevents the admin from being logged out when creating new users
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // Verify the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to create other users'
    );
  }

  const { email, password, userData } = data;

  if (!email || !password) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email and password are required'
    );
  }

  try {
    // Create user using Admin SDK (this doesn't sign them in)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: false
    });

    console.log('✅ User created via Admin SDK:', userRecord.uid);

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: 'User created successfully'
    };
  } catch (error) {
    console.error('❌ Error creating user:', error);

    let errorMessage = 'Failed to create user';
    let errorCode = 'internal';

    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'This email is already registered';
      errorCode = 'already-exists';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
      errorCode = 'invalid-argument';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'Password is too weak';
      errorCode = 'invalid-argument';
    }

    throw new functions.https.HttpsError(
      errorCode,
      errorMessage,
      error.message
    );
  }
});

/**
 * Cloud Function to delete a user from Firebase Auth
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Verify the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to delete users'
    );
  }

  const { uid } = data;

  if (!uid) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'User UID is required'
    );
  }

  try {
    await admin.auth().deleteUser(uid);
    console.log('✅ User deleted via Admin SDK:', uid);

    return {
      success: true,
      message: 'User deleted successfully'
    };
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to delete user: ' + error.message
    );
  }
});
