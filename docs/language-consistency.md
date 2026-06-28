# Language pass

This branch adds a temporary global UI translation layer so the language switch affects modules that still contain hardcoded labels.

It keeps the existing language provider and saved preference, sets Spanish as the default for new users, updates the document language, and translates common CRM labels, actions, statuses, placeholders, and module names while the app is running.

Next step: replace hardcoded strings module by module with typed i18n keys.