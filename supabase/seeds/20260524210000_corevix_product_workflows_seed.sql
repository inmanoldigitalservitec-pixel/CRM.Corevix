-- Corevix CRM - Phase 17C
-- Seed: product workflows + steps for main Corevix products.
--
-- Safe / idempotent:
-- - Does not delete anything
-- - Creates 1 workflow per product name if missing
-- - Inserts steps only if the step_order is not present for that workflow
-- - Can be re-run multiple times without duplicating steps

-- Company (Corevix)
-- e80e863c-5ace-443e-a75e-198d51403c62

-- ---------------------------------------------------------------------------
-- 1) Desarrollo Web Express
-- ---------------------------------------------------------------------------
WITH
  corevix AS (
    SELECT 'e80e863c-5ace-443e-a75e-198d51403c62'::uuid AS company_id
  ),
  product AS (
    SELECT p.id AS product_id, p.company_id
    FROM public.products p
    JOIN corevix c ON c.company_id = p.company_id
    WHERE p.name = 'Desarrollo Web Express'
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1
  ),
  ensure_workflow AS (
    INSERT INTO public.product_workflows (company_id, product_id, name, description, is_active)
    SELECT product.company_id, product.product_id, 'Proceso estándar', NULL, true
    FROM product
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.product_workflows w
      WHERE w.company_id = product.company_id
        AND w.product_id = product.product_id
        AND w.name = 'Proceso estándar'
    )
    RETURNING id, company_id, product_id
  ),
  workflow AS (
    SELECT id, company_id, product_id
    FROM ensure_workflow
    UNION ALL
    SELECT w.id, w.company_id, w.product_id
    FROM public.product_workflows w
    JOIN product ON product.company_id = w.company_id AND product.product_id = w.product_id
    WHERE w.name = 'Proceso estándar'
    ORDER BY 1
    LIMIT 1
  ),
  steps(step_order, title, description, default_duration_days, default_priority, assigned_role, is_active) AS (
    VALUES
      (1, 'Recopilar información del negocio', NULL, 1, 'High', 'project_manager', true),
      (2, 'Definir estructura de la página', NULL, 1, 'High', 'strategist', true),
      (3, 'Crear diseño visual', NULL, 2, 'Medium', 'designer', true),
      (4, 'Desarrollar sitio web', NULL, 2, 'High', 'developer', true),
      (5, 'Conectar WhatsApp y CTA', NULL, 1, 'High', 'developer', true),
      (6, 'Revisión con cliente', NULL, 1, 'Medium', 'project_manager', true),
      (7, 'Publicar y entregar', NULL, 1, 'High', 'developer', true)
  )
INSERT INTO public.product_workflow_steps (
  company_id,
  workflow_id,
  product_id,
  title,
  description,
  step_order,
  default_priority,
  default_duration_days,
  assigned_role,
  is_active
)
SELECT
  wf.company_id,
  wf.id AS workflow_id,
  wf.product_id,
  s.title,
  s.description,
  s.step_order,
  s.default_priority,
  s.default_duration_days,
  s.assigned_role,
  s.is_active
FROM workflow wf
JOIN steps s ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_workflow_steps existing
  WHERE existing.workflow_id = wf.id
    AND existing.step_order = s.step_order
);

-- ---------------------------------------------------------------------------
-- 2) Manejo de Redes Content Pro
-- ---------------------------------------------------------------------------
WITH
  corevix AS (
    SELECT 'e80e863c-5ace-443e-a75e-198d51403c62'::uuid AS company_id
  ),
  product AS (
    SELECT p.id AS product_id, p.company_id
    FROM public.products p
    JOIN corevix c ON c.company_id = p.company_id
    WHERE p.name = 'Manejo de Redes Content Pro'
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1
  ),
  ensure_workflow AS (
    INSERT INTO public.product_workflows (company_id, product_id, name, description, is_active)
    SELECT product.company_id, product.product_id, 'Proceso estándar', NULL, true
    FROM product
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.product_workflows w
      WHERE w.company_id = product.company_id
        AND w.product_id = product.product_id
        AND w.name = 'Proceso estándar'
    )
    RETURNING id, company_id, product_id
  ),
  workflow AS (
    SELECT id, company_id, product_id
    FROM ensure_workflow
    UNION ALL
    SELECT w.id, w.company_id, w.product_id
    FROM public.product_workflows w
    JOIN product ON product.company_id = w.company_id AND product.product_id = w.product_id
    WHERE w.name = 'Proceso estándar'
    ORDER BY 1
    LIMIT 1
  ),
  steps(step_order, title, description, default_duration_days, default_priority, assigned_role, is_active) AS (
    VALUES
      (1, 'Levantar información de marca', NULL, 1, 'High', 'strategist', true),
      (2, 'Definir calendario de contenido', NULL, 2, 'High', 'content_manager', true),
      (3, 'Crear copies y guiones', NULL, 2, 'Medium', 'copywriter', true),
      (4, 'Diseñar posts', NULL, 3, 'Medium', 'designer', true),
      (5, 'Editar reels', NULL, 3, 'Medium', 'video_editor', true),
      (6, 'Programar publicaciones', NULL, 1, 'Medium', 'social_media_manager', true),
      (7, 'Reportar avances del mes', NULL, 1, 'Low', 'account_manager', true)
  )
