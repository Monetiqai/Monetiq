/**
 * Extract first frame from video file as JPEG image
 * Used for image-to-video generation with Veo
 */

export async function extractFirstFrame(videoFile: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');

        video.onloadeddata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // Seek to 0.5s to avoid potential black frames at start
            video.currentTime = 0.5;
        };

        video.onseeked = () => {
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(video, 0, 0);

            // Convert to JPEG blob with 95% quality
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log('✅ Frame extracted:', blob.size, 'bytes');
                    resolve(blob);
                } else {
                    reject(new Error('Failed to extract frame'));
                }
            }, 'image/jpeg', 0.95);

            // Cleanup
            URL.revokeObjectURL(video.src);
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Video load error'));
        };

        video.src = URL.createObjectURL(videoFile);
        video.load();
    });
}
