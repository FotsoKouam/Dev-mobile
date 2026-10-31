/**
 * Liste fixe des 10 permissions du système.
 * Les permissions ne sont PAS stockées dans une table dédiée :
 * elles sont une constante en code. Seuls les liens role ↔ permission
 * sont persistés dans `role_permissions`.
 */

export interface PermissionDefinition {
  code: string;
  label: string;
}

export const PERMISSIONS: PermissionDefinition[] = [
  { code: 'manage_schools', label: 'Gestion des écoles' },
  { code: 'manage_programs', label: 'Gestion des filières' },
  { code: 'manage_users', label: 'Gestion des utilisateurs' },
  { code: 'manage_roles', label: 'Gestion des rôles' },
  { code: 'manage_assignments', label: 'Gestion des affectations' },
  { code: 'create_institutional_space', label: 'Création d\'espace institutionnel' },
  { code: 'add_document', label: 'Ajout de document à un espace institutionnel' },
  { code: 'replace_or_delete_document', label: 'Remplacement/suppression de document' },
  { code: 'view_audit_log', label: 'Consultation du journal d\'audit' },
  { code: 'access_all_schools', label: 'Accès à toutes les écoles' },
];

export const ALL_PERMISSION_CODES: string[] = PERMISSIONS.map((p) => p.code);
