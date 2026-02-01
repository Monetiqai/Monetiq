import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/storage/media-store";

export async function POST(req: Request) {
    console.log('🚀 Upload API called');

    try {
        // Parse FormData
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const role = formData.get("role") as string || "product_image";

        console.log('📋 FormData parsed:', {
            hasFile: !!file,
            role,
            fileType: file?.type,
            fileName: file?.name
        });

        if (!file) {
            console.error('❌ No file provided in FormData');
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Get authenticated user
        console.log('🔐 Checking authentication...');
        const supabase = await supabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('❌ Auth error:', authError);
            return NextResponse.json(
                { error: `Authentication failed: ${authError.message}` },
                { status: 401 }
            );
        }

        if (!user) {
            console.error('❌ No user found');
            return NextResponse.json(
                { error: "Unauthorized - no user session" },
                { status: 401 }
            );
        }

        const userId = user.id;
        console.log('✅ User authenticated:', userId);

        console.log('📤 Asset upload request:', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            userId,
            role
        });

        // Get projectId for product images (optional for Ads Mode, required for project-based)
        const projectId = formData.get("projectId") as string | null;

        console.log('📦 Preparing upload to R2:', { role, projectId });

        // CANONICAL PATH ENFORCEMENT for product images
        let filename: string;
        let path: string;
        let contentType: string;

        if (role === 'product_image') {
            if (projectId) {
                // PROJECT-BASED UPLOAD: Use canonical path
                // System Rule: monetiq/inputs/{product_id}/source.png
                filename = 'source.png';
                path = `monetiq/inputs/${projectId}`;
                contentType = 'image/png'; // Always PNG for product images

                console.log('✅ Using CANONICAL path for product image:', {
                    path: `${path}/${filename}`,
                    projectId
                });
            } else {
                // ADS MODE UPLOAD: Use temporary path (no project yet)
                // Will be referenced via asset_id in ad_packs
                const timestamp = Date.now();
                filename = `product_${timestamp}.png`;
                path = `monetiq/temp/${userId}`;
                contentType = 'image/png'; // Always PNG

                console.log('✅ Using TEMPORARY path for Ads Mode product image:', {
                    path: `${path}/${filename}`,
                    note: 'Will be referenced via asset_id'
                });
            }
        } else {
            // Dynamic path for non-product uploads
            const timestamp = Date.now();
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            filename = `${timestamp}_${sanitizedFileName}`;
            path = `inputs/${userId}`;
            contentType = file.type;

            console.log('📦 Using dynamic path for non-product upload:', {
                path: `${path}/${filename}`
            });
        }

        const arrayBuffer = await file.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);

        // Convert to PNG if product image and not already PNG
        if (role === 'product_image' && file.type !== 'image/png') {
            console.log('🔄 Converting to PNG for product image...');
            try {
                const sharp = require('sharp');
                buffer = await sharp(buffer).png().toBuffer();
                console.log('✅ Converted to PNG successfully');
            } catch (conversionError: any) {
                console.error('❌ PNG conversion failed:', conversionError);
                return NextResponse.json(
                    { error: `PNG conversion failed: ${conversionError.message}` },
                    { status: 500 }
                );
            }
        }

        console.log('📦 Uploading via media-store (R2)...');
        const uploadResult = await uploadMedia({
            buffer,
            filename,
            contentType, // Use computed contentType (PNG for product images)
            path
        });

        console.log('✅ Upload successful to R2:', {
            provider: uploadResult.provider,
            url: uploadResult.url,
            key: uploadResult.key
        });

        // Create asset record in database with R2 tracking
        console.log('💾 Creating asset record in database...');

        const assetPayload = {
            user_id: userId,
            project_id: null as any, // Required by schema but we don't have a project yet in Step 1
            kind: 'image' as const,
            role: role,
            status: 'ready' as const,
            category: 'uploads', // Manual uploads always go to Uploads category
            origin_provider: uploadResult.provider, // 'r2' or 'supabase'
            r2_bucket: uploadResult.provider === 'r2' ? process.env.R2_BUCKET : null,
            r2_key: uploadResult.provider === 'r2' ? uploadResult.key : null,
            public_url: uploadResult.url, // R2 public URL
            storage_bucket: null, // Legacy field, null for R2 uploads
            storage_path: null, // Legacy field, null for R2 uploads
            mime_type: file.type,
            byte_size: file.size,
            meta: {
                original_filename: file.name,
                uploaded_at: new Date().toISOString(),
                file_size: file.size
            }
        };

        console.log('📝 Asset payload:', assetPayload);

        const { data: asset, error: dbError } = await supabase
            .from('assets')
            .insert(assetPayload)
            .select()
            .single();

        if (dbError) {
            console.error('❌ Database insert error:', {
                message: dbError.message,
                details: dbError.details,
                hint: dbError.hint,
                code: dbError.code
            });

            // Note: Cannot easily clean up R2 upload here without exposing service credentials
            // R2 cleanup would require a separate admin endpoint or background job

            return NextResponse.json(
                { error: `Failed to create asset record: ${dbError.message}. Details: ${dbError.details || 'none'}. Hint: ${dbError.hint || 'none'}` },
                { status: 500 }
            );
        }

        console.log('✅ Asset record created successfully:', asset.id);

        const response = {
            assetId: asset.id,
            url: uploadResult.url, // R2 public URL
            key: uploadResult.key,
            provider: uploadResult.provider
        };

        console.log('✅ Upload complete, returning:', response);

        return NextResponse.json(response, { status: 200 });

    } catch (error: any) {
        console.error("❌ Upload API unexpected error:", {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        return NextResponse.json(
            { error: `Upload failed: ${error.message || 'Unknown server error'}` },
            { status: 500 }
        );
    }
}
