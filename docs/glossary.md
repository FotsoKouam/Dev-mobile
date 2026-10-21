# Glossaire du projet

Ce document fixe le vocabulaire commun de l'équipe. La colonne **Code** donne le nom à utiliser partout dans le code : classes, tables, routes, champs JSON. Les textes affichés à l'utilisateur restent en français.

Règle : si un mot n'est pas dans ce glossaire, on l'ajoute ici (par PR) **avant** de l'utiliser dans le code.

Les lignes marquées *(proposé)* n'ont pas encore été discutées par toute l'équipe.

---

## 1. Entités métier

| Français | Code (classe) | Table SQL | Définition |
|---|---|---|---|
| École | `School` | `schools` | Établissement géré par la plateforme (ex. Institut Universitaire Saint Jean). |
| Filière | `Program` | `programs` | Parcours d'une école (ISI, SRT, Gestion…). Appartient à **une seule** école. Ce n'est pas une matière : les matières sont des espaces. |
| Espace | `Space` | `spaces` | Regroupement de documents dans lequel l'IA cherche ses réponses. Deux types : institutionnel ou personnel (voir ci-dessous). |
| Document | `Document` | `documents` | Fichier importé dans un espace (PDF ou image). |
| Version de document | `DocumentVersion` | `document_versions` | Une version du fichier d'un document (v1, v2…). Remplacer un document crée une nouvelle version. |
| Passage | `Chunk` | `chunks` | Morceau de texte extrait d'une version de document, avec sa page et son vecteur (embedding). C'est l'unité que l'IA retrouve. |
| Utilisateur | `User` | `users` | Compte d'une personne (étudiant, personnel, administrateur, invité). |
| Rôle | `Role` | `roles` | Ensemble de permissions. 5 rôles système, plus des rôles personnalisés créés par un admin. |
| Permission | `Permission` (code texte) | — | Droit unitaire (ex. `add_document`). Liste en section 4. |
| Affectation | `Assignment` | `assignments` | Lien entre un utilisateur, un rôle, une école et (selon le rôle) une filière. |
| Partage d'espace | `SpaceShare` | `space_shares` | Partage explicite d'un espace institutionnel avec un invité. *(proposé)* |
| Conversation | `Conversation` | `conversations` | Fil de discussion d'un utilisateur dans un espace. À détailler plus tard. |
| Message | `Message` | `messages` | Question ou réponse dans une conversation. À détailler plus tard. |
| Citation | `Citation` | `citations` | Lien entre une réponse de l'IA et le passage (`Chunk`) qui la justifie. À détailler plus tard. |
| Journal d'audit | `AuditLog` | `audit_logs` | Trace des actions effectuées sur la plateforme (non-répudiation). |

### Les deux types d'espace

| | Espace institutionnel | Espace personnel |
|---|---|---|
| Code | `Space` avec `type = 'institutional'` | `Space` avec `type = 'personal'` |
| Créé par | un administrateur (portail web) | l'utilisateur lui-même (application mobile) |
| Rattachement | une filière (`programId` obligatoire) | aucune filière (`programId` vide), un propriétaire (`ownerId` obligatoire) |
| Visible par | les utilisateurs de la filière (et les invités avec partage explicite) | uniquement son propriétaire |
| Visible dans le portail admin | oui | **jamais** |

---

## 2. Relations

```
School  1 ── n  Program
Program 1 ── n  Space (institutional)
User    1 ── n  Space (personal, via ownerId)
Space   1 ── n  Document
Document 1 ── n DocumentVersion
DocumentVersion 1 ── n Chunk
User n ── n (Role, School, Program)   via Assignment
User (guest) n ── n Space             via SpaceShare
Conversation 1 ── n Message ;  Message 1 ── n Citation ;  Citation n ── 1 Chunk
```

---

## 3. Rôles et rattachement

| Français | Code du rôle | École | Filière | Accès |
|---|---|---|---|---|
| Administrateur plateforme | `platform_admin` | toutes | aucune | tout |
| Administrateur école | `school_admin` | une | toutes les filières de l'école | son école |
| Personnel | `staff` | une | une | espaces institutionnels de sa filière ; peut y ajouter des documents |
| Étudiant | `student` | une | une | espaces institutionnels de sa filière, en lecture (mobile uniquement) |
| Parent/invité | `guest` | une (ou aucune) | aucune | espaces partagés explicitement (mobile uniquement) |

Règles :
- Seuls les administrateurs créent des écoles, des filières et des espaces institutionnels.
- `student` et `guest` n'ont pas accès au portail web.
- Un administrateur n'est jamais rattaché à une filière précise.

---

## 4. Permissions (codes) *(proposé)*

| Français | Code |
|---|---|
| Gestion des écoles | `manage_schools` |
| Gestion des filières | `manage_programs` |
| Gestion des utilisateurs | `manage_users` |
| Gestion des rôles | `manage_roles` |
| Gestion des affectations | `manage_assignments` |
| Création d'espace institutionnel | `create_institutional_space` |
| Ajout de document à un espace institutionnel | `add_document` |
| Remplacement/suppression de document | `replace_or_delete_document` |
| Consultation du journal d'audit | `view_audit_log` |
| Accès à toutes les écoles | `access_all_schools` |

Pour le rôle `staff`, `replace_or_delete_document` ne s'applique qu'aux documents qu'il a lui-même ajoutés. *(proposé)*

---

## 5. Valeurs énumérées et libellés affichés

Les valeurs du code sont en anglais, en `snake_case`. Le libellé français est géré par les fichiers de traduction de l'interface.

| Énumération | Valeur (code) | Libellé affiché |
|---|---|---|
| `SchoolType` | `public` / `private` | Public / Privé |
| `SchoolStatus`, `ProgramStatus` | `active` / `inactive` | Actif / Inactif |
| `UserStatus` | `active` | Actif |
| | `inactive` | Inactif |
| | `suspended` | Suspendu |
| | `invited` | Invité (en attente) |
| `SpaceType` | `institutional` / `personal` | Institutionnel / Personnel |
| `DocumentStatus` | `pending` | En attente |
| | `ocr` | OCR |
| | `segmentation` | Segmentation |
| | `indexing` | Indexation |
| | `available` | Disponible |
| | `error` | Erreur |
| `DocumentFileType` | `pdf` / `scanned_pdf` / `image` | PDF / PDF scanné / Image |
| `AuthMethod` | `google` / `password` | Compte Google / Email et mot de passe |

Formats de fichiers acceptés : PDF et images (JPEG, PNG, HEIC). Aucun autre format dans le MVP.

---

## 6. Vocabulaire à éviter

| À ne pas utiliser | Utiliser |
|---|---|
| `Filiere`, `Track`, `Major`, `Department` | `Program` |
| `Classe`, `Class`, `Course` pour désigner un espace | `Space` |
| `Teacher`, `Professor`, `Employee` | `staff` |
| `Parent` seul | `guest` |
| `File` pour un document métier | `Document` (ou `DocumentVersion` pour le fichier) |
