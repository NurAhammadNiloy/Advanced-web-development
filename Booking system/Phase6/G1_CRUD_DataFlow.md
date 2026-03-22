# G1 - CRUD Data Flow (Phase6 Booking System)

This document models the actual CRUD request/response flow implemented in Phase6.

Observed implementation sources:
- Frontend: public/resources.js, public/form.js
- Backend API: src/routes/resources.routes.js
- Validation: src/validators/resource.validators.js
- Service layer: src/services/log.service.js
- Database schema: db/init/001_create_resources.sql, db/init/002_create_logs.sql

## CREATE (C) - POST /api/resources

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js + resources.js)
    participant B as Backend Route (POST /api/resources)
    participant S as Service (log.service.js)
    participant DB as PostgreSQL

    U->>F: Fill form and click Create
    F->>F: Client-side validation (name/description format + length)
    F->>B: POST /api/resources\nJSON body: resourceName, resourceDescription, resourceAvailable, resourcePrice, resourcePriceUnit
    B->>B: express-validator checks request body

    alt Validation fails
        B-->>F: 400 Bad Request\n{ ok:false, errors:[...] }
        F-->>U: Show validation errors in form message
    else Validation passes
        B->>DB: INSERT INTO resources (...) RETURNING ...

        alt Duplicate resource name (unique index)
            DB-->>B: error code 23505
            B->>S: logEvent("Duplicate resource blocked (...)")
            S->>DB: INSERT INTO booking_log (...)
            B-->>F: 409 Conflict\n{ ok:false, error:"Duplicate resource name" }
            F-->>U: Show duplicate conflict message
        else Insert success
            DB-->>B: Inserted row
            B->>S: logEvent("Resource created (ID ...)")
            S->>DB: INSERT INTO booking_log (...)
            B-->>F: 201 Created\n{ ok:true, data:{...} }
            F->>F: onResourceActionSuccess() -> reload list
            F-->>U: Show success message and refreshed resource list
        end
    end
```

## READ (R) - GET /api/resources

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (resources.js)
    participant B as Backend Route (GET /api/resources)
    participant S as Service (log.service.js)
    participant DB as PostgreSQL

    U->>F: Open resources page / trigger refresh
    F->>B: GET /api/resources
    B->>DB: SELECT * FROM resources ORDER BY created_at DESC

    alt Query success
        DB-->>B: Rows
        B-->>F: 200 OK\n{ ok:true, data:[...] }
        F->>F: resourcesCache = data; renderResourceList(data)
        F-->>U: Resource list displayed/updated
    else Database error
        DB-->>B: SQL error
        B-->>F: 500 Internal Server Error\n{ ok:false, error:"Database error" }
        F->>F: console.error("Failed to load resources", ...)
        F-->>U: Empty list/fallback state
    end

    Note over S: No service-layer logging call is used in current READ ALL route.
```

## UPDATE (U) - PUT /api/resources/:id

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js + resources.js)
    participant B as Backend Route (PUT /api/resources/:id)
    participant S as Service (log.service.js)
    participant DB as PostgreSQL

    U->>F: Select resource, edit fields, click Update
    F->>F: Client-side validation + changed-field check

    alt Missing ID in frontend state
        F-->>U: "Update failed: missing resource ID"
    else ID exists
        F->>B: PUT /api/resources/:id\nJSON body with updated fields
        B->>B: Parse :id and run express-validator

        alt Invalid ID or validation fails
            B-->>F: 400 Bad Request\n{ ok:false, error|errors }
            F-->>U: Show validation/invalid input message
        else Validation passes
            B->>DB: UPDATE resources SET ... WHERE id=$6 RETURNING *

            alt Resource not found
                DB-->>B: 0 rows updated
                B-->>F: 404 Not Found\n{ ok:false, error:"Resource not found" }
                F-->>U: Show not-found message
            else Duplicate name conflict
                DB-->>B: error code 23505
                B-->>F: 409 Conflict\n{ ok:false, error:"Duplicate resource name" }
                F-->>U: Show duplicate conflict message
            else Update success
                DB-->>B: Updated row
                B->>S: logEvent("Resource updated (ID ...)")
                S->>DB: INSERT INTO booking_log (...)
                B-->>F: 200 OK\n{ ok:true, data:{...} }
                F->>F: onResourceActionSuccess() -> reset form + reload list
                F-->>U: Show success message and updated list
            end
        end
    end
```

## DELETE (D) - DELETE /api/resources/:id

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js + resources.js)
    participant B as Backend Route (DELETE /api/resources/:id)
    participant S as Service (log.service.js)
    participant DB as PostgreSQL

    U->>F: Select resource and click Delete

    alt Missing ID in frontend state
        F-->>U: "Delete failed: missing resource ID"
    else ID exists
        F->>B: DELETE /api/resources/:id
        B->>B: Parse :id

        alt Invalid ID
            B-->>F: 400 Bad Request\n{ ok:false, error:"Invalid ID" }
            F-->>U: Show error message
        else ID is valid
            B->>DB: DELETE FROM resources WHERE id=$1

            alt Resource not found
                DB-->>B: rowCount = 0
                B-->>F: 404 Not Found\n{ ok:false, error:"Resource not found" }
                F-->>U: Show not-found message
            else Delete success
                DB-->>B: rowCount = 1
                B->>S: logEvent("Resource deleted (ID ...)")
                S->>DB: INSERT INTO booking_log (...)
                B-->>F: 204 No Content
                F->>F: onResourceActionSuccess() -> reset form + reload list
                F-->>U: Show delete success message and refreshed list
            end
        end
    end
```

## Endpoint Summary (Phase6)

| CRUD | Method | Endpoint | Success status | Example failure statuses seen in code |
|---|---|---|---|---|
| Create | POST | /api/resources | 201 | 400, 409, 500 |
| Read all | GET | /api/resources | 200 | 500 |
| Read one | GET | /api/resources/:id | 200 | 400, 404, 500 |
| Update | PUT | /api/resources/:id | 200 | 400, 404, 409, 500 |
| Delete | DELETE | /api/resources/:id | 204 | 400, 404, 500 |

## Runtime Verification Notes (2026-03-22)

Deployment status:
- Docker stack started successfully with `docker compose up -d --build`
- Web container: `booking-system-phase6-web` (port 5000)
- DB container: `booking-system-phase6-db` (port 5432)

Observed API calls and responses:

| Operation | Request | Observed status | Observed response (short) |
|---|---|---|---|
| Read all (success) | GET /api/resources | 200 | `{ "ok": true, "data": [...] }` |
| Create (validation fail) | POST /api/resources (invalid body) | 400 | `{ "ok": false, "errors": [...] }` |
| Create (success) | POST /api/resources | 201 | `{ "ok": true, "data": { "id": 3, ... } }` |
| Create (duplicate fail) | POST /api/resources (same name) | 409 | `{ "ok": false, "error": "Duplicate resource name" }` |
| Update (success) | PUT /api/resources/3 | 200 | `{ "ok": true, "data": {...} }` |
| Update (not found fail) | PUT /api/resources/999999 | 404 | `{ "ok": false, "error": "Resource not found" }` |
| Delete (success) | DELETE /api/resources/3 | 204 | no content |
| Delete (not found fail) | DELETE /api/resources/3 (again) | 404 | `{ "ok": false, "error": "Resource not found" }` |

Note:
- The same endpoints/status patterns are what should appear in Browser DevTools Network tab during UI actions.
