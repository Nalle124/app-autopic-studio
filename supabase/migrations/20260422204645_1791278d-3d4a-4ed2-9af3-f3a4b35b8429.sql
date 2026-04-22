UPDATE public.scenes
SET 
  baseline_y = 88,
  horizon_y = 55,
  default_scale = 0.72,
  ai_prompt = 'Place the vehicle INSIDE this modern car dealership showroom (bilhall). The car MUST be standing firmly on the polished concrete floor, with all four tires fully grounded on the floor surface — never floating, never elevated. Position the vehicle in the lower-center of the frame so the tires touch the ground and the wheels rest on the polished concrete. The mezzanine balcony, industrial overhead doors, and ceiling lighting should remain visible in the background above and behind the car. Match perspective: the floor recedes naturally toward the back of the hall and the car sits at floor level, parked as if just driven in. Add subtle, realistic contact shadows directly under the tires on the polished floor. Clean, spotless, professional automotive showroom atmosphere. Professional automotive photography, eye-level perspective.'
WHERE id = 'bilhall';