/**
 * PHASE 11.5 — CLOUDFLARE R2 PROVIDER
 * 
 * S3-compatible storage provider for Cloudflare R2
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { MediaProvider } from '../types';
import { R2_CONFIG } from '../config';

export class R2Provider implements MediaProvider {
    private client: S3Client;
    private bucket: string;
    private publicBaseUrl: string;

    constructor() {
        if (!R2_CONFIG.endpoint || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
            throw new Error('R2 configuration missing. Check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
        }

        this.client = new S3Client({
            region: 'auto', // R2 uses 'auto' region
            endpoint: R2_CONFIG.endpoint,
            credentials: {
                accessKeyId: R2_CONFIG.accessKeyId,
                secretAccessKey: R2_CONFIG.secretAccessKey
            }
        });

        this.bucket = R2_CONFIG.bucket;
        this.publicBaseUrl = R2_CONFIG.publicBaseUrl || R2_CONFIG.endpoint!;

        console.log('[R2Provider] Initialized with bucket:', this.bucket);
    }

    async putObject(params: {
        buffer: Buffer;
        key: string;
        contentType: string;
        cacheControl?: string;
    }): Promise<{ url: string; key: string }> {
        const { buffer, key, contentType, cacheControl } = params;

        console.log(`[R2] Uploading: ${key} (${buffer.length} bytes)`);

        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                CacheControl: cacheControl || 'public, max-age=31536000, immutable'
            });

            await this.client.send(command);

            const url = this.getPublicUrl(key);
            console.log(`[R2] ✓ Uploaded: ${url}`);

            return { url, key };

        } catch (error: any) {
            console.error(`[R2] Upload failed: ${error.message}`);
            throw new Error(`R2 upload failed: ${error.message}`);
        }
    }

    getPublicUrl(key: string): string {
        // Remove protocol and trailing slash from base URL
        const baseUrl = this.publicBaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return `https://${baseUrl}/${key}`;
    }

    async copyObject(params: {
        sourceKey: string;
        destKey: string;
    }): Promise<void> {
        // For migration: download then upload
        // R2 doesn't support cross-bucket copy in the same way as S3
        console.log(`[R2] Copy not implemented (use download + upload for migration)`);
        throw new Error('R2 copyObject not implemented');
    }
}
