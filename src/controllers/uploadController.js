export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image to upload.',
      });
    }

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Image upload service is not configured.',
      });
    }

    const imageBase64 = req.file.buffer.toString('base64');

    const formData = new URLSearchParams();
    formData.append('image', imageBase64);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('ImgBB upload failed:', result.error?.message);

      return res.status(502).json({
        success: false,
        message: 'Image upload failed. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        imageUrl: result.data.url,
        displayUrl: result.data.display_url,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Unable to upload image.',
    });
  }
};
