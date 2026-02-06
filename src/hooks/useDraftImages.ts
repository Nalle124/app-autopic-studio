import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UploadedImage } from '@/types/scene';

interface DraftImageRow {
  id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  original_filename: string;
  original_width: number | null;
  original_height: number | null;
  registration_number: string | null;
  car_adjustments: any;
  crop_data: any;
  cropped_url: string | null;
  sort_order: number;
  created_at: string;
}

/**
 * Hook for managing draft images in cloud storage.
 * Handles upload, fetch, update, and cleanup of draft images
 * so they persist across devices and sessions.
 */
export function useDraftImages() {

  /**
   * Upload a single image file to cloud storage and save metadata to the database.
   * Returns the draft record with public URL.
   */
  const uploadDraft = useCallback(async (
    file: File,
    userId: string,
    options?: {
      originalWidth?: number;
      originalHeight?: number;
      sortOrder?: number;
    }
  ): Promise<{ publicUrl: string; draftId: string; storagePath: string } | null> => {
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `drafts/${userId}/${timestamp}-${safeName}`;

      // 1. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('processed-cars')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Draft upload error:', uploadError);
        return null;
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('processed-cars')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // 3. Save metadata to database
      const { data: draft, error: dbError } = await supabase
        .from('draft_images')
        .insert({
          user_id: userId,
          storage_path: storagePath,
          public_url: publicUrl,
          original_filename: file.name,
          original_width: options?.originalWidth ?? null,
          original_height: options?.originalHeight ?? null,
          sort_order: options?.sortOrder ?? 0,
        })
        .select('id')
        .single();

      if (dbError) {
        console.error('Draft DB insert error:', dbError);
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from('processed-cars').remove([storagePath]);
        return null;
      }

      return { publicUrl, draftId: draft.id, storagePath };
    } catch (err) {
      console.error('uploadDraft unexpected error:', err);
      return null;
    }
  }, []);

  /**
   * Fetch all draft images for a user and convert them to UploadedImage objects.
   */
  const fetchDrafts = useCallback(async (userId: string): Promise<UploadedImage[]> => {
    const { data, error } = await supabase
      .from('draft_images')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchDrafts error:', error);
      return [];
    }

    return (data as DraftImageRow[]).map(row => ({
      id: `draft-${row.id}`,
      file: new File([], row.original_filename, { type: 'image/jpeg' }),
      preview: row.cropped_url || row.public_url,
      status: 'pending' as const,
      isOriginal: true,
      originalWidth: row.original_width ?? undefined,
      originalHeight: row.original_height ?? undefined,
      croppedUrl: row.cropped_url ?? undefined,
      carAdjustments: row.car_adjustments ?? undefined,
      _draftId: row.id,
      _storagePath: row.storage_path,
    }));
  }, []);

  /**
   * Delete a single draft image from both storage and database.
   */
  const deleteDraft = useCallback(async (draftId: string) => {
    // Get storage path first
    const { data: row } = await supabase
      .from('draft_images')
      .select('storage_path')
      .eq('id', draftId)
      .single();

    if (row) {
      await supabase.storage.from('processed-cars').remove([row.storage_path]);
    }

    await supabase.from('draft_images').delete().eq('id', draftId);
  }, []);

  /**
   * Delete all draft images for a user.
   */
  const deleteAllDrafts = useCallback(async (userId: string) => {
    // Get all storage paths
    const { data: rows } = await supabase
      .from('draft_images')
      .select('storage_path')
      .eq('user_id', userId);

    if (rows && rows.length > 0) {
      const paths = rows.map(r => r.storage_path);
      await supabase.storage.from('processed-cars').remove(paths);
    }

    await supabase.from('draft_images').delete().eq('user_id', userId);
  }, []);

  /**
   * Update draft metadata (e.g. after crop or adjustment changes).
   */
  const updateDraft = useCallback(async (
    draftId: string,
    updates: {
      croppedUrl?: string | null;
      carAdjustments?: any;
      cropData?: any;
      registrationNumber?: string;
    }
  ) => {
    const updateObj: Record<string, any> = {};
    if (updates.croppedUrl !== undefined) updateObj.cropped_url = updates.croppedUrl;
    if (updates.carAdjustments !== undefined) updateObj.car_adjustments = updates.carAdjustments;
    if (updates.cropData !== undefined) updateObj.crop_data = updates.cropData;
    if (updates.registrationNumber !== undefined) updateObj.registration_number = updates.registrationNumber;

    if (Object.keys(updateObj).length === 0) return;

    const { error } = await supabase
      .from('draft_images')
      .update(updateObj)
      .eq('id', draftId);

    if (error) console.error('updateDraft error:', error);
  }, []);

  return {
    uploadDraft,
    fetchDrafts,
    deleteDraft,
    deleteAllDrafts,
    updateDraft,
  };
}
