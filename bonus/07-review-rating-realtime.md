# Sequence 07 - Comment, Rating and Realtime Update

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial", "signalColor": "#111827", "signalTextColor": "#111827", "actorBkg": "#dbeafe", "actorBorder": "#111827", "actorLineColor": "#111827", "boundaryBkg": "#fef3c7", "boundaryBorder": "#111827", "controlBkg": "#dcfce7", "controlBorder": "#111827", "databaseBkg": "#ede9fe", "databaseBorder": "#111827", "activationBkgColor": "#bfdbfe", "activationBorderColor": "#111827", "labelBoxBkgColor": "#e5e7eb", "labelBoxBorderColor": "#111827"}}}%%
sequenceDiagram
    actor Visitor
    actor Customer
    participant Browser as Browser - boundary
    participant Socket as Socket.IO - control
    participant API as Express API - control
    participant Review as Review Controller - control
    participant DB as PostgreSQL - database
    participant Redis as Redis Adapter - database

    Visitor->>Browser: Open product detail
    Browser->>API: GET /api/products/{id}/reviews?page=1
    API->>DB: Load product reviews and total
    DB-->>Browser: Review page
    Browser->>Socket: Connect and emit product:join
    Socket->>DB: Verify active product
    Socket-->>Browser: Join product room

    Visitor->>Browser: Submit comment and display name
    Browser->>API: POST /api/products/{id}/reviews + CSRF token
    API->>Review: Validate body, author and product
    Review->>DB: INSERT review
    DB-->>Review: Created review
    Review->>Socket: Emit product:review:new to room
    Socket->>Redis: Broadcast event between backend instances
    Redis-->>Socket: Deliver event to connected clients
    Socket-->>Browser: New review event
    API-->>Browser: 201 created review

    Customer->>Browser: Select 1-5 stars
    Browser->>API: POST /api/products/{id}/ratings + CSRF token
    API->>Review: Require customer and validate stars
    Review->>DB: INSERT or UPDATE rating
    DB-->>Review: Saved rating
    Review->>DB: Calculate average and count
    DB-->>Review: Rating aggregate
    Review->>Socket: Emit product:rating:updated
    Socket->>Redis: Broadcast rating event
    Redis-->>Socket: Deliver event to clients
    Socket-->>Browser: Updated rating aggregate
    API-->>Browser: Updated rating result
```

Related code: `frontend/public/js/product.js`, `src/controllers/reviewController.js`, `src/server.js`.

Note: comment does not require login; rating requires an authenticated customer and does not require purchase history.
