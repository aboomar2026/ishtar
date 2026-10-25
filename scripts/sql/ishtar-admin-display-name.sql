-- Previously supplied owner-run display-name repair, now archived in the project.
-- Execution result was not independently verified. Does not change login, password or role.
-- Exact old-name matching preserves any administrator's custom display name.
UPDATE public."AdminUser"
SET "name" = 'إدارة عشتار', "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'إدارة سعد سنتر'
RETURNING "id", "name";
