const express = require('express');
const router = express.Router();

// Environment variables for allowed location
const allowedLatitude = parseFloat(process.env.ALLOWED_LATITUDE || '14.587286645798374');
const allowedLongitude = parseFloat(process.env.ALLOWED_LONGITUDE || '120.98445460930279');
const allowedRadius = parseFloat(process.env.ALLOWED_RADIUS || '5000'); // in meters

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

router.post('/validate-location', (req, res) => {
  const { latitude, longitude } = req.body;
  console.log("Received coordinates:", latitude, longitude); // Debugging log

  const distance = calculateDistance(latitude, longitude, allowedLatitude, allowedLongitude);
  console.log("Distance from allowed location:", distance); // Debugging log

  if (distance <= allowedRadius) {
    return res.json({ accessGranted: true });
  } else {
    return res.status(403).json({ accessGranted: false, message: 'Location not allowed.' });
  }
});

module.exports = router;
