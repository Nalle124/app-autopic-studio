UPDATE public.scenes 
SET ai_prompt = 'Place the vehicle on the cobblestone ground at street level, NOT on rooftops or buildings. Colorful traditional Swedish wooden houses on both sides. Overcast daylight. Charming historic atmosphere. The car must be grounded on the stone street.',
    updated_at = now()
WHERE id = 'kullerstengata';