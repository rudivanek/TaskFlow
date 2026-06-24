
DO $$
DECLARE
  v_workspace_id UUID := '983b6f81-db57-4e12-9f37-0bee5d19c7e5';
  v_user_id      UUID := '2bece0b9-6c1c-4116-8501-ccf9c6314dd4';

  -- Existing phase IDs
  p_kickoff      UUID := '24016cd5-ac7e-47a1-8434-193c8f6251d1';
  p_deliverables UUID := '28a6ec2a-f31c-4ac4-af38-d60e2518bbcc';
  p_dev_basic    UUID := 'f33378b2-0e22-4a5a-b20f-32aba9a6a80c';
  p_dev_ecom     UUID := 'bb2e987a-e2ff-4553-93b9-35afd55f68fa';
  p_development  UUID := '85bc20dd-bbd3-47f2-ac5a-4e8736d0fa97';
  p_cleanup      UUID := 'dd8c63a4-2efe-4255-9c85-897059c0f97f';
  p_seo          UUID := '4e39e720-5a84-4293-a5fa-f81a9ed1ee7d';
  p_domain_svr   UUID := '15c32817-19f6-46f3-bb8e-b872889f2a09';
  p_training     UUID := '8fba8bcf-2628-4198-8f57-1de9a63159e6';
  p_review       UUID := '9831c587-bc83-49b6-9b76-2825db8475af';
  p_dev_projects UUID;  -- to be inserted

  -- Existing status IDs
  s_done         UUID := '8f1f6963-f91c-46e5-ab7e-dc4fc08a6493';
  s_not_started  UUID := 'cf5a7c08-fd74-4a8d-bde7-2b1d0df89a74';
  s_doing        UUID;  -- to be inserted
  s_on_hold      UUID;  -- to be inserted

  -- Responsible IDs
  r_sc  UUID := 'af787481-1f08-401f-92e4-396a8a06e887';  -- Sharpen.Studio - Cliente
  r_c   UUID := 'c92330dd-59f1-4081-a094-3a3df483e9a4';  -- Cliente
  r_s   UUID := '4fadc31b-8c27-42bb-b0a7-b6e007216aab';  -- Sharpen.Studio

  -- Project IDs
  p1 UUID;  -- 1. liderality
  p2 UUID;  -- 2. Viaker
  p3 UUID;  -- 1. PHIXWAVE
  p4 UUID;  -- 1. Medrano

  v_tid UUID;  -- temp task ID for subtask inserts

