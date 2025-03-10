# GoatFocus - Extension Chrome de blocage de sites web

Une extension Chrome simple qui vous permet de bloquer l'accès à certains sites web selon un planning personnalisé de jours et d'heures. GoatFocus vous aide à rester concentré sur votre travail en éliminant les distractions.

## Fonctionnalités

- Bloquer l'accès à une liste de sites web configurable
- Ajouter rapidement le site actuel à la liste des sites bloqués avec un seul clic
- Définir des plages horaires de blocage qui s'appliquent à plusieurs jours simultanément
- Modifier facilement les plages horaires existantes
- Page de blocage motivante qui vous encourage à rester concentré
- Vérification des sites lors du changement d'onglet
- Interface intuitive avec un bouton "Enregistrer" toujours accessible

## Installation

1. Clonez ce dépôt ou téléchargez les fichiers
2. Ouvrez Chrome et accédez à `chrome://extensions/`
3. Activez le "Mode développeur" en haut à droite
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier contenant les fichiers de l'extension

## Utilisation

1. Cliquez sur l'icône de l'extension dans la barre d'outils de Chrome
2. Ajoutez les sites web que vous souhaitez bloquer:
   - Saisissez manuellement un domaine et cliquez sur "+"
   - OU cliquez sur le bouton "+" dans l'en-tête pour ajouter le site actuellement ouvert
3. Créez des plages horaires de blocage:
   - Sélectionnez les jours de la semaine concernés
   - Définissez les heures de début et de fin
   - Cliquez sur "Ajouter"
4. Cliquez sur "Enregistrer" pour appliquer les changements

Les sites bloqués seront automatiquement redirigés vers une page d'encouragement pendant les heures de blocage définies.

## Fonctionnalités avancées

- **Modification des plages**: Cliquez sur l'icône crayon à côté d'une plage horaire pour la modifier
- **Suppression**: Utilisez les boutons "×" pour supprimer des sites ou des plages horaires
- **Vérification en temps réel**: Les sites sont vérifiés lors des changements d'onglets et après la sauvegarde

## Structure des fichiers

- `manifest.json` : Configuration de l'extension
- `background.js` : Script principal (logique de blocage)
- `blocked.html` : Page de redirection pour les sites bloqués
- `popup/` : Contient les fichiers pour l'interface utilisateur
  - `popup.html` : Structure HTML de l'interface
  - `popup.css` : Styles CSS pour l'interface
  - `popup.js` : Logique JavaScript de l'interface
- `images/` : Contient les icônes de l'extension

## Personnalisation

Vous devrez fournir vos propres icônes pour l'extension dans le dossier `images/` :
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Stockage des données

Toutes les configurations sont stockées localement dans le navigateur et structurées comme suit :

```json
{
  "sites": ["facebook.com", "twitter.com", "youtube.com"],
  "timeGroups": [
    {
      "id": "l1oxc8fhej",
      "startTime": "09:00",
      "endTime": "12:00", 
      "days": ["monday", "tuesday", "thursday", "friday"]
    },
    {
      "id": "l1p9d3gke4",
      "startTime": "14:00",
      "endTime": "17:00",
      "days": ["monday", "thursday", "friday"]
    }
  ],
  "schedule": {
    "monday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "12:00"}],
    "wednesday": [],
    "thursday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "17:00"}],
    "saturday": [],
    "sunday": []
  }
}
```

Le format `schedule` est maintenu pour la compatibilité avec le service worker, mais le nouveau format `timeGroups` permet de visualiser et gérer les plages horaires par groupe de jours.