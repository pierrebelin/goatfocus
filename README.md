# GoatFocus - Extension Chrome de blocage de sites web

Une extension Chrome simple qui vous permet de bloquer l'accès à certains sites web selon un planning personnalisé de jours et d'heures.

## Fonctionnalités

- Bloquer l'accès à une liste de sites web configurable
- Définir des périodes de blocage par jour de la semaine
- Configurer plusieurs plages horaires pour chaque jour
- Fonctionne en arrière-plan sans notifications

## Installation

1. Clonez ce dépôt ou téléchargez les fichiers
2. Ouvrez Chrome et accédez à `chrome://extensions/`
3. Activez le "Mode développeur" en haut à droite
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier contenant les fichiers de l'extension

## Utilisation

1. Cliquez sur l'icône de l'extension dans la barre d'outils de Chrome
2. Ajoutez les sites web que vous souhaitez bloquer
3. Configurez les jours et les plages horaires pendant lesquels vous souhaitez que le blocage soit actif
4. Cliquez sur "Enregistrer" pour appliquer les modifications

## Structure des fichiers

- `manifest.json` : Configuration de l'extension
- `background.js` : Script principal (logique de blocage)
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