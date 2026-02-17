import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export interface UploadResult {
    secure_url: string;
    public_id: string;
}

export async function uploadToCloudinary(
    file: Buffer,
    filename: string
): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'tryon-uploads',
                public_id: filename.split('.')[0],
                resource_type: 'auto',
                timeout: 120000, // 2 minutes
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error Details:', error);
                    reject(error);
                } else if (result) {
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                    });
                }
            }
        );

        uploadStream.end(file);
    });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
}