INSERT INTO public.product_workflow_steps (
  company_id,
  workflow_id,
  product_id,
  title,
  description,
  step_order,
  default_priority,
  default_duration_days,
  assigned_role,
  is_active
)
SELECT
  wf.company_id,
  wf.id AS workflow_id,
  wf.product_id,
  s.title,
  s.description,
  s.step_order,
  s.default_priority,
  s.default_duration_days,
  s.assigned_role,
  s.is_active
FROM workflow wf
JOIN steps s ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_workflow_steps existing
  WHERE existing.workflow_id = wf.id
    AND existing.step_order = s.step_order
);

-- ---------------------------------------------------------------------------
-- 3) Chatbot WhatsApp
-- ---------------------------------------------------------------------------
WITH
  corevix AS (
    SELECT 'e80e863c-5ace-443e-a75e-198d51403c62'::uuid AS company_id
  ),
  product AS (
    SELECT p.id AS product_id, p.company_id
    FROM public.products p
    JOIN corevix c ON c.company_id = p.company_id
    WHERE p.name = 'Chatbot WhatsApp'
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1
  ),
  ensure_workflow AS (
    INSERT INTO public.product_workflows (company_id, product_id, name, description, is_active)
    SELECT product.company_id, product.product_id, 'Proceso estándar', NULL, true
    FROM product
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.product_workflows w
      WHERE w.company_id = product.company_id
        AND w.product_id = product.product_id
        AND w.name = 'Proceso estándar'
    )
    RETURNING id, company_id, product_id
  ),
  workflow AS (
    SELECT id, company_id, product_id
    FROM ensure_workflow
    UNION ALL
    SELECT w.id, w.company_id, w.product_id
    FROM public.product_workflows w
    JOIN product ON product.company_id = w.company_id AND product.product_id = w.product_id
    WHERE w.name = 'Proceso estándar'
    ORDER BY 1
    LIMIT 1
  ),
  steps(step_order, title, description, default_duration_days, default_priority, assigned_role, is_active) AS (
    VALUES
      (1, 'Definir objetivo del chatbot', NULL, 1, 'High', 'strategist', true),
      (2, 'Diseñar flujo conversacional', NULL, 2, 'High', 'automation_specialist', true),
      (3, 'Crear preguntas y respuestas', NULL, 2, 'High', 'copywriter', true),
      (4, 'Configurar conexión con WhatsApp', NULL, 2, 'High', 'developer', true),
      (5, 'Conectar chatbot con CRM', NULL, 2, 'High', 'developer', true),
      (6, 'Probar conversación completa', NULL, 1, 'High', 'qa', true),
      (7, 'Activar y monitorear', NULL, 1, 'Medium', 'automation_specialist', true)
  )
INSERT INTO public.product_workflow_steps (
  company_id,
  workflow_id,
  product_id,
  title,
  description,
  step_order,
  default_priority,
  default_duration_days,
  assigned_role,
  is_active
)
SELECT
  wf.company_id,
  wf.id AS workflow_id,
  wf.product_id,
  s.title,
  s.description,
  s.step_order,
  s.default_priority,
  s.default_duration_days,
  s.assigned_role,
  s.is_active
FROM workflow wf
JOIN steps s ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_workflow_steps existing
  WHERE existing.workflow_id = wf.id
    AND existing.step_order = s.step_order
);

