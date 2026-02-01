import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/supabase/auth';
import { uploadMedia } from '@/lib/storage/media-store';

/**
 * Upload reference image for Director Node
 * POST /api/director-node/upload-reference
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await supabaseServer();

        // Check auth (cached)
        const user = await getAuthenticatedUser(supabase);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'png';
        const filename = `reference_${timestamp}.${ext}`;

        // Upload to R2
        const uploadResult = await uploadMedia({
            buffer,
            filename,
            contentType: file.type,
            path: 'director-node/references'
        });

        console.log('[Upload Reference] Uploaded to R2:', uploadResult.url);

        // Save to assets table
        const { data: asset, error: assetError } = await supabase
            .from('assets')
            .insert({
                user_id: user.id,
                kind: 'image',
                role: 'reference',
                status: 'ready',
                public_url: uploadResult.url,
                r2_key: uploadResult.key,
                origin_provider: 'r2',
                meta: {
                    filename: file.name,
                    size: file.size,
                    content_type: file.type,
                    source: 'director_node_reference_upload'
                }
            })
            .select()
            .single();

        if (assetError) {
            console.error('[Upload Reference] Failed to save asset:', assetError);
            return NextResponse.json({ error: 'Failed to save asset' }, { status: 500 });
        }

        console.log('[Upload Reference] Asset saved:', asset.id);

        return NextResponse.json({
            asset_id: asset.id,
            public_url: uploadResult.url,
            r2_key: uploadResult.key
        });

    } catch (error: any) {
        console.error('[Upload Reference] Error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
