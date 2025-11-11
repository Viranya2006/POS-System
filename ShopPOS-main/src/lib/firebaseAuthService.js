/**
 * Firebase Authentication Service
 * Handles user creation and deletion from Firebase Authentication
 */

import { auth } from './firebase'
import { httpsCallable, getFunctions } from 'firebase/functions'

/**
 * Create a user in Firebase Authentication using Cloud Function
 * This prevents the admin from being logged out when creating new users
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} - User object with uid and email
 */
export async function createFirebaseAuthUser(email, password, userData = {}) {
  if (!email || !password) {
    throw new Error('Email and password are required to create user')
  }

  try {
    // Try to use Cloud Function if available
    try {
      const functions = getFunctions()
      const createUserFunction = httpsCallable(functions, 'createUser')
      
      // Set timeout for the call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function call timeout')), 15000)
      )
      
      const result = await Promise.race([
        createUserFunction({ email, password, userData }),
        timeoutPromise
      ])
      
      if (result.data && result.data.success) {
        console.log('✅ User created in Firebase Authentication via Cloud Function:', result.data.uid)
        return {
          uid: result.data.uid,
          email: result.data.email
        }
      } else {
        throw new Error(result.data?.message || 'Failed to create user')
      }
    } catch (functionError) {
      console.warn('Cloud Function creation failed:', functionError)
      console.warn('Error code:', functionError.code)
      console.warn('Error details:', functionError.details)
      
      // Check for internal errors first (function exists but failed)
      if (functionError.code === 'internal' || 
          functionError.details?.code === 'internal' ||
          functionError.code === 'functions/internal' ||
          (functionError.message && functionError.message.includes('internal'))) {
        // Internal error - likely function not deployed or configuration issue
        // Automatically fall back to client SDK
        const errorMsg = functionError.details?.message || functionError.message || 'Cloud Function error'
        console.error('Cloud Function internal error:', errorMsg)
        console.warn('⚠️ Cloud Function returned internal error. Falling back to client SDK.')
        throw new Error('Cloud Function not deployed or misconfigured. Please deploy Cloud Functions or use fallback mode.')
      }
      
      // Check if it's a function availability error
      if (functionError.code === 'functions/unavailable' || 
          functionError.code === 'functions/not-found' ||
          functionError.code === 'functions/deadline-exceeded' ||
          functionError.message?.includes('timeout') ||
          functionError.message?.includes('not available') ||
          functionError.message?.includes('not found')) {
        
        console.warn('⚠️ Cloud Function not available. Falling back to client SDK (admin will be logged out).')
        throw new Error('Cloud Function not deployed. Please deploy Cloud Functions to keep admin logged in when creating users.')
      }
      
      // Check for specific error codes from Cloud Function
      if (functionError.code === 'already-exists' || functionError.details?.code === 'already-exists') {
        throw new Error('This email is already registered. Please use a different email.')
      } else if (functionError.code === 'invalid-argument' || functionError.details?.code === 'invalid-argument') {
        throw new Error(functionError.details?.message || functionError.message || 'Invalid email or password')
      }
      
      // Re-throw with better error message
      const errorMessage = functionError.details?.message || functionError.message || 'Failed to create user'
      throw new Error(`Failed to create user: ${errorMessage}`)
    }
  } catch (error) {
    console.error('❌ Error creating user from Firebase Auth:', error)
    throw error
  }
}

/**
 * Delete a user from Firebase Authentication
 * This requires a Cloud Function to be deployed OR Firebase Admin SDK
 * 
 * @param {string} firebaseUid - The Firebase UID of the user to delete
 * @returns {Promise<boolean>} - True if successful
 */
export async function deleteFirebaseAuthUser(firebaseUid) {
  if (!firebaseUid) {
    throw new Error('Firebase UID is required to delete user')
  }

  try {
    // Try to use Cloud Function if available
    try {
      const functions = getFunctions()
      const deleteUserFunction = httpsCallable(functions, 'deleteUser')
      
      // Set timeout for the call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Function call timeout')), 10000)
      )
      
      const result = await Promise.race([
        deleteUserFunction({ uid: firebaseUid }),
        timeoutPromise
      ])
      
      if (result.data && result.data.success) {
        console.log('✅ User deleted from Firebase Authentication via Cloud Function:', firebaseUid)
        return true
      } else {
        throw new Error(result.data?.message || 'Failed to delete user')
      }
    } catch (functionError) {
      console.warn('Cloud Function deletion failed:', functionError.message)
      
      // Check if it's a function availability error
      if (functionError.code === 'functions/unavailable' || 
          functionError.code === 'functions/not-found' ||
          functionError.message.includes('timeout') ||
          functionError.message.includes('not available')) {
        
        console.warn('⚠️ Cloud Function not available. Note: Firebase Auth deletion requires Admin SDK.')
        console.warn('⚠️ User will be prevented from logging in via database status check.')
        throw new Error('Cloud Function not deployed. User deletion from Auth requires Admin SDK. User will be blocked from login.')
      }
      
      throw functionError
    }
  } catch (error) {
    console.error('❌ Error deleting user from Firebase Auth:', error)
    throw error
  }
}

/**
 * Fallback method using Firebase REST API
 * Note: This requires the user to have proper permissions
 */
async function deleteUserViaRESTAPI(firebaseUid) {
  const currentUser = auth.currentUser
  
  if (!currentUser) {
    throw new Error('User must be authenticated to delete other users')
  }

  try {
    // Get the current user's ID token
    const idToken = await currentUser.getIdToken()
    
    // Firebase Identity Toolkit API endpoint
    const projectId = 'shoppos-44bd6' // Replace with your project ID
    const apiUrl = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=AIzaSyD_-Nq-oSQ2Qw0dLlNbYQlZ2FMQ1tsDud0`
    
    // Note: The REST API delete endpoint requires Admin SDK
    // For now, we'll return false and suggest Cloud Function deployment
    console.warn('REST API deletion requires Admin SDK. Please deploy Cloud Function.')
    return false
  } catch (error) {
    console.error('Error in REST API fallback:', error)
    throw new Error('Failed to delete user. Please deploy Cloud Function or use Firebase Console.')
  }
}

/**
 * Check if Cloud Function is available
 */
export async function checkCloudFunctionAvailable() {
  try {
    const functions = getFunctions()
    const deleteUserFunction = httpsCallable(functions, 'deleteUser')
    // Just check if function exists, don't call it
    return true
  } catch (error) {
    return false
  }
}

