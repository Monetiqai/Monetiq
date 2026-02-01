"use client";

import { ProductCategory } from "@/lib/types/ads-mode";
import { useState, useRef, useEffect } from "react";
import AssetPreviewModal from "./AssetPreviewModal";

interface Step1Props {
    productName: string;
    setProductName: (name: string) => void;
    productCategory: ProductCategory;
    setProductCategory: (category: ProductCategory) => void;
    productImageAssetIds: string[]; // Changed from single to array
    setProductImageAssetIds: (ids: string[]) => void; // Changed from single to array
    onNext: () => void;
}

const CATEGORIES: { value: ProductCategory; label: string; icon: string }[] = [
    { value: "fashion", label: "Fashion & Apparel", icon: "👔" },
    { value: "electronics", label: "Electronics & Tech", icon: "📱" },
    { value: "beauty", label: "Beauty & Cosmetics", icon: "💄" },
    { value: "home", label: "Home & Living", icon: "🏠" },
    { value: "sports", label: "Sports & Fitness", icon: "⚽" },
    { value: "food", label: "Food & Beverage", icon: "🍔" },
    { value: "toys", label: "Toys & Games", icon: "🎮" },
    { value: "books", label: "Books & Media", icon: "📚" },
    { value: "health", label: "Health & Wellness", icon: "💊" },
    { value: "automotive", label: "Automotive", icon: "🚗" },
    { value: "jewelry", label: "Jewelry & Accessories", icon: "💎" },
    { value: "other", label: "Other", icon: "📦" }
];

