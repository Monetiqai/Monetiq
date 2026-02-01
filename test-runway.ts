// Test script to verify Runway API key
// Run with: node --loader ts-node/esm test-runway.ts

import { createRunwayClient } from './lib/runway/index';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testRunwayAPI() {
    console.log('Testing Runway API...\n');

    const apiKey = process.env.RUNWAY_API_KEY;

    if (!apiKey) {
        console.error('❌ RUNWAY_API_KEY not found in .env.local');
        process.exit(1);
    }

    console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');

    try {
        const runway = createRunwayClient(apiKey);
        console.log('✅ Runway client created');

        // Test with a public image URL
        const testImageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

        console.log('\nTesting image-to-video generation...');
        console.log('Image URL:', testImageUrl);

        const task = await runway.imageToVideo({
            promptImage: testImageUrl,
            promptText: 'Animate this product with subtle camera motion',
            model: 'gen3a_turbo',
            duration: 5,
            ratio: '16:9',
            watermark: false,
        });

        console.log('\n✅ Task created successfully!');
        console.log('Task ID:', task.id);
        console.log('Status:', task.status);
        console.log('\nFull response:', JSON.stringify(task, null, 2));

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

testRunwayAPI();
