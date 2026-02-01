import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role to bypass RLS, fallback to anon key
const supabaseAdmin = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    if (!serviceRoleKey) {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found, using anon key');
    }

    return createClient(
        url,
        serviceRoleKey || anonKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
};

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { ok: false, error: "No file provided" },
                { status: 400 }
            );
        }

        // Get user ID (or use dev-uploads in dev mode)
        const userId = formData.get("userId") as string || "dev-uploads";

        console.log('📤 Upload request:', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            userId
        });

        // Upload to Supabase Storage using service role
        const supabase = supabaseAdmin();
        const filePath = `${userId}/${Date.now()}_${file.name}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        console.log('📦 Uploading to:', filePath, 'Size:', buffer.length);

        // Ensure content type is set correctly for images
        const contentType = file.type || (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ? 'image/jpeg' : 'video/mp4');

        console.log('📝 Content-Type:', contentType);

        const { error: uploadError } = await supabase.storage
            .from("inputs")
            .upload(filePath, buffer, {
                contentType: contentType,
                upsert: false,
            });

        if (uploadError) {
            console.error('❌ Supabase upload error:', uploadError);
            console.error('Error details:', JSON.stringify(uploadError, null, 2));
            return NextResponse.json(
                { ok: false, error: uploadError.message },
                { status: 500 }
            );
        }

        console.log('✅ Upload successful to Supabase');

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("inputs")
            .getPublicUrl(filePath);

        console.log('🔗 Public URL:', urlData.publicUrl);

        return NextResponse.json({
            ok: true,
            url: urlData.publicUrl,
        });
    } catch (error: any) {
        console.error("Upload API error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Upload failed" },
            { status: 500 }
        );
    }
}