-- ---------------------------------------------------------------------------
-- 4) Automatización CRM
-- ---------------------------------------------------------------------------
WITH
  corevix AS (
    SELECT 'e80e863c-5ace-443e-a75e-198d51403c62'::uuid AS company_id
  ),
  product AS (
    SELECT p.id AS product_id, p.company_id
    FROM public.products p
    JOIN corevix c ON c.company_id = p.company_id
    WHERE p.name = 'Automatización CRM'
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1
  ),
  ensure_workflow AS (
    INSERT INTO public.product_workflows (company_id, product_id, name, description, is_active)
    SELECT product.company_id, product.product_id, 'Proceso estándar', NULL, true
    FROM product
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.product_workflows w
      WHERE w.company_id = product.company_id
        AND w.product_id = product.product_id
        AND w.name = 'Proceso estándar'
    )
    RETURNING id, company_id, product_id
  ),
  workflow AS (
    SELECT id, company_id, product_id
    FROM ensure_workflow
    UNION ALL
    SELECT w.id, w.company_id, w.product_id
    FROM public.product_workflows w
    JOIN product ON product.company_id = w.company_id AND product.product_id = w.product_id
    WHERE w.name = 'Proceso estándar'
    ORDER BY 1
    LIMIT 1
  ),
  steps(step_order, title, description, default_duration_days, default_priority, assigned_role, is_active) AS (
    VALUES
      (1, 'Diagnosticar proceso comercial actual', NULL, 2, 'High', 'strategist', true),
      (2, 'Definir pipeline y etapas', NULL, 1, 'High', 'crm_specialist', true),
      (3, 'Configurar módulos principales', NULL, 3, 'High', 'developer', true),
      (4, 'Conectar formularios o canales', NULL, 2, 'High', 'automation_specialist', true),
      (5, 'Crear tareas y reglas de seguimiento', NULL, 2, 'Medium', 'crm_specialist', true),
      (6, 'Probar flujo completo', NULL, 2, 'High', 'qa', true),
      (7, 'Capacitar al equipo', NULL, 1, 'Medium', 'project_manager', true)
  )
INSERT INTO public.product_workflow_steps (
  company_id,
  workflow_id,
  product_id,
  title,
  description,
  step_order,
  default_priority,
  default_duration_days,
  assigned_role,
  is_active
)
SELECT
  wf.company_id,
  wf.id AS workflow_id,
  wf.product_id,
  s.title,
  s.description,
  s.step_order,
  s.default_priority,
  s.default_duration_days,
  s.assigned_role,
  s.is_active
FROM workflow wf
JOIN steps s ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_workflow_steps existing
  WHERE existing.workflow_id = wf.id
    AND existing.step_order = s.step_order
);

-- ---------------------------------------------------------------------------
-- 5) Branding Básico
-- ---------------------------------------------------------------------------
WITH
  corevix AS (
    SELECT 'e80e863c-5ace-443e-a75e-198d51403c62'::uuid AS company_id
  ),
  product AS (
    SELECT p.id AS product_id, p.company_id
    FROM public.products p
    JOIN corevix c ON c.company_id = p.company_id
    WHERE p.name = 'Branding Básico'
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1
  ),
  ensure_workflow AS (
    INSERT INTO public.product_workflows (company_id, product_id, name, description, is_active)
    SELECT product.company_id, product.product_id, 'Proceso estándar', NULL, true
    FROM product
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.product_workflows w
      WHERE w.company_id = product.company_id
        AND w.product_id = product.product_id
        AND w.name = 'Proceso estándar'
    )
    RETURNING id, company_id, product_id
  ),
  workflow AS (
    SELECT id, company_id, product_id
    FROM ensure_workflow
    UNION ALL
    SELECT w.id, w.company_id, w.product_id
    FROM public.product_workflows w
    JOIN product ON product.company_id = w.company_id AND product.product_id = w.product_id
    WHERE w.name = 'Proceso estándar'
    ORDER BY 1
    LIMIT 1
  ),
  steps(step_order, title, description, default_duration_days, default_priority, assigned_role, is_active) AS (
    VALUES
      (1, 'Recopilar información de marca', NULL, 1, 'High', 'brand_strategist', true),
      (2, 'Definir dirección visual', NULL, 1, 'High', 'designer', true),
      (3, 'Crear propuesta de logo', NULL, 3, 'High', 'designer', true),
      (4, 'Definir paleta y tipografías', NULL, 1, 'Medium', 'designer', true),
      (5, 'Preparar guía básica de marca', NULL, 2, 'Medium', 'designer', true),
      (6, 'Presentar y ajustar', NULL, 2, 'Medium', 'project_manager', true),
      (7, 'Entregar archivos finales', NULL, 1, 'High', 'designer', true)
  )
