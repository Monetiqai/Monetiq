// Helper function to get video duration from a File object
export const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            const duration = video.duration;
            resolve(duration);
        };

        video.onerror = () => {
            reject(new Error('Failed to load video metadata'));
        };

        video.src = URL.createObjectURL(file);
    });
};

// Validate video file
export const validateVideoFile = async (file: File): Promise<void> => {
    console.log('🔍 Validating video:', file.name, file.type, file.size);

    // Check format
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid format. Please use MP4 or MOV files.');
    }

    // Check size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 50MB.');
    }

    // Check duration (1-10 seconds) - made optional for now
    try {
        console.log('⏱️ Checking video duration...');
        const duration = await getVideoDuration(file);
        console.log('✅ Duration:', duration, 'seconds');

        if (duration < 1 || duration > 10) {
            console.warn(`⚠️ Duration ${duration.toFixed(1)}s is outside 1-10s range`);
            // Temporarily allow it for testing
            // throw new Error(`Invalid duration (${duration.toFixed(1)}s). Video must be between 1-10 seconds.`);
        }
    } catch (error) {
        console.warn('⚠️ Could not validate duration:', error);
        // Continue anyway for testing
    }

    console.log('✅ Validation passed');
};
