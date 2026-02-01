-- Rename 'project' category to 'uploads' and update logic
-- Uploads are separate and don't appear in 'All' view

UPDATE assets 
SET category = 'uploads'
WHERE category = 'project';
