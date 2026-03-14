-- Delete the duplicate renewal record (the one from March 13)
DELETE FROM public.credit_transactions 
WHERE id = '7848d6ad-54fd-411e-b444-bb201bbb778c';

-- Fix Erik's balance back to 694 (800 - 106 used images)
UPDATE public.user_credits 
SET credits = 694, updated_at = now() 
WHERE user_id = 'b6305492-89de-4252-b4fc-2eaf46c19d9f';

-- Log the correction
INSERT INTO public.credit_transactions (user_id, amount, balance_after, transaction_type, description)
VALUES ('b6305492-89de-4252-b4fc-2eaf46c19d9f', -106, 694, 'admin_adjustment', 'Korrigering: dubbel renewal raderad, återställt till korrekt saldo 694');

-- Now add unique index to prevent future duplicates
CREATE UNIQUE INDEX idx_credit_transactions_renewal_unique 
ON public.credit_transactions (user_id, transaction_type, description) 
WHERE transaction_type = 'subscription_renewal';