export default function Step1ProductSetup({
    productName,
    setProductName,
    productCategory,
    setProductCategory,
    productImageAssetIds,
    setProductImageAssetIds,
    onNext
}: Step1Props) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]); // Changed to array
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Asset Library state
    const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
    const [existingAssets, setExistingAssets] = useState<any[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    // Pagination state
    const [assetOffset, setAssetOffset] = useState(0);
    const [assetTotal, setAssetTotal] = useState(0);
    const [hasMoreAssets, setHasMoreAssets] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // Selection state (for bulk delete)
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Preview modal state
    const [previewAsset, setPreviewAsset] = useState<any | null>(null);

    const canProceed = productName.trim() !== "" && productImageAssetIds.length > 0; // At least 1 image

    // Persist imagePreviews to localStorage (separate from AdsMode draft)
    useEffect(() => {
        if (imagePreviews.length > 0) {
            console.log('[Step1] Persisting previews to localStorage:', imagePreviews);
            localStorage.setItem('ads_mode_image_previews', JSON.stringify(imagePreviews));
        }
    }, [imagePreviews]);

    // Rehydrate image previews from localStorage on mount
    useEffect(() => {
        if (productImageAssetIds.length > 0 && imagePreviews.length === 0) {
            console.log('[Step1] Rehydrating previews for asset IDs:', productImageAssetIds);

            // Try to load from localStorage first
            const savedPreviews = localStorage.getItem('ads_mode_image_previews');
            if (savedPreviews) {
                try {
                    const parsed = JSON.parse(savedPreviews);
                    console.log('[Step1] Loaded previews from localStorage:', parsed);
                    setImagePreviews(parsed);
                    return; // Success, no need to fetch from Supabase
                } catch (error) {
                    console.error('[Step1] Failed to parse saved previews:', error);
                }
            }

            // Fallback: Fetch from Supabase (may fail due to RLS if not authenticated)
            const fetchPreviews = async () => {
                try {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );

                    const { data: assets, error } = await supabase
                        .from('assets')
                        .select('id, public_url')
                        .in('id', productImageAssetIds);

                    if (error) {
                        console.error('[Step1] Failed to fetch assets:', error);
                        return;
                    }

                    if (assets) {
                        console.log('[Step1] Fetched assets:', assets);

                        // Preserve order from productImageAssetIds
                        const orderedPreviews = productImageAssetIds.map(id => {
                            const asset = assets.find(a => a.id === id);
                            return asset?.public_url || '';
                        }).filter(url => url !== '');

                        console.log('[Step1] Setting previews:', orderedPreviews);
                        setImagePreviews(orderedPreviews);
                    }
                } catch (error) {
                    console.error('[Step1] Failed to fetch previews:', error);
                }
            };

            fetchPreviews();
        }
    }, [productImageAssetIds]); // Removed imagePreviews from dependencies

    const handleFileSelect = async (files: FileList) => {
        // Validate: max 10 images total
        if (productImageAssetIds.length + files.length > 10) {
            setUploadError(`Maximum 10 images allowed. You have ${productImageAssetIds.length}, trying to add ${files.length}.`);
            return;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const newAssetIds: string[] = [];
            const newPreviews: string[] = [];

            // Upload each file sequentially
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    console.warn(`Skipping non-image file: ${file.name}`);
                    continue;
                }

                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    console.warn(`Skipping large file (>10MB): ${file.name}`);
                    continue;
                }

                // Create FormData
                const formData = new FormData();
                formData.append('file', file);
                formData.append('role', 'product_image');

                // Upload to API
                const response = await fetch('/api/upload-asset', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('Upload API error:', errorData);
                    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
                }

                const data = await response.json();

                if (data.assetId) {
                    console.log('[Upload] Asset created:', data.assetId, 'URL:', data.url);
                    newAssetIds.push(data.assetId);

                    // Use R2 public URL instead of blob URL (persists after refresh)
                    newPreviews.push(data.url);
                } else {
                    throw new Error('No asset ID returned');
                }
            }

            // Update state with new images
            console.log('[Upload] Setting asset IDs:', [...productImageAssetIds, ...newAssetIds]);
            console.log('[Upload] Setting previews:', [...imagePreviews, ...newPreviews]);
            setProductImageAssetIds([...productImageAssetIds, ...newAssetIds]);
            setImagePreviews([...imagePreviews, ...newPreviews]);

        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload images');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files);
        }
    };

    const handleRemoveImage = (index: number) => {
        // Remove image at index
        const newAssetIds = productImageAssetIds.filter((_, i) => i !== index);
        const newPreviews = imagePreviews.filter((_, i) => i !== index);
        setProductImageAssetIds(newAssetIds);
        setImagePreviews(newPreviews);

        // Clear file input if all images removed
        if (newAssetIds.length === 0 && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Asset Library functions
    const fetchExistingAssets = async (append = false) => {
        console.log('[Asset Library] fetchExistingAssets called (append:', append, ')');
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoadingAssets(true);
                setAssetOffset(0); // Reset offset when fetching fresh
            }
            setUploadError(null);

            const offset = append ? assetOffset : 0;
            console.log(`[Asset Library] Fetching from /api/assets (offset: ${offset})...`);

            // Use API endpoint instead of direct Supabase query (avoids RLS auth issues)
            const response = await fetch(`/api/assets?offset=${offset}&limit=20`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch assets' }));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('[Asset Library] API response:', data);

            if (!data.ok) {
                throw new Error(data.message || 'Failed to fetch assets');
            }

            const formattedAssets = (data.assets || []).map((asset: any) => ({
                id: asset.id,
                public_url: asset.public_url,
                original_filename: asset.original_filename,
                mime_type: asset.mime_type,
                byte_size: asset.byte_size,
                created_at: asset.created_at
            }));

            console.log('[Asset Library] Formatted assets:', formattedAssets.length, 'assets');

            // Append or replace
            if (append) {
                setExistingAssets([...existingAssets, ...formattedAssets]);
            } else {
                setExistingAssets(formattedAssets);
            }

            // Update pagination state
            setAssetOffset(offset + formattedAssets.length);
            setAssetTotal(data.total || 0);
            setHasMoreAssets(data.hasMore || false);

        } catch (error: any) {
            console.error('[Asset Library] Fetch error:', error);
            setUploadError(error.message || 'Failed to load existing images');
        } finally {
            setLoadingAssets(false);
            setLoadingMore(false);
        }
    };

    const handleSelectAsset = (asset: any) => {
        // Validate: max 10 images total
        if (productImageAssetIds.length >= 10) {
            setUploadError('Maximum 10 images allowed');
            return;
        }

        // Add to productImageAssetIds (same as upload)
        setProductImageAssetIds([...productImageAssetIds, asset.id]);

        // Add to previews
        setImagePreviews([...imagePreviews, asset.public_url]);

        // NO upload, NO R2, NO new asset row
        console.log(`[Asset Library] Selected existing asset: ${asset.id}`);
    };

    // Fetch assets when switching to "existing" mode
    const handleModeChange = (mode: 'new' | 'existing') => {
        setUploadMode(mode);
        if (mode === 'existing' && existingAssets.length === 0) {
            fetchExistingAssets();
        }
    };

    // Selection helpers for bulk delete
    const toggleSelection = (assetId: string) => {
        const newSelection = new Set(selectedAssets);
        if (newSelection.has(assetId)) {
            newSelection.delete(assetId);
        } else {
            newSelection.add(assetId);
        }
        setSelectedAssets(newSelection);
    };

    const selectAll = () => {
        setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    };

    const deselectAll = () => {
        setSelectedAssets(new Set());
    };

    // Search filter
    const filteredAssets = existingAssets.filter(asset =>
        asset.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Preview navigation
    const handlePreviewNext = () => {
        if (!previewAsset) return;
        const currentIndex = filteredAssets.findIndex(a => a.id === previewAsset.id);
        if (currentIndex < filteredAssets.length - 1) {
            setPreviewAsset(filteredAssets[currentIndex + 1]);
        }
    };

    const handlePreviewPrev = () => {
        if (!previewAsset) return;
        const currentIndex = filteredAssets.findIndex(a => a.id === previewAsset.id);
        if (currentIndex > 0) {
            setPreviewAsset(filteredAssets[currentIndex - 1]);
        }
    };

    // Bulk delete handler
    const handleBulkDelete = async () => {
        try {
            setUploadError(null);
            const response = await fetch('/api/assets/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetIds: Array.from(selectedAssets) })
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'Failed to delete assets');
            }

            console.log(`[Bulk Delete] Successfully deleted ${data.deleted} assets`);

            // Refresh asset list
            await fetchExistingAssets();

            // Reset selection state
            setSelectedAssets(new Set());
            setSelectionMode(false);
            setShowDeleteConfirm(false);

        } catch (error: any) {
            console.error('[Bulk Delete] Error:', error);
            setUploadError(error.message || 'Failed to delete assets');
            setShowDeleteConfirm(false);
        }
    };


    return (
        <div className="glass" style={{
            borderRadius: "20px",
            padding: "40px",
            maxWidth: "800px",
            margin: "0 auto"
        }}>
            <h2 style={{
                fontSize: "28px",
                fontWeight: 900,
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
            }}>
                <span style={{ color: "#38BDF8" }}>1.</span>
                Product Setup
            </h2>
            <p style={{
                fontSize: "14px",
                opacity: 0.6,
                marginBottom: "32px"
            }}>
                3 quick details to get started: name, category, and product image
            </p>

            {/* Product Name */}
            <div style={{ marginBottom: "24px" }}>
                <label style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    opacity: 0.7,
                    marginBottom: "12px"
                }}>
                    Product Name *
                </label>
                <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Premium Wireless Headphones"
                    style={{
                        width: "100%",
                        padding: "14px 16px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "10px",
                        fontSize: "16px",
                        color: "#fff",
                        outline: "none",
                        transition: "all 0.2s"
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = "#38BDF8";
                        e.target.style.background = "rgba(255, 255, 255, 0.06)";
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                        e.target.style.background = "rgba(255, 255, 255, 0.04)";
                    }}
                />
            </div>

            {/* Category */}
            <div style={{ marginBottom: "24px" }}>
                <label style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    opacity: 0.7,
                    marginBottom: "12px"
                }}>
                    Category *
                </label>
                <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value as ProductCategory)}
                    className="premium-select"
                    style={{
                        width: "100%",
                        padding: "14px 16px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "10px",
                        fontSize: "16px",
                        color: "#fff",
                        outline: "none"
                    }}
                >
                    {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Upload Mode Selector */}
            <div style={{ marginBottom: "24px" }}>
                <label style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    opacity: 0.7,
                    marginBottom: "12px"
                }}>
                    Image Source
                </label>

                <div style={{
                    display: "flex",
                    gap: "12px"
                }}>
                    <button
                        type="button"
                        onClick={() => handleModeChange('new')}
                        style={{
                            flex: 1,
                            padding: "16px",
                            background: uploadMode === 'new'
                                ? "linear-gradient(135deg, #38BDF8, #0EA5E9)"
                                : "rgba(255, 255, 255, 0.04)",
                            border: uploadMode === 'new'
                                ? "2px solid #38BDF8"
                                : "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                        }}
                    >
                        <span style={{ fontSize: "20px" }}>📤</span>
                        Upload New
                    </button>

                    <button
                        type="button"
                        onClick={() => handleModeChange('existing')}
                        style={{
                            flex: 1,
                            padding: "16px",
                            background: uploadMode === 'existing'
                                ? "linear-gradient(135deg, #38BDF8, #0EA5E9)"
                                : "rgba(255, 255, 255, 0.04)",
                            border: uploadMode === 'existing'
                                ? "2px solid #38BDF8"
                                : "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "14px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px"
                        }}
                    >
                        <span style={{ fontSize: "20px" }}>📚</span>
                        Choose Existing
                    </button>
                </div>
            </div>

            {/* Product Images Upload (Multiple) */}
            <div style={{ marginBottom: "32px" }}>
                <label style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    opacity: 0.7,
                    marginBottom: "12px"
                }}>
                    Product Images * ({productImageAssetIds.length}/10)
                </label>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                />

                {/* Upload Zone (only show in 'new' mode) */}
                {uploadMode === 'new' && (
                    <div
                        onClick={handleClick}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        style={{
                            border: dragActive
                                ? "2px dashed rgba(56, 189, 248, 0.6)"
                                : "2px dashed rgba(56, 189, 248, 0.3)",
                            borderRadius: "12px",
                            padding: "40px",
                            textAlign: "center",
                            background: dragActive
                                ? "rgba(56, 189, 248, 0.1)"
                                : "rgba(56, 189, 248, 0.05)",
                            cursor: uploading ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            opacity: uploading ? 0.6 : 1,
                            marginBottom: productImageAssetIds.length > 0 ? "16px" : "0"
                        }}
                    >
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                            {uploading ? "⏳" : "📸"}
                        </div>
                        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                            {uploading ? "Uploading..." : productImageAssetIds.length > 0 ? "Add More Images" : "Upload Product Images"}
                        </div>
                        <div style={{ fontSize: "13px", opacity: 0.6 }}>
                            Click to browse or drag and drop
                        </div>
                        <div style={{ fontSize: "12px", opacity: 0.4, marginTop: "8px" }}>
                            Recommended: 2-5 images, min 1080x1080px each (max 10)
                        </div>
                        {uploadError && (
                            <div style={{
                                fontSize: "12px",
                                color: "#ef4444",
                                marginTop: "12px",
                                fontWeight: 600
                            }}>
                                ⚠️ {uploadError}
                            </div>
                        )}
                    </div>
                )}

                {/* Asset Library Grid (only show in 'existing' mode) */}
                {uploadMode === 'existing' && (
                    <div>
                        {loadingAssets ? (
                            <div style={{
                                padding: "60px",
                                textAlign: "center",
                                background: "rgba(56, 189, 248, 0.05)",
                                borderRadius: "12px"
                            }}>
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏳</div>
                                <div style={{ fontSize: "14px", opacity: 0.7 }}>Loading your images...</div>
                            </div>
                        ) : existingAssets.length === 0 ? (
                            <div style={{
                                padding: "60px",
                                textAlign: "center",
                                background: "rgba(56, 189, 248, 0.05)",
                                borderRadius: "12px",
                                border: "1px solid rgba(56, 189, 248, 0.2)"
                            }}>
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
                                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                                    No images yet
                                </div>
                                <div style={{ fontSize: "13px", opacity: 0.6, marginBottom: "16px" }}>
                                    Upload your first image to start building your library
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleModeChange('new')}
                                    style={{
                                        padding: "12px 24px",
                                        background: "linear-gradient(135deg, #38BDF8, #0EA5E9)",
                                        border: "none",
                                        borderRadius: "8px",
                                        color: "#fff",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        cursor: "pointer"
                                    }}
                                >
                                    Upload New Image
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Search and Controls Bar */}
                                <div style={{
                                    display: "flex",
                                    gap: "12px",
                                    marginBottom: "16px",
                                    flexWrap: "wrap"
                                }}>
                                    {/* Search Input */}
                                    <div style={{ flex: "1", minWidth: "200px" }}>
                                        <input
                                            type="text"
                                            placeholder="🔍 Search images..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "10px 14px",
                                                background: "rgba(255, 255, 255, 0.05)",
                                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                                borderRadius: "8px",
                                                color: "#fff",
                                                fontSize: "14px"
                                            }}
                                        />
                                    </div>

                                    {/* Selection Mode Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectionMode(!selectionMode);
                                            if (selectionMode) {
                                                deselectAll();
                                            }
                                        }}
                                        style={{
                                            padding: "10px 16px",
                                            background: selectionMode ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                            border: selectionMode ? "1px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.12)",
                                            borderRadius: "8px",
                                            color: selectionMode ? "#ef4444" : "#fff",
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            cursor: "pointer"
                                        }}
                                    >
                                        {selectionMode ? "Cancel" : "Select"}
                                    </button>

                                    {/* Selection Controls (only show in selection mode) */}
                                    {selectionMode && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={selectAll}
                                                style={{
                                                    padding: "10px 16px",
                                                    background: "rgba(255, 255, 255, 0.05)",
                                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                                    borderRadius: "8px",
                                                    color: "#fff",
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={deselectAll}
                                                disabled={selectedAssets.size === 0}
                                                style={{
                                                    padding: "10px 16px",
                                                    background: "rgba(255, 255, 255, 0.05)",
                                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                                    borderRadius: "8px",
                                                    color: "#fff",
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    cursor: selectedAssets.size === 0 ? "not-allowed" : "pointer",
                                                    opacity: selectedAssets.size === 0 ? 0.5 : 1
                                                }}
                                            >
                                                Deselect All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteConfirm(true)}
                                                disabled={selectedAssets.size === 0}
                                                style={{
                                                    padding: "10px 16px",
                                                    background: selectedAssets.size > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                                    border: "1px solid #ef4444",
                                                    borderRadius: "8px",
                                                    color: "#ef4444",
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    cursor: selectedAssets.size === 0 ? "not-allowed" : "pointer",
                                                    opacity: selectedAssets.size === 0 ? 0.5 : 1
                                                }}
                                            >
                                                🗑️ Delete ({selectedAssets.size})
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Asset Grid */}
                                {filteredAssets.length === 0 ? (
                                    <div style={{
                                        padding: "40px",
                                        textAlign: "center",
                                        background: "rgba(56, 189, 248, 0.05)",
                                        borderRadius: "12px",
                                        border: "1px solid rgba(56, 189, 248, 0.2)"
                                    }}>
                                        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
                                        <div style={{ fontSize: "14px", opacity: 0.7 }}>
                                            No images found for "{searchQuery}"
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            style={{
                                                marginTop: "12px",
                                                padding: "8px 16px",
                                                background: "rgba(56, 189, 248, 0.2)",
                                                border: "1px solid #38BDF8",
                                                borderRadius: "6px",
                                                color: "#38BDF8",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                cursor: "pointer"
                                            }}
                                        >
                                            Clear Search
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                                        gap: "12px",
                                        marginBottom: "16px"
                                    }}>
                                        {filteredAssets.map((asset) => (
                                            <div
                                                key={asset.id}
                                                onClick={() => {
                                                    if (selectionMode) {
                                                        toggleSelection(asset.id);
                                                    } else {
                                                        handleSelectAsset(asset);
                                                    }
                                                }}
                                                style={{
                                                    position: "relative",
                                                    aspectRatio: "1",
                                                    borderRadius: "12px",
                                                    overflow: "hidden",
                                                    cursor: "pointer",
                                                    border: selectionMode
                                                        ? selectedAssets.has(asset.id)
                                                            ? "3px solid #ef4444"
                                                            : "1px solid rgba(255, 255, 255, 0.1)"
                                                        : productImageAssetIds.includes(asset.id)
                                                            ? "3px solid #38BDF8"
                                                            : "1px solid rgba(255, 255, 255, 0.1)",
                                                    transition: "all 0.2s"
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!productImageAssetIds.includes(asset.id)) {
                                                        e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.5)";
                                                        e.currentTarget.style.transform = "scale(1.05)";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!productImageAssetIds.includes(asset.id)) {
                                                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                                                        e.currentTarget.style.transform = "scale(1)";
                                                    }
                                                }}
                                            >
                                                <img
                                                    src={asset.public_url}
                                                    alt={asset.original_filename}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover"
                                                    }}
                                                />
                                                {productImageAssetIds.includes(asset.id) && (
                                                    <div style={{
                                                        position: "absolute",
                                                        top: "8px",
                                                        right: "8px",
                                                        width: "24px",
                                                        height: "24px",
                                                        borderRadius: "50%",
                                                        background: "#38BDF8",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "14px"
                                                    }}>
                                                        ✓
                                                    </div>
                                                )}
                                                <div style={{
                                                    position: "absolute",
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    padding: "8px 6px",
                                                    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                                                    fontSize: "10px",
                                                    fontWeight: 600,
                                                    overflow: "hidden",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    {asset.original_filename}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Load More Button */}
                                {hasMoreAssets && !searchQuery && (
                                    <div style={{
                                        textAlign: "center",
                                        marginTop: "16px"
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => fetchExistingAssets(true)}
                                            disabled={loadingMore}
                                            style={{
                                                padding: "12px 24px",
                                                background: loadingMore ? "rgba(255, 255, 255, 0.05)" : "rgba(56, 189, 248, 0.2)",
                                                border: "1px solid #38BDF8",
                                                borderRadius: "8px",
                                                color: "#38BDF8",
                                                fontSize: "14px",
                                                fontWeight: 600,
                                                cursor: loadingMore ? "not-allowed" : "pointer",
                                                opacity: loadingMore ? 0.6 : 1
                                            }}
                                        >
                                            {loadingMore ? "Loading..." : `Load More (${assetOffset} of ${assetTotal})`}
                                        </button>
                                    </div>
                                )}

                                {uploadError && (
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#ef4444",
                                        marginTop: "12px",
                                        fontWeight: 600,
                                        textAlign: "center"
                                    }}>
                                        ⚠️ {uploadError}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Thumbnail Grid */}
                {productImageAssetIds.length > 0 && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                        gap: "12px"
                    }}>
                        {imagePreviews.map((preview, index) => (
                            <div
                                key={index}
                                style={{
                                    position: "relative",
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: index === 0
                                        ? "2px solid rgba(255, 167, 38, 0.5)"
                                        : "1px solid rgba(255, 255, 255, 0.1)",
                                    aspectRatio: "1"
                                }}
                            >
                                {/* Image */}
                                <img
                                    src={preview}
                                    alt={`Product ${index + 1}`}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover"
                                    }}
                                />

                                {/* Primary Badge */}
                                {index === 0 && (
                                    <div style={{
                                        position: "absolute",
                                        top: "4px",
                                        left: "4px",
                                        padding: "2px 6px",
                                        background: "var(--gold)",
                                        borderRadius: "4px",
                                        fontSize: "9px",
                                        fontWeight: 900,
                                        color: "#000",
                                        textTransform: "uppercase"
                                    }}>
                                        Primary
                                    </div>
                                )}

                                {/* Remove Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveImage(index);
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: "4px",
                                        right: "4px",
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "50%",
                                        background: "rgba(0, 0, 0, 0.7)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)",
                                        color: "#fff",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.9)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Next Button */}
            <button
                onClick={onNext}
                disabled={!canProceed}
                className="ads-btn ads-btn-primary"
                style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "16px",
                    fontWeight: 900,
                    letterSpacing: "1.5px",
                    opacity: canProceed ? 1 : 0.5,
                    cursor: canProceed ? "pointer" : "not-allowed"
                }}
            >
                Continue to Template Selection →
            </button>

            {/* Asset Preview Modal */}
            <AssetPreviewModal
                asset={previewAsset}
                onClose={() => setPreviewAsset(null)}
                onNext={handlePreviewNext}
                onPrev={handlePreviewPrev}
            />

            {/* Bulk Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'rgba(20, 20, 20, 0.95)',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '400px',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>
                            ⚠️
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>
                            Delete {selectedAssets.size} image{selectedAssets.size > 1 ? 's' : ''}?
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px', textAlign: 'center' }}>
                            This action cannot be undone. The images will be permanently deleted from your library.
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleBulkDelete}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#ef4444',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
