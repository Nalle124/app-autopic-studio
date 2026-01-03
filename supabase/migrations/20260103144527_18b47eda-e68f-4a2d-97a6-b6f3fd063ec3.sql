-- Increase file size limit for processed-cars bucket to 100MB
UPDATE storage.buckets 
SET file_size_limit = 104857600 
WHERE name = 'processed-cars';