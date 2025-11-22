/**
 * License Management API Routes
 */

import express from 'express';
import { validateLicenseKey, saveLicenseKey, checkLicense, getThisMachineId } from './license.js';

const router = express.Router();

/**
 * Get license status and machine ID
 */
router.get('/status', (req, res) => {
  const license = checkLicense();
  res.json(license);
});

/**
 * Get this machine's ID (for customer to send to you)
 */
router.get('/machine-id', (req, res) => {
  res.json({
    machineId: getThisMachineId()
  });
});

/**
 * Activate license with key
 */
router.post('/activate', (req, res) => {
  const { licenseKey } = req.body;
  
  if (!licenseKey) {
    return res.status(400).json({
      success: false,
      message: 'License key is required'
    });
  }
  
  // Validate the license key
  const validation = validateLicenseKey(licenseKey.trim());
  
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.error,
      details: validation.details
    });
  }
  
  // Save license key
  try {
    saveLicenseKey(licenseKey.trim());
    
    return res.json({
      success: true,
      message: 'License activated successfully',
      customer: validation.data.customer,
      expiry: validation.data.expiry
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save license key',
      error: error.message
    });
  }
});

export default router;
