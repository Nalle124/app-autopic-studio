UPDATE scenes SET reference_scale = 0.95 WHERE reference_scale = 0.85;
UPDATE scenes SET reference_scale = 0.85 WHERE reference_scale < 0.80;