BEGIN

  -- ----------------------------------------
  -- Missing lookups
  -- ----------------------------------------
  INSERT INTO phases (phase, sort_order) VALUES ('Development Projects', 12) RETURNING id INTO p_dev_projects;
  INSERT INTO statuses (status, sort_order) VALUES ('Doing', 5)   RETURNING id INTO s_doing;
  INSERT INTO statuses (status, sort_order) VALUES ('On Hold', 6) RETURNING id INTO s_on_hold;

  -- ----------------------------------------
  -- Projects
  -- ----------------------------------------
  INSERT INTO projects (project, workspace_id) VALUES ('1. liderality', v_workspace_id) RETURNING id INTO p1;
  INSERT INTO projects (project, workspace_id) VALUES ('2. Viaker',     v_workspace_id) RETURNING id INTO p2;
  INSERT INTO projects (project, workspace_id) VALUES ('1. PHIXWAVE',   v_workspace_id) RETURNING id INTO p3;
  INSERT INTO projects (project, workspace_id) VALUES ('1. Medrano',    v_workspace_id) RETURNING id INTO p4;

  -- ============================================================
  -- 1. liderality — Tasks
  -- ============================================================
  INSERT INTO tasks_main (task_id,task_sort,task_name,phase_id,status_id,responsible_id,start_date,days,end_date,depends_on_task_ids,dependencies_task_ids,task_comment,project_id,user_id) VALUES
  (1,1,'Kick-Off',p_kickoff,s_done,r_sc,'2026-02-16',1,'2026-02-16',NULL,ARRAY[2,17,25,44],'En la reunion de kick-off se discuten la estrategia de desarrollo, los plazos, el alcance y las tareas.',p1,v_user_id),
  (2,2,'Entregables (Contenidos Generales)',p_deliverables,s_doing,r_c,'2026-02-14',7,'2026-02-20',ARRAY[1],ARRAY[3],'Entregables necesarios por parte del cliente para comenzar el desarrollo.',p1,v_user_id),
  (44,3,'Entregables (Blog)',p_deliverables,s_on_hold,r_c,'2026-02-14',15,'2026-02-28',ARRAY[1],ARRAY[36,38],'Entrega de accesos, estructura y contenidos relacionados con la seccion de Blog.',p1,v_user_id),
  (25,4,'Entregables (Servicios)',p_deliverables,s_done,r_c,'2026-02-14',15,'2026-02-28',ARRAY[1],ARRAY[45],'Entrega de accesos, estructura y contenidos relacionados con la seccion de Proyectos.',p1,v_user_id),
  (17,5,'Entregables (Dominio/Servidor)',p_deliverables,s_doing,r_c,'2026-02-14',45,'2026-03-30',ARRAY[1],ARRAY[20],'El cliente debe entregar acceso al registro del dominio y servidor.',p1,v_user_id),
  (3,6,'Sitemap',p_dev_basic,s_done,r_s,'2026-02-21',1,'2026-02-21',ARRAY[2],ARRAY[4],'Se desarrolla el sitemap: una guia para definir objetivos, la estructura del sitio y la importancia de cada pagina.',p1,v_user_id),
  (4,7,'Sitemap - Aprobacion',p_dev_basic,s_done,r_c,'2026-02-22',1,'2026-02-22',ARRAY[3],ARRAY[5],'El sitemap requiere aprobacion por parte del cliente.',p1,v_user_id),
  (5,8,'Dummy PDF',p_dev_basic,s_done,r_s,'2026-02-23',15,'2026-03-09',ARRAY[4],ARRAY[6],'Con el sitemap definido, se crea un dummy PDF o maqueta visual estatica.',p1,v_user_id),
  (6,9,'Dummy PDF - Aprobacion',p_dev_basic,s_done,r_c,'2026-03-10',3,'2026-03-12',ARRAY[5],ARRAY[7],'El cliente debe de aprobar el Dummy PDF.',p1,v_user_id),
  (7,10,'Dummy Web 1 - (Home)',p_dev_basic,s_done,r_s,'2026-03-13',15,'2026-03-27',ARRAY[6],ARRAY[8],'Se inicia el desarrollo web, presentando uno o dos apartados para la aprobacion del cliente.',p1,v_user_id),
  (8,11,'Dummy Web 1 - (Home) - Aprobacion',p_dev_basic,s_done,r_c,'2026-03-28',2,'2026-03-29',ARRAY[7],ARRAY[9],'El cliente debe de aprobar el dummy web inicial presentado.',p1,v_user_id),
  (9,12,'Dummy Web 2',p_dev_basic,s_doing,r_s,'2026-03-30',10,'2026-04-08',ARRAY[8],ARRAY[10],'Se desarrollan las demas paginas y secciones del dummy web.',p1,v_user_id),
  (10,13,'Dummy Web 2 - Aprobacion',p_dev_basic,s_on_hold,r_c,'2026-04-09',1,'2026-04-09',ARRAY[9],ARRAY[11,36,45],'El cliente debe de aprobar el dummy web restante.',p1,v_user_id),
  (36,14,'Blog - Desarrollo',p_dev_basic,s_done,r_s,'2026-04-10',3,'2026-04-12',ARRAY[10,44],ARRAY[37],'Configuracion y desarrollo de la seccion de Blog.',p1,v_user_id),
  (37,15,'Blog - Dar de Alta 3x Articulos',p_dev_basic,s_on_hold,r_s,'2026-04-13',1,'2026-04-13',ARRAY[36],ARRAY[11],'Se cargan X articulos de ejemplo para mostrar el funcionamiento del blog.',p1,v_user_id),
  (11,16,'Dummy Web 3',p_dev_basic,s_not_started,r_s,'2026-04-14',3,'2026-04-16',ARRAY[10,37],ARRAY[12],'Ajustes finales sobre el dummy web, tras haber creado modulo de Blog.',p1,v_user_id),
  (12,17,'Dummy Web 3 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-04-17',1,'2026-04-17',ARRAY[11],ARRAY[38,42],'Revision y validacion del dummy web, con el modulo de Blog.',p1,v_user_id),
  (38,18,'Blog - Capacitacion al Cliente',p_training,s_not_started,r_sc,'2026-04-18',1,'2026-04-18',ARRAY[12,44],ARRAY[39],'Sesion breve para explicar al cliente como crear, editar y publicar articulos dentro del blog.',p1,v_user_id),
  (39,19,'Blog - Cliente da de Alta Articulos',p_dev_basic,s_not_started,r_c,'2026-04-19',3,'2026-04-21',ARRAY[38],NULL,'El cliente comienza a cargar sus propios articulos en el blog.',p1,v_user_id),
  (45,20,'Proyectos - Desarrollo',p_dev_projects,s_done,r_s,'2026-04-10',5,'2026-04-14',ARRAY[10,25],ARRAY[26],'Configuracion y desarrollo de la seccion de Proyectos.',p1,v_user_id),
  (26,21,'Proyectos - Dar de Alta 3x Proyectos',p_dev_projects,s_done,r_s,'2026-04-15',1,'2026-04-15',ARRAY[45],ARRAY[27,42],'Se cargan X proyectos de ejemplo para mostrar el funcionamiento de los mismos.',p1,v_user_id),
  (42,22,'Dummy Web 4',p_dev_basic,s_not_started,r_s,'2026-04-18',3,'2026-04-20',ARRAY[12,26],ARRAY[43],'Ajustes finales sobre el dummy web, tras haber creado modulo de Proyectos.',p1,v_user_id),
  (43,23,'Dummy Web 4 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-04-21',1,'2026-04-21',ARRAY[42],ARRAY[27,41],'Revision y validacion del dummy web, con el modulo de Proyectos.',p1,v_user_id),
  (27,24,'Proyectos - Capacitacion al Cliente',p_training,s_not_started,r_sc,'2026-04-22',1,'2026-04-22',ARRAY[26,43],ARRAY[28],'Sesion breve para explicar al cliente como crear, editar y publicar proyectos.',p1,v_user_id),
  (28,25,'Proyectos - Cliente da de Alta Proyectos',p_dev_projects,s_not_started,r_c,'2026-04-23',3,'2026-04-25',ARRAY[27],NULL,'El cliente comienza a cargar sus propios proyectos.',p1,v_user_id),
  (41,26,'Dummy Web - Terminado',p_dev_basic,s_not_started,r_s,'2026-04-22',1,'2026-04-22',ARRAY[43],ARRAY[13],'Version preliminar del sitio dummy completamente funcional.',p1,v_user_id),
  (13,27,'Revision Final',p_review,s_not_started,r_sc,'2026-04-23',1,'2026-04-23',ARRAY[41],ARRAY[55],'Se hace una revision por parte del cliente y de Sharpen.Studio.',p1,v_user_id),
  (55,28,'Dummy Web - Aprobacion final',p_development,s_not_started,r_sc,'2026-04-24',1,'2026-04-24',ARRAY[13],ARRAY[18,19,20],'Aprobacion final del dummy web por parte del cliente.',p1,v_user_id),
  (18,29,'Clean Up / Respaldo Sitio en Desarrollo',p_cleanup,s_not_started,r_s,'2026-04-25',1,'2026-04-25',ARRAY[55],ARRAY[19],'Eliminar elementos temporales, multimedia, paginas, plugins, etc.',p1,v_user_id),
  (19,31,'SEO / WPO 1',p_seo,s_not_started,r_s,'2026-04-26',3,'2026-04-28',ARRAY[18,55],ARRAY[47],'SEO - meta tags, copy, etc.',p1,v_user_id),
  (47,33,'Respaldos y Autorizaciones',p_domain_svr,s_not_started,r_c,'2026-04-29',1,'2026-04-29',ARRAY[19],ARRAY[20],'Confirmacion de que el respaldo del sitio anterior fue generado correctamente.',p1,v_user_id),
  (20,38,'Configuracion de Servidor / Migracion',p_domain_svr,s_not_started,r_s,'2026-04-30',1,'2026-04-30',ARRAY[17,47,55],ARRAY[24],'Se prepara el servidor para la migracion del desarrollo.',p1,v_user_id),
  (24,40,'SEO / WPO 2',p_seo,s_not_started,r_s,'2026-05-01',1,'2026-05-01',ARRAY[20],ARRAY[50],'Configuracion restante de SEO, ligada al dominio final.',p1,v_user_id),
  (50,42,'Check Up Final / Desarrollo Terminado',p_dev_basic,s_not_started,r_sc,'2026-05-02',1,'2026-05-02',ARRAY[24],ARRAY[23],'Revision final del sitio para validar funcionamiento.',p1,v_user_id),
  (23,44,'Capacitacion Final',p_training,s_not_started,r_sc,'2026-05-03',1,'2026-05-03',ARRAY[50],NULL,'Se capacita al cliente para la auto-administracion del sitio web.',p1,v_user_id);

  -- 1. liderality — Subtasks
  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=1;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Scope',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=2;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Look & Feel',false,true,false,v_user_id),
  (v_tid,2,'Branding',false,true,false,v_user_id),
  (v_tid,3,'Copy / Textos',false,true,false,v_user_id),
  (v_tid,4,'Multimedia / Fotos y Videos en YouTube',false,true,false,v_user_id),
  (v_tid,5,'Info de Contacto / Email, WhatsApp, etc.',false,true,false,v_user_id),
  (v_tid,6,'Legales',true,false,false,v_user_id),
  (v_tid,7,'Diversos',false,true,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=44;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Campos para crear template de Blog',true,false,false,v_user_id),
  (v_tid,2,'Contenidos (texto e imagenes) para dar de alta articulos de Blog',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=25;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Campos para crear template de Proyectos',false,false,true,v_user_id),
  (v_tid,2,'Contenidos (texto e imagenes) para dar de alta Proyectos',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=17;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Acceso al Dominio (GoDaddy, etc.)',true,false,false,v_user_id),
  (v_tid,2,'Acceso al panel de control del Servidor',true,false,false,v_user_id),
  (v_tid,3,'Acceso a Gmail (para Google Analytics y Google Search Console)',true,false,false,v_user_id),
  (v_tid,4,'Acceso a Traductor (Weglot)',false,true,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=7;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Instalacion de WordPress de acuerdo al idioma predeterminado',false,false,true,v_user_id),
  (v_tid,2,'Configuracion inicial de WordPress',false,false,true,v_user_id),
  (v_tid,3,'Instalar Plugins predeterminados',false,false,true,v_user_id),
  (v_tid,4,'Desarrollo de pagina inicial (Home)',false,false,true,v_user_id),
  (v_tid,5,'Revision de Accesibilidad (WCAG)',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=9;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Paginas segun Scope',false,false,true,v_user_id),
  (v_tid,2,'Configuracion de Formularios de Contacto',false,false,true,v_user_id),
  (v_tid,3,'Contacto - Gracias',false,false,true,v_user_id),
  (v_tid,4,'404',false,false,true,v_user_id),
  (v_tid,5,'Plantilla Elemailer',false,false,true,v_user_id),
  (v_tid,6,'Aviso de Cookies',false,false,true,v_user_id),
  (v_tid,7,'Formulario de Acceso y Registro a WP Admin',false,false,true,v_user_id),
  (v_tid,8,'Legales',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=36;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Creacion y configuracion inicial de Blog',false,false,true,v_user_id),
  (v_tid,2,'Diseno y desarrollo de Loop Item, Single, Archive y Resultados de Busqueda de Blog',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=45;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Creacion y configuracion inicial de Proyectos',false,false,true,v_user_id),
  (v_tid,2,'Diseno y desarrollo de Loop Item, Single, Archive y Resultados de Busqueda de Proyectos',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=13;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Verificacion de configuracion y envio de Formularios',true,false,false,v_user_id),
  (v_tid,2,'Verificacion de enlaces rotos',true,false,false,v_user_id),
  (v_tid,3,'Revision de diversas resoluciones (incluido movil real) y diversos navegadores',true,false,false,v_user_id),
  (v_tid,4,'Revision Cliente - VoBo',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=55;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Aprobacion de Sharpen.Studio',true,false,false,v_user_id),
  (v_tid,2,'Aprobacion del Cliente',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=18;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Eliminar Imagenes',true,false,false,v_user_id),
  (v_tid,2,'Anadir ALT a imagenes',true,false,false,v_user_id),
  (v_tid,3,'Eliminar Articulos de Blog y Paginas',true,false,false,v_user_id),
  (v_tid,4,'Eliminar Widgets',true,false,false,v_user_id),
  (v_tid,5,'Eliminar Plugins',true,false,false,v_user_id),
  (v_tid,6,'Actualizar Plugins',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=19;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Rank Math Setup',true,false,false,v_user_id),
  (v_tid,2,'Metatags',true,false,false,v_user_id),
  (v_tid,3,'Convertir imagenes a WEBP',true,false,false,v_user_id),
  (v_tid,4,'Optimizacion de DB',true,false,false,v_user_id),
  (v_tid,5,'Revision de Web Core Vitals',true,false,false,v_user_id),
  (v_tid,6,'Configurar Plugin de Cache',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=47;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Respaldo Sitio Anterior - Confirmado via Email por parte del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Respaldo Sitio Anterior - con Plugin',true,false,false,v_user_id),
  (v_tid,3,'Respaldo Sitio Anterior - HTML',true,false,false,v_user_id),
  (v_tid,4,'Autorizacion de Migracion - Via Email parte del Cliente',true,false,false,v_user_id),
  (v_tid,5,'Autorizacion de Migracion - Por RFV',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=20;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Configurar Dominio y Servidor del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Configurar Cuentas de E-mail',true,false,false,v_user_id),
  (v_tid,3,'SSL + Forzar SSL',true,false,false,v_user_id),
  (v_tid,4,'Migracion del Sitio Web',true,false,false,v_user_id),
  (v_tid,5,'Usuario del Cliente - Acceso y Configuracion de Perfil en WP',true,false,false,v_user_id),
  (v_tid,6,'Usuario del Cliente - Elementor',true,false,false,v_user_id),
  (v_tid,7,'Revisar Traductor',true,false,false,v_user_id),
  (v_tid,8,'Configurar SMTP',true,false,false,v_user_id),
  (v_tid,9,'Test de Funcionalidad Post-Migracion',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=24;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Local SEO',true,false,false,v_user_id),
  (v_tid,2,'Sitemap XML',true,false,false,v_user_id),
  (v_tid,3,'301',true,false,false,v_user_id),
  (v_tid,4,'404',true,false,false,v_user_id),
  (v_tid,5,'Google Search Console',true,false,false,v_user_id),
  (v_tid,6,'Google Analytics',true,false,false,v_user_id),
  (v_tid,7,'ReCaptcha',true,false,false,v_user_id),
  (v_tid,8,'Desactivar opcion Disuadir motores de busqueda',true,false,false,v_user_id),
  (v_tid,9,'Revision de Core Web Vitals',true,false,false,v_user_id),
  (v_tid,10,'Revision y reajustes en plugin de Cache',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p1 AND task_id=50;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Revision de botones y enlaces',true,false,false,v_user_id),
  (v_tid,2,'Revision de Destinatarios y Remitentes de Formularios en Sitio Web / Por parte del Sharpen.Studio',true,false,false,v_user_id),
  (v_tid,3,'Confirmacion via Email de Envio y Recepcion de Mensajes de Formularios / Por parte del Cliente',true,false,false,v_user_id);

  -- ============================================================
  -- 2. Viaker — Tasks
  -- ============================================================
  INSERT INTO tasks_main (task_id,task_sort,task_name,phase_id,status_id,responsible_id,start_date,days,end_date,depends_on_task_ids,dependencies_task_ids,task_comment,project_id,user_id) VALUES
  (1,1,'Kick-Off',p_kickoff,s_done,r_sc,'2026-03-09',1,'2026-03-09',NULL,ARRAY[2,17,25],'En la reunion de kick-off se discuten la estrategia de desarrollo, los plazos, el alcance y las tareas.',p2,v_user_id),
  (2,2,'Entregables (Contenidos Generales)',p_deliverables,s_done,r_c,'2026-03-10',7,'2026-03-16',ARRAY[1],ARRAY[3],'Entregables necesarios por parte del cliente para comenzar el desarrollo.',p2,v_user_id),
  (25,4,'Entregables (Productos)',p_deliverables,s_done,r_c,'2026-03-10',15,'2026-03-24',ARRAY[1],ARRAY[45],'Entrega de accesos, estructura y contenidos relacionados con la seccion de Productos.',p2,v_user_id),
  (17,5,'Entregables (Dominio/Servidor)',p_deliverables,s_on_hold,r_c,'2026-03-10',45,'2026-04-23',ARRAY[1],ARRAY[20],'El cliente debe entregar acceso al registro del dominio y servidor.',p2,v_user_id),
  (3,6,'Sitemap',p_dev_basic,s_done,r_s,'2026-03-17',1,'2026-03-17',ARRAY[2],ARRAY[4],'Se desarrolla el sitemap.',p2,v_user_id),
  (4,7,'Sitemap - Aprobacion',p_dev_basic,s_done,r_c,'2026-03-18',1,'2026-03-18',ARRAY[3],ARRAY[5],'El sitemap requiere aprobacion por parte del cliente.',p2,v_user_id),
  (5,8,'Dummy PDF',p_dev_basic,s_done,r_s,'2026-03-19',10,'2026-03-28',ARRAY[4],ARRAY[6],'Con el sitemap definido, se crea un dummy PDF o maqueta visual estatica.',p2,v_user_id),
  (6,9,'Dummy PDF - Aprobacion',p_dev_basic,s_done,r_c,'2026-03-29',2,'2026-03-30',ARRAY[5],ARRAY[7],'El cliente debe de aprobar el Dummy PDF.',p2,v_user_id),
  (7,10,'Dummy Web 1 - (Home)',p_dev_basic,s_done,r_s,'2026-03-31',15,'2026-04-14',ARRAY[6],ARRAY[8],'Se inicia el desarrollo web.',p2,v_user_id),
  (8,11,'Dummy Web 1 - (Home) - Aprobacion',p_dev_basic,s_done,r_c,'2026-04-15',1,'2026-04-15',ARRAY[7],ARRAY[9],'El cliente debe de aprobar el dummy web inicial.',p2,v_user_id),
  (9,12,'Dummy Web 2',p_dev_basic,s_on_hold,r_s,'2026-04-16',10,'2026-04-25',ARRAY[8],ARRAY[10],'Se desarrollan las demas paginas y secciones del dummy web.',p2,v_user_id),
  (10,13,'Dummy Web 2 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-04-26',1,'2026-04-26',ARRAY[9],ARRAY[11,45],'El cliente debe de aprobar el dummy web restante.',p2,v_user_id),
  (11,16,'Dummy Web 3',p_dev_basic,s_not_started,r_s,'2026-04-27',3,'2026-04-29',ARRAY[10],ARRAY[12],'Ajustes finales sobre el dummy web.',p2,v_user_id),
  (12,17,'Dummy Web 3 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-04-30',1,'2026-04-30',ARRAY[11],ARRAY[42],'Revision y validacion del dummy web.',p2,v_user_id),
  (45,20,'Productos - Desarrollo',p_dev_ecom,s_not_started,r_s,'2026-04-27',3,'2026-04-29',ARRAY[10,25],ARRAY[26],'Configuracion y desarrollo de la seccion de Productos.',p2,v_user_id),
  (26,21,'Productos - Dar de Alta 3x Productos',p_dev_ecom,s_not_started,r_s,'2026-04-30',1,'2026-04-30',ARRAY[45],ARRAY[27,42],'Se cargan X productos de ejemplo.',p2,v_user_id),
  (42,22,'Dummy Web 4',p_dev_basic,s_not_started,r_s,'2026-05-01',2,'2026-05-02',ARRAY[12,26],ARRAY[43],'Ajustes finales sobre el dummy web, tras haber creado modulo de Productos.',p2,v_user_id),
  (43,23,'Dummy Web 4 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-05-03',1,'2026-05-03',ARRAY[42],ARRAY[41],'Revision y validacion del dummy web, con el modulo de Productos.',p2,v_user_id),
  (27,24,'Productos - Capacitacion al Cliente',p_training,s_not_started,r_sc,'2026-05-01',1,'2026-05-01',ARRAY[26],ARRAY[28],'Sesion breve para explicar al cliente como gestionar productos.',p2,v_user_id),
  (28,25,'Productos - Cliente da de Alta Productos',p_dev_ecom,s_not_started,r_c,'2026-05-02',3,'2026-05-04',ARRAY[27],NULL,'El cliente comienza a cargar sus propios productos.',p2,v_user_id),
  (41,26,'Dummy Web - Terminado',p_dev_basic,s_not_started,r_s,'2026-05-04',1,'2026-05-04',ARRAY[43],ARRAY[13],'Version preliminar del sitio dummy completamente funcional.',p2,v_user_id),
  (13,27,'Revision Final',p_review,s_not_started,r_sc,'2026-05-05',1,'2026-05-05',ARRAY[41],ARRAY[55],'Se hace una revision por parte del cliente y de Sharpen.Studio.',p2,v_user_id),
  (55,28,'Dummy Web - Aprobacion final',p_development,s_not_started,r_sc,'2026-05-06',1,'2026-05-06',ARRAY[13],ARRAY[18,19,20],'Aprobacion final del dummy web.',p2,v_user_id),
  (18,29,'Clean Up / Respaldo Sitio en Desarrollo',p_cleanup,s_not_started,r_s,'2026-05-06',1,'2026-05-06',ARRAY[55],ARRAY[19],'Eliminar elementos temporales, multimedia, paginas, plugins, etc.',p2,v_user_id),
  (19,31,'SEO / WPO 1',p_seo,s_not_started,r_s,'2026-05-06',1,'2026-05-06',ARRAY[18,55],ARRAY[47],'SEO - meta tags, copy, etc.',p2,v_user_id),
  (47,33,'Respaldos y Autorizaciones',p_domain_svr,s_not_started,r_c,'2026-05-06',1,'2026-05-06',ARRAY[19],ARRAY[20],'Confirmacion de respaldo del sitio anterior.',p2,v_user_id),
  (20,38,'Configuracion de Servidor / Migracion',p_domain_svr,s_not_started,r_s,'2026-05-06',1,'2026-05-06',ARRAY[17,47,55],ARRAY[24],'Se prepara el servidor para la migracion del desarrollo.',p2,v_user_id),
  (24,40,'SEO / WPO 2',p_seo,s_not_started,r_s,'2026-05-06',1,'2026-05-06',ARRAY[20],ARRAY[50],'Configuracion restante de SEO.',p2,v_user_id),
  (50,42,'Check Up Final / Desarrollo Terminado',p_dev_basic,s_not_started,r_sc,'2026-05-06',1,'2026-05-06',ARRAY[24],ARRAY[23],'Revision final del sitio.',p2,v_user_id),
  (23,44,'Capacitacion Final',p_training,s_not_started,r_sc,'2026-05-06',1,'2026-05-06',ARRAY[50],NULL,'Se capacita al cliente para la auto-administracion del sitio web.',p2,v_user_id);

  -- 2. Viaker — Subtasks
  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=1;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Scope',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=2;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Look & Feel',false,false,true,v_user_id),
  (v_tid,2,'Branding',false,false,true,v_user_id),
  (v_tid,3,'Copy / Textos',false,false,true,v_user_id),
  (v_tid,4,'Multimedia / Fotos y Videos en YouTube',false,false,true,v_user_id),
  (v_tid,5,'Info de Contacto / Email, WhatsApp, etc.',false,false,true,v_user_id),
  (v_tid,6,'Legales',false,false,true,v_user_id),
  (v_tid,7,'Diversos',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=25;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Campos para crear template de Productos',false,false,true,v_user_id),
  (v_tid,2,'Contenidos (texto e imagenes) para dar de alta Productos',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=17;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Acceso al Dominio (GoDaddy, etc.)',true,false,false,v_user_id),
  (v_tid,2,'Acceso al panel de control del Servidor',true,false,false,v_user_id),
  (v_tid,3,'Acceso a Gmail (para Google Analytics y Google Search Console)',true,false,false,v_user_id),
  (v_tid,4,'Acceso a Traductor (Weglot)',true,false,false,v_user_id),
  (v_tid,5,'Acceso a Pasarelas de Pago (PayPal, Stripe, Mercado Pago, etc.)',true,false,false,v_user_id),
  (v_tid,6,'Acceso a Pasarela de Fletes para Envios',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=7;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Instalacion de WordPress de acuerdo al idioma predeterminado',false,false,true,v_user_id),
  (v_tid,2,'Configuracion inicial de WordPress',false,false,true,v_user_id),
  (v_tid,3,'Instalar Plugins predeterminados',false,false,true,v_user_id),
  (v_tid,4,'Desarrollo de pagina inicial (Home)',false,false,true,v_user_id),
  (v_tid,5,'Revision de Accesibilidad (WCAG)',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=9;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Paginas segun Scope',true,false,false,v_user_id),
  (v_tid,2,'Configuracion de Formularios de Contacto',true,false,false,v_user_id),
  (v_tid,3,'Contacto - Gracias',true,false,false,v_user_id),
  (v_tid,4,'404',true,false,false,v_user_id),
  (v_tid,5,'Plantilla Elemailer',true,false,false,v_user_id),
  (v_tid,6,'Aviso de Cookies',true,false,false,v_user_id),
  (v_tid,7,'Formulario de Acceso y Registro a WP Admin',true,false,false,v_user_id),
  (v_tid,8,'Legales',true,false,false,v_user_id),
  (v_tid,9,'Configuracion de Ajustes de WooCommerce',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=45;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Creacion y configuracion inicial de Productos',true,false,false,v_user_id),
  (v_tid,2,'Creacion de Taxonomias: Categorias, Variables, Etiquetas, Marcas',true,false,false,v_user_id),
  (v_tid,3,'Diseno y desarrollo de Loop Item, Single, Archive, Tienda y Busqueda de Productos',true,false,false,v_user_id),
  (v_tid,4,'Diseno y desarrollo de paginas de Mi Cuenta, Carrito y Finalizar Compra',true,false,false,v_user_id),
  (v_tid,5,'Configuracion de Pasarelas de Pago',true,false,false,v_user_id),
  (v_tid,6,'Configuracion de Pasarela de Fletes para Envio',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=13;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Verificacion de configuracion y envio de Formularios',true,false,false,v_user_id),
  (v_tid,2,'Verificacion de enlaces rotos',true,false,false,v_user_id),
  (v_tid,3,'Revision de diversas resoluciones (incluido movil real) y diversos navegadores',true,false,false,v_user_id),
  (v_tid,4,'Revision Cliente - VoBo',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=55;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Aprobacion de Sharpen.Studio',true,false,false,v_user_id),
  (v_tid,2,'Aprobacion del Cliente',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=18;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Eliminar Imagenes',true,false,false,v_user_id),
  (v_tid,2,'Anadir ALT a imagenes',true,false,false,v_user_id),
  (v_tid,3,'Eliminar Articulos de Blog y Paginas',true,false,false,v_user_id),
  (v_tid,4,'Eliminar Widgets',true,false,false,v_user_id),
  (v_tid,5,'Eliminar Plugins',true,false,false,v_user_id),
  (v_tid,6,'Actualizar Plugins',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=19;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Rank Math Setup',true,false,false,v_user_id),
  (v_tid,2,'Metatags',true,false,false,v_user_id),
  (v_tid,3,'Convertir imagenes a WEBP',true,false,false,v_user_id),
  (v_tid,4,'Optimizacion de DB',true,false,false,v_user_id),
  (v_tid,5,'Revision de Web Core Vitals',true,false,false,v_user_id),
  (v_tid,6,'Configurar Plugin de Cache',true,false,false,v_user_id),
  (v_tid,7,'Establecer que no haya cache en paginas de Carrito, Finalizar Compra y Mi Cuenta',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=47;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Respaldo Sitio Anterior - Confirmado via Email por parte del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Respaldo Sitio Anterior - con Plugin',true,false,false,v_user_id),
  (v_tid,3,'Respaldo Sitio Anterior - HTML',true,false,false,v_user_id),
  (v_tid,4,'Autorizacion de Migracion - Via Email parte del Cliente',true,false,false,v_user_id),
  (v_tid,5,'Autorizacion de Migracion - Por RFV',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=20;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Configurar Dominio y Servidor del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Configurar Cuentas de E-mail',true,false,false,v_user_id),
  (v_tid,3,'SSL + Forzar SSL',true,false,false,v_user_id),
  (v_tid,4,'Migracion del Sitio Web',true,false,false,v_user_id),
  (v_tid,5,'Usuario del Cliente - Acceso y Configuracion de Perfil en WP',true,false,false,v_user_id),
  (v_tid,6,'Usuario del Cliente - Elementor',true,false,false,v_user_id),
  (v_tid,7,'Revisar Traductor',true,false,false,v_user_id),
  (v_tid,8,'Revision de Pasarelas de Pago y de Envio',true,false,false,v_user_id),
  (v_tid,9,'Configurar SMTP',true,false,false,v_user_id),
  (v_tid,10,'Test de Funcionalidad Post-Migracion',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=24;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Local SEO',true,false,false,v_user_id),
  (v_tid,2,'Sitemap XML',true,false,false,v_user_id),
  (v_tid,3,'301',true,false,false,v_user_id),
  (v_tid,4,'404',true,false,false,v_user_id),
  (v_tid,5,'Google Search Console',true,false,false,v_user_id),
  (v_tid,6,'Google Analytics',true,false,false,v_user_id),
  (v_tid,7,'ReCaptcha',true,false,false,v_user_id),
  (v_tid,8,'Desactivar opcion Disuadir motores de busqueda',true,false,false,v_user_id),
  (v_tid,9,'Revision de Core Web Vitals',true,false,false,v_user_id),
  (v_tid,10,'Revision y reajustes en plugin de Cache',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p2 AND task_id=50;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Revision de botones y enlaces',true,false,false,v_user_id),
  (v_tid,2,'Revision de Destinatarios y Remitentes de Formularios en Sitio Web',true,false,false,v_user_id),
  (v_tid,3,'Confirmacion via Email de Envio y Recepcion de Mensajes de Formularios / Por parte del Cliente',true,false,false,v_user_id);

  -- ============================================================
  -- 1. PHIXWAVE — Tasks
  -- ============================================================
  INSERT INTO tasks_main (task_id,task_sort,task_name,phase_id,status_id,responsible_id,start_date,days,end_date,depends_on_task_ids,dependencies_task_ids,task_comment,project_id,user_id) VALUES
  (1,1,'Kick-Off',p_kickoff,s_done,r_sc,'2026-04-29',1,'2026-04-29',NULL,ARRAY[2,17,44],'En la reunion de kick-off se discuten la estrategia de desarrollo.',p3,v_user_id),
  (2,2,'Entregables (Contenidos Generales)',p_deliverables,s_doing,r_c,'2026-04-30',7,'2026-05-06',ARRAY[1],ARRAY[3],'Entregables necesarios por parte del cliente para comenzar el desarrollo.',p3,v_user_id),
  (44,3,'Entregables (Blog)',p_deliverables,s_done,r_c,'2026-04-30',15,'2026-05-14',ARRAY[1],ARRAY[36,38],'Entrega de accesos, estructura y contenidos relacionados con la seccion de Blog.',p3,v_user_id),
  (17,5,'Entregables (Dominio/Servidor)',p_deliverables,s_on_hold,r_c,'2026-04-30',45,'2026-06-13',ARRAY[1],ARRAY[20],'El cliente debe entregar acceso al registro del dominio y servidor.',p3,v_user_id),
  (3,6,'Sitemap',p_dev_basic,s_done,r_s,'2026-05-07',1,'2026-05-07',ARRAY[2],ARRAY[4],'Se desarrolla el sitemap.',p3,v_user_id),
  (4,7,'Sitemap - Aprobacion',p_dev_basic,s_done,r_c,'2026-05-08',1,'2026-05-08',ARRAY[3],ARRAY[5],'El sitemap requiere aprobacion por parte del cliente.',p3,v_user_id),
  (5,8,'Dummy PDF',p_dev_basic,s_done,r_s,'2026-05-09',15,'2026-05-23',ARRAY[4],ARRAY[6],'Con el sitemap definido, se crea un dummy PDF.',p3,v_user_id),
  (6,9,'Dummy PDF - Aprobacion',p_dev_basic,s_done,r_c,'2026-05-24',1,'2026-05-24',ARRAY[5],ARRAY[7],'El cliente debe de aprobar el Dummy PDF.',p3,v_user_id),
  (7,10,'Dummy Web 1 - (Home)',p_dev_basic,s_done,r_s,'2026-05-25',15,'2026-06-08',ARRAY[6],ARRAY[8],'Se inicia el desarrollo web.',p3,v_user_id),
  (8,11,'Dummy Web 1 - (Home) - Aprobacion',p_dev_basic,s_done,r_c,'2026-06-09',1,'2026-06-09',ARRAY[7],ARRAY[9],'El cliente debe de aprobar el dummy web inicial.',p3,v_user_id),
  (9,12,'Dummy Web 2',p_dev_basic,s_doing,r_s,'2026-06-10',10,'2026-06-19',ARRAY[8],ARRAY[10],'Se desarrollan las demas paginas y secciones del dummy web.',p3,v_user_id),
  (10,13,'Dummy Web 2 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-06-19',1,'2026-06-19',ARRAY[9],ARRAY[11,36],'El cliente debe de aprobar el dummy web restante.',p3,v_user_id),
  (36,14,'Blog - Desarrollo',p_dev_basic,s_not_started,r_s,'2026-06-20',2,'2026-06-21',ARRAY[10,44],ARRAY[37],'Configuracion y desarrollo de la seccion de Blog.',p3,v_user_id),
  (37,15,'Blog - Dar de Alta 3x Articulos',p_dev_basic,s_not_started,r_s,'2026-06-22',1,'2026-06-22',ARRAY[36],ARRAY[11],'Se cargan X articulos de ejemplo.',p3,v_user_id),
  (11,16,'Dummy Web 3',p_dev_basic,s_not_started,r_s,'2026-06-23',5,'2026-06-27',ARRAY[10,37],ARRAY[12],'Ajustes finales sobre el dummy web.',p3,v_user_id),
  (12,17,'Dummy Web 3 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-06-28',1,'2026-06-28',ARRAY[11],ARRAY[38,41],'Revision y validacion del dummy web.',p3,v_user_id),
  (38,18,'Blog - Capacitacion al Cliente',p_training,s_not_started,r_sc,'2026-06-28',1,'2026-06-28',ARRAY[12,44],ARRAY[39],'Sesion breve para explicar al cliente como publicar articulos.',p3,v_user_id),
  (39,19,'Blog - Cliente da de Alta Articulos',p_dev_basic,s_not_started,r_c,'2026-06-28',1,'2026-06-28',ARRAY[38],NULL,'El cliente comienza a cargar sus propios articulos.',p3,v_user_id),
  (41,26,'Dummy Web - Terminado',p_dev_basic,s_not_started,r_s,'2026-06-29',1,'2026-06-29',ARRAY[12],ARRAY[13],'Version preliminar del sitio dummy completamente funcional.',p3,v_user_id),
  (13,27,'Revision Final',p_review,s_not_started,r_sc,'2026-06-30',1,'2026-06-30',ARRAY[41],ARRAY[55],'Se hace una revision por parte del cliente y de Sharpen.Studio.',p3,v_user_id),
  (55,28,'Dummy Web - Aprobacion final',p_development,s_not_started,r_sc,'2026-07-01',1,'2026-07-01',ARRAY[13],ARRAY[18,19,20],'Aprobacion final del dummy web.',p3,v_user_id),
  (18,29,'Clean Up / Respaldo Sitio en Desarrollo',p_cleanup,s_not_started,r_s,'2026-07-02',1,'2026-07-02',ARRAY[55],ARRAY[19],'Eliminar elementos temporales, multimedia, paginas, plugins, etc.',p3,v_user_id),
  (19,31,'SEO / WPO 1',p_seo,s_not_started,r_s,'2026-07-03',1,'2026-07-03',ARRAY[18,55],ARRAY[47],'SEO - meta tags, copy, etc.',p3,v_user_id),
  (47,33,'Respaldos y Autorizaciones',p_domain_svr,s_not_started,r_c,'2026-07-03',1,'2026-07-03',ARRAY[19],ARRAY[20],'Confirmacion de respaldo del sitio anterior.',p3,v_user_id),
  (20,38,'Configuracion de Servidor / Migracion',p_domain_svr,s_not_started,r_s,'2026-07-04',1,'2026-07-04',ARRAY[17,47,55],ARRAY[24],'Se prepara el servidor para la migracion del desarrollo.',p3,v_user_id),
  (24,40,'SEO / WPO 2',p_seo,s_not_started,r_s,'2026-07-04',1,'2026-07-04',ARRAY[20],ARRAY[50],'Configuracion restante de SEO.',p3,v_user_id),
  (50,42,'Check Up Final / Desarrollo Terminado',p_dev_basic,s_not_started,r_sc,'2026-07-05',1,'2026-07-05',ARRAY[24],ARRAY[23],'Revision final del sitio.',p3,v_user_id),
  (23,44,'Capacitacion Final',p_training,s_not_started,r_sc,'2026-07-05',1,'2026-07-05',ARRAY[50],NULL,'Se capacita al cliente para la auto-administracion del sitio web.',p3,v_user_id);

  -- 1. PHIXWAVE — Subtasks
  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=1;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Scope',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=2;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Look & Feel',false,true,false,v_user_id),
  (v_tid,2,'Branding',false,true,false,v_user_id),
  (v_tid,3,'Copy / Textos',false,true,false,v_user_id),
  (v_tid,4,'Multimedia / Fotos y Videos en YouTube',false,true,false,v_user_id),
  (v_tid,5,'Info de Contacto / Email, WhatsApp, etc.',false,true,false,v_user_id),
  (v_tid,6,'Legales',true,false,false,v_user_id),
  (v_tid,7,'Diversos',false,true,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=44;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Campos para crear template de Blog',false,false,true,v_user_id),
  (v_tid,2,'Contenidos (texto e imagenes) para dar de alta articulos de Blog',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=17;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Acceso al Dominio (GoDaddy, etc.)',true,false,false,v_user_id),
  (v_tid,2,'Acceso al panel de control del Servidor',true,false,false,v_user_id),
  (v_tid,3,'Acceso a Gmail (para Google Analytics y Google Search Console)',true,false,false,v_user_id),
  (v_tid,4,'Acceso a Traductor (Weglot)',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=7;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Instalacion de WordPress de acuerdo al idioma predeterminado',false,false,true,v_user_id),
  (v_tid,2,'Configuracion inicial de WordPress',false,false,true,v_user_id),
  (v_tid,3,'Instalar Plugins predeterminados',false,false,true,v_user_id),
  (v_tid,4,'Desarrollo de pagina inicial (Home)',false,false,true,v_user_id),
  (v_tid,5,'Revision de Accesibilidad (WCAG)',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=9;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Paginas segun Scope',true,false,false,v_user_id),
  (v_tid,2,'Configuracion de Formularios de Contacto',true,false,false,v_user_id),
  (v_tid,3,'Contacto - Gracias',true,false,false,v_user_id),
  (v_tid,4,'404',true,false,false,v_user_id),
  (v_tid,5,'Plantilla Elemailer',true,false,false,v_user_id),
  (v_tid,6,'Aviso de Cookies',true,false,false,v_user_id),
  (v_tid,7,'Formulario de Acceso y Registro a WP Admin',true,false,false,v_user_id),
  (v_tid,8,'Legales',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=36;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Creacion y configuracion inicial de Blog',true,false,false,v_user_id),
  (v_tid,2,'Diseno y desarrollo de Loop Item, Single, Archive y Resultados de Busqueda de Blog',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=13;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Verificacion de configuracion y envio de Formularios',true,false,false,v_user_id),
  (v_tid,2,'Verificacion de enlaces rotos',true,false,false,v_user_id),
  (v_tid,3,'Revision de diversas resoluciones (incluido movil real) y diversos navegadores',true,false,false,v_user_id),
  (v_tid,4,'Revision Cliente - VoBo',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=55;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Aprobacion de Sharpen.Studio',true,false,false,v_user_id),
  (v_tid,2,'Aprobacion del Cliente',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=18;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Eliminar Imagenes',true,false,false,v_user_id),
  (v_tid,2,'Anadir ALT a imagenes',true,false,false,v_user_id),
  (v_tid,3,'Eliminar Articulos de Blog y Paginas',true,false,false,v_user_id),
  (v_tid,4,'Eliminar Widgets',true,false,false,v_user_id),
  (v_tid,5,'Eliminar Plugins',true,false,false,v_user_id),
  (v_tid,6,'Actualizar Plugins',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=19;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Rank Math Setup',true,false,false,v_user_id),
  (v_tid,2,'Metatags',true,false,false,v_user_id),
  (v_tid,3,'Convertir imagenes a WEBP',true,false,false,v_user_id),
  (v_tid,4,'Optimizacion de DB',true,false,false,v_user_id),
  (v_tid,5,'Revision de Web Core Vitals',true,false,false,v_user_id),
  (v_tid,6,'Configurar Plugin de Cache',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=47;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Respaldo Sitio Anterior - Confirmado via Email por parte del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Respaldo Sitio Anterior - con Plugin',true,false,false,v_user_id),
  (v_tid,3,'Respaldo Sitio Anterior - HTML',true,false,false,v_user_id),
  (v_tid,4,'Autorizacion de Migracion - Via Email parte del Cliente',true,false,false,v_user_id),
  (v_tid,5,'Autorizacion de Migracion - Por RFV',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=20;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Configurar Dominio y Servidor del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Configurar Cuentas de E-mail',true,false,false,v_user_id),
  (v_tid,3,'SSL + Forzar SSL',true,false,false,v_user_id),
  (v_tid,4,'Migracion del Sitio Web',true,false,false,v_user_id),
  (v_tid,5,'Usuario del Cliente - Acceso y Configuracion de Perfil en WP',true,false,false,v_user_id),
  (v_tid,6,'Usuario del Cliente - Elementor',true,false,false,v_user_id),
  (v_tid,7,'Revisar Traductor',true,false,false,v_user_id),
  (v_tid,8,'Configurar SMTP',true,false,false,v_user_id),
  (v_tid,9,'Test de Funcionalidad Post-Migracion',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=24;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Local SEO',true,false,false,v_user_id),
  (v_tid,2,'Sitemap XML',true,false,false,v_user_id),
  (v_tid,3,'301',true,false,false,v_user_id),
  (v_tid,4,'404',true,false,false,v_user_id),
  (v_tid,5,'Google Search Console',true,false,false,v_user_id),
  (v_tid,6,'Google Analytics',true,false,false,v_user_id),
  (v_tid,7,'ReCaptcha',true,false,false,v_user_id),
  (v_tid,8,'Desactivar opcion Disuadir motores de busqueda',true,false,false,v_user_id),
  (v_tid,9,'Revision de Core Web Vitals',true,false,false,v_user_id),
  (v_tid,10,'Revision y reajustes en plugin de Cache',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p3 AND task_id=50;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Revision de botones y enlaces',true,false,false,v_user_id),
  (v_tid,2,'Revision de Destinatarios y Remitentes de Formularios en Sitio Web',true,false,false,v_user_id),
  (v_tid,3,'Confirmacion via Email de Envio y Recepcion de Mensajes de Formularios / Por parte del Cliente',true,false,false,v_user_id);

  -- ============================================================
  -- 1. Medrano — Tasks
  -- ============================================================
  INSERT INTO tasks_main (task_id,task_sort,task_name,phase_id,status_id,responsible_id,start_date,days,end_date,depends_on_task_ids,dependencies_task_ids,task_comment,project_id,user_id) VALUES
  (1,1,'Kick-Off',p_kickoff,s_done,r_sc,'2026-04-21',1,'2026-04-21',NULL,ARRAY[2,3,17,25,44],'En la reunion de kick-off se discuten la estrategia de desarrollo.',p4,v_user_id),
  (2,2,'Entregables (Contenidos Generales)',p_deliverables,s_done,r_c,'2026-04-22',7,'2026-04-28',ARRAY[1],NULL,'Entregables necesarios por parte del cliente para comenzar el desarrollo.',p4,v_user_id),
  (44,3,'Entregables (Blog)',p_deliverables,s_done,r_c,'2026-04-22',15,'2026-05-06',ARRAY[1],ARRAY[36,38],'Entrega de accesos, estructura y contenidos relacionados con la seccion de Blog.',p4,v_user_id),
  (25,4,'Entregables (Proyectos)',p_deliverables,s_done,r_c,'2026-04-22',15,'2026-05-06',ARRAY[1],ARRAY[45],'Entrega de accesos, estructura y contenidos relacionados con la seccion de Proyectos.',p4,v_user_id),
  (17,5,'Entregables (Dominio/Servidor)',p_deliverables,s_on_hold,r_c,'2026-04-22',45,'2026-06-05',ARRAY[1],ARRAY[20],'El cliente debe entregar acceso al registro del dominio y servidor.',p4,v_user_id),
  (3,6,'Sitemap',p_dev_basic,s_done,r_s,'2026-04-22',3,'2026-04-24',ARRAY[1],ARRAY[4],'Se desarrolla el sitemap.',p4,v_user_id),
  (4,7,'Sitemap - Aprobacion',p_dev_basic,s_done,r_c,'2026-04-25',1,'2026-04-25',ARRAY[3],ARRAY[5],'El sitemap requiere aprobacion por parte del cliente.',p4,v_user_id),
  (5,8,'Dummy PDF',p_dev_basic,s_done,r_s,'2026-04-26',15,'2026-05-10',ARRAY[4],ARRAY[6],'Con el sitemap definido, se crea un dummy PDF.',p4,v_user_id),
  (6,9,'Dummy PDF - Aprobacion',p_dev_basic,s_done,r_c,'2026-05-11',2,'2026-05-12',ARRAY[5],ARRAY[7],'El cliente debe de aprobar el Dummy PDF.',p4,v_user_id),
  (7,10,'Dummy Web 1 - (Home)',p_dev_basic,s_done,r_s,'2026-05-13',15,'2026-05-27',ARRAY[6],ARRAY[8],'Se inicia el desarrollo web.',p4,v_user_id),
  (8,11,'Dummy Web 1 - (Home) - Aprobacion',p_dev_basic,s_done,r_c,'2026-05-28',2,'2026-05-29',ARRAY[7],ARRAY[9],'El cliente debe de aprobar el dummy web inicial.',p4,v_user_id),
  (9,12,'Dummy Web 2',p_dev_basic,s_doing,r_s,'2026-05-30',10,'2026-06-08',ARRAY[8],ARRAY[10],'Se desarrollan las demas paginas y secciones del dummy web.',p4,v_user_id),
  (10,13,'Dummy Web 2 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-06-09',1,'2026-06-09',ARRAY[9],ARRAY[11,36,45],'El cliente debe de aprobar el dummy web restante.',p4,v_user_id),
  (36,14,'Blog - Desarrollo',p_dev_basic,s_not_started,r_s,'2026-06-10',3,'2026-06-12',ARRAY[10,44],ARRAY[37],'Configuracion y desarrollo de la seccion de Blog.',p4,v_user_id),
  (37,15,'Blog - Dar de Alta 3x Articulos',p_dev_basic,s_not_started,r_s,'2026-06-13',1,'2026-06-13',ARRAY[36],ARRAY[11],'Se cargan X articulos de ejemplo.',p4,v_user_id),
  (11,16,'Dummy Web 3',p_dev_basic,s_not_started,r_s,'2026-06-14',3,'2026-06-16',ARRAY[10,37],ARRAY[12],'Ajustes finales sobre el dummy web.',p4,v_user_id),
  (12,17,'Dummy Web 3 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-06-17',1,'2026-06-17',ARRAY[11],ARRAY[38,42],'Revision y validacion del dummy web.',p4,v_user_id),
  (38,18,'Blog - Capacitacion al Cliente',p_training,s_not_started,r_sc,'2026-06-18',1,'2026-06-18',ARRAY[12,44],ARRAY[39],'Sesion breve para explicar al cliente como publicar articulos.',p4,v_user_id),
  (39,19,'Blog - Cliente da de Alta Articulos',p_dev_basic,s_not_started,r_c,'2026-06-19',3,'2026-06-21',ARRAY[38],NULL,'El cliente comienza a cargar sus propios articulos.',p4,v_user_id),
  (45,20,'Proyectos - Desarrollo',p_dev_projects,s_not_started,r_s,'2026-06-10',5,'2026-06-14',ARRAY[10,25],ARRAY[26],'Configuracion y desarrollo de la seccion de Proyectos.',p4,v_user_id),
  (26,21,'Proyectos - Dar de Alta 3x Proyectos',p_dev_projects,s_not_started,r_s,'2026-06-15',1,'2026-06-15',ARRAY[45],ARRAY[27,42],'Se cargan X proyectos de ejemplo.',p4,v_user_id),
  (42,22,'Dummy Web 4',p_dev_basic,s_not_started,r_s,'2026-06-18',3,'2026-06-20',ARRAY[12,26],ARRAY[43],'Ajustes finales sobre el dummy web, tras haber creado modulo de Proyectos.',p4,v_user_id),
  (43,23,'Dummy Web 4 - Aprobacion',p_dev_basic,s_not_started,r_c,'2026-06-21',1,'2026-06-21',ARRAY[42],ARRAY[27,41],'Revision y validacion del dummy web, con el modulo de Proyectos.',p4,v_user_id),
  (27,24,'Proyectos - Capacitacion al Cliente',p_training,s_not_started,r_sc,'2026-06-22',1,'2026-06-22',ARRAY[26,43],ARRAY[28],'Sesion breve para explicar al cliente como gestionar proyectos.',p4,v_user_id),
  (28,25,'Proyectos - Cliente da de Alta Proyectos',p_dev_projects,s_not_started,r_c,'2026-06-23',3,'2026-06-25',ARRAY[27],NULL,'El cliente comienza a cargar sus propios proyectos.',p4,v_user_id),
  (41,26,'Dummy Web - Terminado',p_dev_basic,s_not_started,r_s,'2026-06-22',1,'2026-06-22',ARRAY[43],ARRAY[13],'Version preliminar del sitio dummy completamente funcional.',p4,v_user_id),
  (13,27,'Revision Final',p_review,s_not_started,r_sc,'2026-06-23',1,'2026-06-23',ARRAY[41],ARRAY[55],'Se hace una revision por parte del cliente y de Sharpen.Studio.',p4,v_user_id),
  (55,28,'Dummy Web - Aprobacion final',p_development,s_not_started,r_sc,'2026-06-24',1,'2026-06-24',ARRAY[13],ARRAY[18,19,20],'Aprobacion final del dummy web.',p4,v_user_id),
  (18,29,'Clean Up / Respaldo Sitio en Desarrollo',p_cleanup,s_not_started,r_s,'2026-06-25',1,'2026-06-25',ARRAY[55],ARRAY[19],'Eliminar elementos temporales, multimedia, paginas, plugins, etc.',p4,v_user_id),
  (19,31,'SEO / WPO 1',p_seo,s_not_started,r_s,'2026-06-26',3,'2026-06-28',ARRAY[18,55],ARRAY[47],'SEO - meta tags, copy, etc.',p4,v_user_id),
  (47,33,'Respaldos y Autorizaciones',p_domain_svr,s_not_started,r_c,'2026-06-29',1,'2026-06-29',ARRAY[19],ARRAY[20],'Confirmacion de respaldo del sitio anterior.',p4,v_user_id),
  (20,38,'Configuracion de Servidor / Migracion',p_domain_svr,s_not_started,r_s,'2026-06-30',1,'2026-06-30',ARRAY[17,47,55],ARRAY[24],'Se prepara el servidor para la migracion del desarrollo.',p4,v_user_id),
  (24,40,'SEO / WPO 2',p_seo,s_not_started,r_s,'2026-07-01',1,'2026-07-01',ARRAY[20],ARRAY[50],'Configuracion restante de SEO.',p4,v_user_id),
  (50,42,'Check Up Final / Desarrollo Terminado',p_dev_basic,s_not_started,r_sc,'2026-07-02',1,'2026-07-02',ARRAY[24],ARRAY[23],'Revision final del sitio.',p4,v_user_id),
  (23,44,'Capacitacion Final',p_training,s_not_started,r_sc,'2026-07-03',1,'2026-07-03',ARRAY[50],NULL,'Se capacita al cliente para la auto-administracion del sitio web.',p4,v_user_id);

  -- 1. Medrano — Subtasks
  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=1;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Scope',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=2;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Look & Feel',false,false,true,v_user_id),
  (v_tid,2,'Branding',false,false,true,v_user_id),
  (v_tid,3,'Copy / Textos',false,false,true,v_user_id),
  (v_tid,4,'Multimedia / Fotos y Videos en YouTube',false,false,true,v_user_id),
  (v_tid,5,'Info de Contacto / Email, WhatsApp, etc.',false,false,true,v_user_id),
  (v_tid,6,'Legales',false,false,true,v_user_id),
  (v_tid,7,'Diversos',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=44;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Campos para crear template de Blog',false,false,true,v_user_id),
  (v_tid,2,'Contenidos (texto e imagenes) para dar de alta articulos de Blog',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=25;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Campos para crear template de Proyectos',false,false,true,v_user_id),
  (v_tid,2,'Contenidos (texto e imagenes) para dar de alta Proyectos',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=17;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Acceso al Dominio (GoDaddy, etc.)',true,false,false,v_user_id),
  (v_tid,2,'Acceso al panel de control del Servidor',true,false,false,v_user_id),
  (v_tid,3,'Acceso a Gmail (para Google Analytics y Google Search Console)',true,false,false,v_user_id),
  (v_tid,4,'Acceso a Traductor (Weglot)',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=7;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Instalacion de WordPress de acuerdo al idioma predeterminado',false,false,true,v_user_id),
  (v_tid,2,'Configuracion inicial de WordPress',false,false,true,v_user_id),
  (v_tid,3,'Instalar Plugins predeterminados',false,false,true,v_user_id),
  (v_tid,4,'Desarrollo de pagina inicial (Home)',false,false,true,v_user_id),
  (v_tid,5,'Revision de Accesibilidad (WCAG)',false,false,true,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=9;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Paginas segun Scope',true,false,false,v_user_id),
  (v_tid,2,'Configuracion de Formularios de Contacto',true,false,false,v_user_id),
  (v_tid,3,'Contacto - Gracias',true,false,false,v_user_id),
  (v_tid,4,'404',true,false,false,v_user_id),
  (v_tid,5,'Plantilla Elemailer',true,false,false,v_user_id),
  (v_tid,6,'Aviso de Cookies',true,false,false,v_user_id),
  (v_tid,7,'Formulario de Acceso y Registro a WP Admin',false,true,false,v_user_id),
  (v_tid,8,'Legales',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=36;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Creacion y configuracion inicial de Blog',true,false,false,v_user_id),
  (v_tid,2,'Diseno y desarrollo de Loop Item, Single, Archive y Resultados de Busqueda de Blog',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=45;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Creacion y configuracion inicial de Proyectos',true,false,false,v_user_id),
  (v_tid,2,'Diseno y desarrollo de Loop Item, Single, Archive y Resultados de Busqueda de Proyectos',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=13;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Verificacion de configuracion y envio de Formularios',true,false,false,v_user_id),
  (v_tid,2,'Verificacion de enlaces rotos',true,false,false,v_user_id),
  (v_tid,3,'Revision de diversas resoluciones (incluido movil real) y diversos navegadores',true,false,false,v_user_id),
  (v_tid,4,'Revision Cliente - VoBo',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=55;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Aprobacion de Sharpen.Studio',true,false,false,v_user_id),
  (v_tid,2,'Aprobacion del Cliente',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=18;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Eliminar Imagenes',true,false,false,v_user_id),
  (v_tid,2,'Anadir ALT a imagenes',true,false,false,v_user_id),
  (v_tid,3,'Eliminar Articulos de Blog y Paginas',true,false,false,v_user_id),
  (v_tid,4,'Eliminar Widgets',true,false,false,v_user_id),
  (v_tid,5,'Eliminar Plugins',true,false,false,v_user_id),
  (v_tid,6,'Actualizar Plugins',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=19;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Rank Math Setup',true,false,false,v_user_id),
  (v_tid,2,'Metatags',true,false,false,v_user_id),
  (v_tid,3,'Convertir imagenes a WEBP',true,false,false,v_user_id),
  (v_tid,4,'Optimizacion de DB',true,false,false,v_user_id),
  (v_tid,5,'Revision de Web Core Vitals',true,false,false,v_user_id),
  (v_tid,6,'Configurar Plugin de Cache',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=47;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Respaldo Sitio Anterior - Confirmado via Email por parte del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Respaldo Sitio Anterior - con Plugin',true,false,false,v_user_id),
  (v_tid,3,'Respaldo Sitio Anterior - HTML',true,false,false,v_user_id),
  (v_tid,4,'Autorizacion de Migracion - Via Email parte del Cliente',true,false,false,v_user_id),
  (v_tid,5,'Autorizacion de Migracion - Por RFV',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=20;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Configurar Dominio y Servidor del Cliente',true,false,false,v_user_id),
  (v_tid,2,'Configurar Cuentas de E-mail',true,false,false,v_user_id),
  (v_tid,3,'SSL + Forzar SSL',true,false,false,v_user_id),
  (v_tid,4,'Migracion del Sitio Web',true,false,false,v_user_id),
  (v_tid,5,'Usuario del Cliente - Acceso y Configuracion de Perfil en WP',true,false,false,v_user_id),
  (v_tid,6,'Usuario del Cliente - Elementor',true,false,false,v_user_id),
  (v_tid,7,'Revisar Traductor',true,false,false,v_user_id),
  (v_tid,8,'Configurar SMTP',true,false,false,v_user_id),
  (v_tid,9,'Test de Funcionalidad Post-Migracion',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=24;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Local SEO',true,false,false,v_user_id),
  (v_tid,2,'Sitemap XML',true,false,false,v_user_id),
  (v_tid,3,'301',true,false,false,v_user_id),
  (v_tid,4,'404',true,false,false,v_user_id),
  (v_tid,5,'Google Search Console',true,false,false,v_user_id),
  (v_tid,6,'Google Analytics',true,false,false,v_user_id),
  (v_tid,7,'ReCaptcha',true,false,false,v_user_id),
  (v_tid,8,'Desactivar opcion Disuadir motores de busqueda',true,false,false,v_user_id),
  (v_tid,9,'Revision de Core Web Vitals',true,false,false,v_user_id),
  (v_tid,10,'Revision y reajustes en plugin de Cache',true,false,false,v_user_id);

  SELECT id INTO v_tid FROM tasks_main WHERE project_id=p4 AND task_id=50;
  INSERT INTO tasks_sub(task_main_id,subtask_sort,subtask_name,not_started,doing,done,user_id) VALUES
  (v_tid,1,'Revision de botones y enlaces',true,false,false,v_user_id),
  (v_tid,2,'Revision de Destinatarios y Remitentes de Formularios en Sitio Web',true,false,false,v_user_id),
  (v_tid,3,'Confirmacion via Email de Envio y Recepcion de Mensajes de Formularios / Por parte del Cliente',true,false,false,v_user_id);

END $$;
