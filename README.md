# Książka Korespondencji

Cyfrowa wersja papierowego rejestru korespondencji przychodzącej i wychodzącej.
Dane trzymane w Firebase Firestore, odczyt pism ze zdjęć przez Gemini Vision API.

## 1. Wrzuć pliki na GitHub

1. Załóż nowe, **prywatne** repozytorium na GitHubie (np. `ksiazka-korespondencji`).
2. Wgraj do niego wszystkie pliki z tego folderu, zachowując strukturę
   (łącznie z ukrytym folderem `.github/workflows`).
3. Jeśli nazwiesz repo inaczej niż `ksiazka-korespondencji`, zmień to
   w pliku `vite.config.js` w linii `base: "/ksiazka-korespondencji/"`.

## 2. Załóż projekt Firebase

1. Wejdź na https://console.firebase.google.com i utwórz nowy projekt.
2. W menu po lewej wybierz **Firestore Database** → **Utwórz bazę danych**
   → tryb produkcyjny (reguły zabezpieczeń poniżej).
3. W **Ustawienia projektu → Ogólne → Twoje aplikacje** dodaj aplikację
   webową (ikona `</>`) i skopiuj z niej wartości: `apiKey`, `authDomain`,
   `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

### Reguły Firestore (na start)

W zakładce **Firestore → Reguły** wklej (proste, bez logowania — do zmiany,
jeśli chcesz ograniczyć dostęp):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 3. Zdobądź klucz Gemini API

1. Wejdź na https://aistudio.google.com/app/apikey.
2. Utwórz nowy klucz API i skopiuj go.

## 4. Dodaj sekrety w repozytorium GitHub

W repo: **Settings → Secrets and variables → Actions → New repository secret**,
dodaj po kolei:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GEMINI_API_KEY`

## 5. Włącz GitHub Pages

**Settings → Pages → Source** ustaw na **GitHub Actions**.

## 6. Gotowe

Każdy push do gałęzi `main` uruchomi workflow z `.github/workflows/deploy.yml`,
zbuduje aplikację i wystawi ją pod adresem:

```
https://<twoj-login>.github.io/ksiazka-korespondencji/
```

## Struktura danych w Firestore

Dla każdego miesiąca i kierunku tworzona jest osobna kolekcja, np.:

```
korespondencja_2026_06_incoming
korespondencja_2026_06_outgoing
korespondencja_2026_07_incoming
...
```

Każdy dokument w kolekcji to jeden wiersz z rejestru (pola takie jak w
papierowej książce: data, nr, od/do kogo, treść, uwagi itd.).
