import { NextRequest, NextResponse } from 'next/server';
import { generateAdsSequence } from '@/lib/ads-mode/ads-pipeline';
import { ensureStorageBucket } from '@/lib/ads-mode/image-generation';

// Simple types for Phase 10 (matching Phase 9 test products)
type SimpleCategory = 'hoodies' | 'bags' | 'tshirts' | 'accessories';
type SimpleTemplate = 'luxury' | 'streetwear' | 'minimalist' | 'bold';

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { productId, productName, category, template } = body;

        // Validate required fields
        if (!productId || !productName || !category || !template) {
            return NextResponse.json(
                { error: 'Missing required fields: productId, productName, category, template' },
                { status: 400 }
            );
        }

        // Validate category (simple categories for Phase 10)
        const validCategories: SimpleCategory[] = ['hoodies', 'bags', 'tshirts', 'accessories'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate template
        const validTemplates: SimpleTemplate[] = ['luxury', 'streetwear', 'minimalist', 'bold'];
        if (!validTemplates.includes(template)) {
            return NextResponse.json(
                { error: `Invalid template. Must be one of: ${validTemplates.join(', ')}` },
                { status: 400 }
            );
        }

        console.log(`[API] Generating ads sequence for product: ${productId}`);

        // Ensure storage bucket exists
        await ensureStorageBucket();

        // Generate ads sequence
        const result = await generateAdsSequence({
            productId,
            productName,
            category,
            template
        });

        // Return result
        return NextResponse.json({
            success: result.status === 'SUCCESS',
            generationId: result.generationId, // Phase 11: DB record ID
            runId: result.runId,
            plan: result.plan,
            shots: result.shots,
            status: result.status,
            totals: result.totals,
            error: result.error
        });

    } catch (error: any) {
        console.error('[API] Error generating ads sequence:', error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal server error'
            },
            { status: 500 }
        );
    }
}

// OPTIONS for CORS (if needed)
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
