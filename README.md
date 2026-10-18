# Smart Library AI

Application PFA full-stack de bibliothèque intelligente : catalogue Project Gutenberg via Gutendex, résumés et QCM Mistral AI, favoris, commentaires, notes, classement et administration.

## Technologies

- Frontend : React, React Router, Axios, Tailwind CSS, lucide-react, Vite
- Backend : Node.js, Express, MySQL, mysql2, JWT, bcrypt
- Services : Gutendex, Mistral AI et ElevenLabs TTS (appels exclusivement côté backend)

## 1. Préparer MySQL avec XAMPP

1. Installer puis ouvrir XAMPP.
2. Démarrer **Apache** et **MySQL**.
3. Ouvrir `http://localhost/phpmyadmin`.
4. Aller dans **Importer**, choisir `database.sql`, puis exécuter.

Le script crée la base `smart_library_ai`, toutes les tables, les index, les relations et deux comptes de démonstration :

- Admin : `admin@smartlibrary.local` / `password`
- Utilisateur : `user@smartlibrary.local` / `password`

Changez ces mots de passe avant toute mise en ligne.

## 2. Configurer le backend

Dans PowerShell :

```powershell
Copy-Item backend/.env.example backend/.env
```

Éditer `backend/.env` :

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_library_ai
JWT_SECRET=une_longue_valeur_aleatoire_et_secrete
MISTRAL_API_KEY=your_key_here
MISTRAL_MODEL=mistral-small-latest
ELEVENLABS_API_KEY=your_new_elevenlabs_key_here
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=your_key_here
ELEVENLABS_TIMEOUT=120000
```

Les clés Mistral et ElevenLabs ne doivent jamais être ajoutées dans `frontend/.env`, le dépôt Git ou du code client. Toute clé publiée ou partagée doit être immédiatement révoquée et remplacée.

## 3. Configurer le frontend

```powershell
Copy-Item frontend/.env.example frontend/.env
```

Configuration par défaut :

```env
VITE_API_URL=http://localhost:5000/api
```

## 4. Installer et lancer

Depuis la racine du projet :

```powershell
npm run install:all
```

Ouvrir deux terminaux :

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Puis ouvrir `http://localhost:5173`.

## Synthèse vocale ElevenLabs

La lecture audio des résumés utilise directement l’API ElevenLabs depuis le backend Node.js :

- aucun Python ;
- aucun Docker ;
- modèle par défaut : `eleven_multilingual_v2` ;
- voix configurable avec `ELEVENLABS_VOICE_ID` ;
- sortie MP3 ;
- français, anglais et arabe selon la langue du profil ;
- cache local dans `backend/speech-cache`.

L’interface indique clairement que la voix est générée par intelligence artificielle.

## Architecture

```text
smart-library-ai/
├── backend/
│   ├── src/
│   │   ├── config/       # Pool MySQL
│   │   ├── middleware/   # JWT et contrôle admin
│   │   ├── utils/        # Gutendex, import transactionnel, Mistral
│   │   └── server.js     # API REST
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   └── pages/
│   └── .env.example
├── database.sql
└── README.md
```

## Fonctions principales

- Authentification JWT, mots de passe bcrypt, comptes bloqués et routes admin protégées
- Recherche, filtres et pagination des livres MySQL
- Import Gutendex transactionnel avec prévention des doublons
- Auteurs, catégories, formats de lecture et téléchargement
- Favoris, commentaires, notes et profil
- Résumé et quiz Mistral asynchrones avec fallback
- Attribution de points et classement hebdomadaire
- Conseiller de lecture basé uniquement sur le catalogue local
- Souhaits réservés aux utilisateurs ayant 50 points hebdomadaires
- Dashboard admin : statistiques, utilisateurs, commentaires, souhaits et import
- Notifications intégrées pour messages, souhaits, support et signalements
- Support utilisateur avec réponse administrateur
- Signalement des profils, commentaires et résumés communautaires
- Messagerie privée, groupes et salons publics liés aux livres
- Messages texte et audio, modification et suppression
- Création, modification et suppression des groupes par l’administrateur
- Résumés communautaires avec likes, vues, commentaires et traduction
- Profils publics, likes, vues, favoris et historique du classement

## Messagerie et notifications

- La cloche dans la navigation affiche les nouvelles notifications.
- La page `/messages` contient les conversations privées, les groupes et les salons publics.
- Un administrateur crée un groupe depuis le bouton `+` et peut fournir les identifiants des membres séparés par des virgules.
- Pour créer un salon public lié à un livre, renseigner son identifiant dans le champ **ID livre**.
- Les messages audio utilisent le microphone du navigateur. Le navigateur doit donc autoriser l’accès au microphone.
- Le support et les signalements sont traités dans **Administration → Support & signalements**.

## Production

Avant un déploiement :

- remplacer `JWT_SECRET` par une valeur longue et aléatoire ;
- changer les identifiants de démonstration ;
- limiter précisément `FRONTEND_URL` au domaine de production ;
- utiliser HTTPS et un utilisateur MySQL dédié avec des droits limités ;
- conserver les fichiers `.env` hors du contrôle de version ;
- lancer `npm run build` et servir `frontend/dist` avec un hébergeur statique.
