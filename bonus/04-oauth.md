# Sequence 04 - Google/Facebook OAuth

![Sequence diagram: oauth ](./04-oauth.svg)

<details>
<summary>PlantUML source</summary>



```plantuml
@startuml
skinparam defaultFontName Arial
skinparam defaultFontSize 17
skinparam sequenceMessageAlign center
skinparam sequenceArrowThickness 1.5
skinparam ParticipantBorderColor #1F2937
skinparam ActorBorderColor #1F2937
skinparam LifeLineBorderColor #374151
skinparam LifeLineBackgroundColor #FFFFFF
actor "Customer" as Customer #DBEAFE
boundary "Browser" as Browser #BFDBFE
control "Express API" as API #DCFCE7
control "Passport" as Passport #DCFCE7
database "PostgreSQL" as DB #EDE9FE
database "Redis Session" as Session #EDE9FE
entity "Google or Facebook" as Provider #FEE2E2
Customer -> Browser : Click OAuth provider
Browser -> API : GET /api/auth/{provider}
API -> Passport : Check configured strategy
Passport --> Browser : Redirect to provider authorization
Browser -> Provider : Authorize account
Provider --> Browser : Redirect with callback code
Browser -> API : GET /api/auth/{provider}/callback
API -> Provider : Exchange code and load profile
Provider --> API : Provider id, email and display name
API -> DB : Find oauth_accounts by provider and provider_user_id
alt Existing linked account
DB --> API : Existing customer
else New provider account
API -> DB : Find or create user by email
API -> DB : Insert oauth_accounts link
DB --> API : Customer account
end
API -> Session : Create Passport session
API --> Browser : Redirect to /account
@enduml
```

</details>

Related code: `src/config/passport.js`, `src/controllers/authController.js`, `src/routes/authRoutes.js`.

Requirement: OAuth credentials and callback URLs must be configured in `.env` before demonstration.