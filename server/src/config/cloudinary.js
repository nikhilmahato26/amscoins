'use strict'

const { v2: cloudinary } = require('cloudinary')
const env = require('./env')

// Prefer the discrete vars; the SDK also reads CLOUDINARY_URL from the
// environment automatically when the discrete values are absent.
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

const isConfigured = () =>
  Boolean(cloudinary.config().cloud_name && cloudinary.config().api_key && cloudinary.config().api_secret)

/**
 * Upload an in-memory image buffer to Cloudinary and resolve with the secure URL.
 * Images land in the `asmcoins/avatars` folder, keyed by user id (overwrites the
 * user's previous avatar rather than piling up orphans).
 */
function uploadImage(
  buffer,
  {
    folder = 'asmcoins/avatars',
    publicId,
    transformation = [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  } = {}
) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        transformation,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    )
    stream.end(buffer)
  })
}

module.exports = { cloudinary, uploadImage, isConfigured }
