# ADR 0003 : Modèle d'accès aux espaces

## Statut

Accepté (27 novembre 2026).

## Contexte

L'application mobile sert exclusivement à l'interaction conversationnelle (chat) avec l'assistant. L'utilisateur final ne choisit ni ne crée d'espace documentaire depuis le mobile.

Le cahier des charges (§4.7) impose que le filtre d'accès soit appliqué directement dans la requête de recherche documentaire, en amont de toute génération par le modèle. L'ancien modèle, reposant sur une distinction entre espaces institutionnels et personnels ainsi que sur une sélection manuelle par l'utilisateur, ne correspond plus au fonctionnement retenu.

## Décision

1. **Type d'espace unique** : suppression de la distinction entre espace institutionnel et espace personnel. Tous les espaces relèvent d'un modèle unique. La création, l'administration du contenu et la configuration des accès s'effectuent exclusivement via le portail web par les administrateurs. Il n'existe plus d'espace personnel.
2. **Rattachement à l'école** : chaque espace appartient obligatoirement à une école (`school_id`).
3. **Portée d'accès** : chaque espace définit une portée (`scope`) parmi : école, filière, rôle ou individuel, associée à une cible (`scope_target`) :
   - Portée école : accessible à tous les membres de l'école (cible vide) ;
   - Portée filière : accessible aux membres de la filière désignée par la cible ;
   - Portée rôle : accessible aux porteurs du rôle désigné par la cible ;
   - Portée individuel : aucun accès automatique par portée (cible vide).
4. **Adhésion explicite** : l'accès d'un utilisateur à un espace repose sur la portée automatique de l'espace ou sur un ajout explicite dans la table de liaison `space_members`.
5. **Règles d'exclusion** : aucune règle d'exclusion n'est mise en œuvre dans cette version.
6. **Périmètre mobile** : le mobile n'expose aucune liste d'espaces et aucune fonctionnalité de gestion de documents.

## Alternatives écartées

- **Espace rattaché à une filière seule avec duplication** : duplication d'un espace « Institutionnel » par filière entraînant une redondance massive des documents administratifs et transverses.
- **Espace transverse avec table de liaison espace ↔ filière** : complexité de modélisation et de requêtage disproportionnée par rapport au besoin.
- **Accès uniquement par `space_members`** : gestion administrative lourde nécessitant d'assigner manuellement chaque utilisateur, source fréquente d'oublis lors des arrivées ou inscriptions.
- **Accès uniquement par portée** : modèle trop rigide, rendant impossible l'accès des parents et des invités externes.

## Conséquences

- **Migration de schéma** : retrait des colonnes `type` et `owner_id` de la table `spaces`, suppression de la contrainte CHECK associée, ajout des colonnes `school_id`, `scope` et `scope_target`, et création de la table `space_members`. Cette migration fera l'objet d'un brief technique séparé.
- **Filtrage RAG** : le filtre de recherche RAG (à concevoir) calcule dynamiquement les espaces autorisés à chaque question posée côté backend, à partir des affectations actives de l'utilisateur et de ses entrées dans `space_members`.
- **Cycle de vie des accès** : la purge des entrées `space_members` est indispensable dès qu'un utilisateur est désactivé ou quitte l'établissement scolaire.
- **Reprise des données** : les espaces issus de l'ancien modèle (données de démonstration) doivent être migrés ou recréés conformément au nouveau schéma.
- **Mise à jour du seed** : le script de peuplement initial (`seed`) doit être aligné avec la nouvelle structure d'espaces et d'adhésions.

## Points ouverts

1. **Multi-appartenance** : un utilisateur peut-il appartenir simultanément à plusieurs écoles ? L'hypothèse retenue pour l'instant est non.
2. **Exclusion individuelle** : possibilité d'exclure un utilisateur spécifique d'un espace par ailleurs accessible via sa portée (fonctionnalité reportée).
3. **Suppression d'espace** : sort des documents associés à un espace supprimé (hors périmètre de cet ADR, la suppression reste logique).