INSERT INTO public.product_workflow_steps (
  company_id,
  workflow_id,
  product_id,
  title,
  description,
  step_order,
  default_priority,
  default_duration_days,
  assigned_role,
  is_active
)
SELECT
  wf.company_id,
  wf.id AS workflow_id,
  wf.product_id,
  s.title,
  s.description,
  s.step_order,
  s.default_priority,
  s.default_duration_days,
  s.assigned_role,
  s.is_active
FROM workflow wf
JOIN steps s ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_workflow_steps existing
  WHERE existing.workflow_id = wf.id
    AND existing.step_order = s.step_order
);

-- ---------------------------------------------------------------------------
-- 6) Producción de Contenido
-- ---------------------------------------------------------------------------
WITH
  corevix AS (
    SELECT 'e80e863c-5ace-443e-a75e-198d51403c62'::uuid AS company_id
  ),
  product AS (
    SELECT p.id AS product_id, p.company_id
    FROM public.products p
    JOIN corevix c ON c.company_id = p.company_id
    WHERE p.name = 'Producción de Contenido'
    ORDER BY p.created_at DESC NULLS LAST
    LIMIT 1
  ),
  ensure_workflow AS (
    INSERT INTO public.product_workflows (company_id, product_id, name, description, is_active)
    SELECT product.company_id, product.product_id, 'Proceso estándar', NULL, true
    FROM product
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.product_workflows w
      WHERE w.company_id = product.company_id
        AND w.product_id = product.product_id
        AND w.name = 'Proceso estándar'
    )
    RETURNING id, company_id, product_id
  ),
  workflow AS (
    SELECT id, company_id, product_id
    FROM ensure_workflow
    UNION ALL
    SELECT w.id, w.company_id, w.product_id
    FROM public.product_workflows w
    JOIN product ON product.company_id = w.company_id AND product.product_id = w.product_id
    WHERE w.name = 'Proceso estándar'
    ORDER BY 1
    LIMIT 1
  ),
  steps(step_order, title, description, default_duration_days, default_priority, assigned_role, is_active) AS (
    VALUES
      (1, 'Definir concepto creativo', NULL, 1, 'High', 'creative_director', true),
      (2, 'Crear guion o shotlist', NULL, 1, 'High', 'content_creator', true),
      (3, 'Coordinar producción', NULL, 1, 'Medium', 'producer', true),
      (4, 'Grabar contenido', NULL, 1, 'High', 'videographer', true),
      (5, 'Editar piezas principales', NULL, 3, 'High', 'video_editor', true),
      (6, 'Revisar con cliente', NULL, 1, 'Medium', 'project_manager', true),
      (7, 'Entregar archivos finales', NULL, 1, 'High', 'video_editor', true)
  )
INSERT INTO public.product_workflow_steps (
  company_id,
  workflow_id,
  product_id,
  title,
  description,
  step_order,
  default_priority,
  default_duration_days,
  assigned_role,
  is_active
)
SELECT
  wf.company_id,
  wf.id AS workflow_id,
  wf.product_id,
  s.title,
  s.description,
  s.step_order,
  s.default_priority,
  s.default_duration_days,
  s.assigned_role,
  s.is_active
FROM workflow wf
JOIN steps s ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_workflow_steps existing
  WHERE existing.workflow_id = wf.id
    AND existing.step_order = s.step_order
);

-- ---------------------------------------------------------------------------
-- Verification queries (read-only)
-- ---------------------------------------------------------------------------
-- Count workflows and steps per product (Corevix)
-- (Run this after executing the seed.)
--
-- SELECT
--   p.name AS product_name,
--   COUNT(DISTINCT w.id) AS workflows,
--   COUNT(s.id) AS steps
-- FROM public.products p
-- LEFT JOIN public.product_workflows w
--   ON w.product_id = p.id AND w.company_id = p.company_id AND w.name = 'Proceso estándar'
-- LEFT JOIN public.product_workflow_steps s
--   ON s.workflow_id = w.id AND s.company_id = w.company_id
-- WHERE p.company_id = 'e80e863c-5ace-443e-a75e-198d51403c62'
--   AND p.name IN (
--     'Desarrollo Web Express',
--     'Manejo de Redes Content Pro',
--     'Chatbot WhatsApp',
--     'Automatización CRM',
--     'Branding Básico',
--     'Producción de Contenido'
--   )
-- GROUP BY p.name
-- ORDER BY p.name;

