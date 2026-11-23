# Sequence 07 - Comment, Rating and Realtime Update

![Sequence diagram: review-rating-realtime ](./07-review-rating-realtime.svg)

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
actor "Visitor" as Visitor #DBEAFE
actor "Customer" as Customer #DBEAFE
boundary "Browser" as Browser #BFDBFE
control "Socket.IO" as Socket #DCFCE7
control "Express API" as API #DCFCE7
control "Review Controller" as Review #DCFCE7
database "PostgreSQL" as DB #EDE9FE
database "Redis Adapter" as Redis #EDE9FE
Visitor -> Browser : Open product detail
Browser -> API : GET /api/products/{id}/reviews?page=1
API -> DB : Load product reviews and total
DB --> API : Review page
API --> Browser : Review page
Browser -> Socket : Connect and emit product:join
Socket -> DB : Verify active product
Socket --> Browser : Join product room
Visitor -> Browser : Submit comment and display name
Browser -> API : POST /api/products/{id}/reviews + CSRF token
API -> Review : Validate body, author and product
Review -> DB : INSERT review
DB --> Review : Created review
Review -> Socket : Emit product:review:new to room
Socket -> Redis : Broadcast event between backend instances
Redis --> Socket : Deliver event to connected clients
Socket -> Browser : New review event
API --> Browser : 201 created review
Customer -> Browser : Select 1-5 stars
Browser -> API : POST /api/products/{id}/ratings + CSRF token
API -> Review : Require customer and validate stars
Review -> DB : INSERT or UPDATE rating
DB --> Review : Saved rating
Review -> DB : Calculate average and count
DB --> Review : Rating aggregate
Review -> Socket : Emit product:rating:updated
Socket -> Redis : Broadcast rating event
Redis --> Socket : Deliver event to clients
Socket -> Browser : Updated rating aggregate
API --> Browser : Updated rating result
@enduml
```

</details>

Related code: `frontend/public/js/product.js`, `src/controllers/reviewController.js`, `src/server.js`.

Note: comment does not require login; rating requires an authenticated customer and does not require purchase history.