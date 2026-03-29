import cloudinary
import cloudinary.uploader
from io import BytesIO
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


def upload_to_cloudinary(
    image_bytes: bytes, filename: str, folder: str = "blog_images"
) -> str:
    """
    Upload image bytes to Cloudinary and return the secure URL.

    Args:
        image_bytes: Raw image bytes
        filename: Filename for the image
        folder: Cloudinary folder to organize images

    Returns:
        Secure URL of the uploaded image
    """
    try:
        # Create a file-like object from bytes
        file_obj = BytesIO(image_bytes)

        result = cloudinary.uploader.upload(
            file_obj,
            public_id=os.path.splitext(filename)[0],  # Remove extension
            folder=folder,
            resource_type="image",
            overwrite=False,
        )
        return result["secure_url"]
    except Exception as e:
        raise Exception(f"Cloudinary upload failed: {e}")


def upload_image(image_bytes: bytes, filename: str) -> str:
    """Legacy function - use upload_to_cloudinary instead."""
    return upload_to_cloudinary(image_bytes, filename)
