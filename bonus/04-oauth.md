# Sequence 04 - Google/Facebook OAuth

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "signalColor": "#111827", "signalTextColor": "#111827", "actorBkg": "#dbeafe", "actorBorder": "#111827", "actorLineColor": "#111827", "boundaryBkg": "#fef3c7", "boundaryBorder": "#111827", "controlBkg": "#dcfce7", "controlBorder": "#111827", "databaseBkg": "#ede9fe", "databaseBorder": "#111827", "entityBkg": "#fee2e2", "entityBorder": "#111827", "activationBkgColor": "#bfdbfe", "activationBorderColor": "#111827", "labelBoxBkgColor": "#e5e7eb", "labelBoxBorderColor": "#111827"}}}%%
sequenceDiagram
    actor Customer
    participant Browser as Browser - boundary
    participant API as Express API - control
    participant Provider as Google or Facebook - entity
    participant Passport as Passport - control
    participant DB as PostgreSQL - database
    participant Session as Redis Session - database

    Customer->>Browser: Click OAuth provider
    Browser->>API: GET /api/auth/{provider}
    API->>Passport: Check configured strategy
    Passport-->>Browser: Redirect to provider authorization
    Browser->>Provider: Authorize account
    Provider-->>Browser: Redirect with callback code
    Browser->>API: GET /api/auth/{provider}/callback
    API->>Provider: Exchange code and load profile
    Provider-->>API: Provider id, email and display name
    API->>DB: Find oauth_accounts by provider and provider_user_id
    alt Existing linked account
        DB-->>API: Existing customer
    else New provider account
        API->>DB: Find or create user by email
        API->>DB: Insert oauth_accounts link
        DB-->>API: Customer account
    end
    API->>Session: Create Passport session
    API-->>Browser: Redirect to /account
```

Related code: `src/config/passport.js`, `src/controllers/authController.js`, `src/routes/authRoutes.js`.

Requirement: OAuth credentials and callback URLs must be configured in `.env` before demonstration.
