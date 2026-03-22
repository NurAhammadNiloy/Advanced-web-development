# G1 - CRUD Data Flow (Phase6 Booking System)

This file models the implemented Phase6 flow (frontend -> API route -> DB -> response).

Implementation references:
- Frontend: public/resources.js, public/form.js
- Routes: src/routes/resources.routes.js
- Validation: src/validators/resource.validators.js
- Service: src/services/log.service.js
- DB schema: db/init/001_create_resources.sql, db/init/002_create_logs.sql

## CREATE (C) - POST /api/resources

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js + resources.js)
    participant B as Backend Route (POST /api/resources)
    participant S as Service (log.service.js)
    participant DB as PostgreSQL

    U->>F: Submit Create form
    F->>F: Client-side checks (name/description format + length)
    F->>B: POST /api/resources\nBody: {resourceName, resourceDescription, resourceAvailable, resourcePrice, resourcePriceUnit}
    B->>B: validationResult(resourceValidators)

    alt Server validation fails
        B-->>F: 400\n{ ok:false, errors:[{field,msg}, ...] }
        F-->>U: Show field-level validation error message
    else Validation passes
        B->>DB: INSERT INTO resources (...) RETURNING ...

        alt Duplicate name (unique index on LOWER(name))
            DB-->>B: error code 23505
            B->>S: logEvent("Duplicate resource blocked (...)")
            S->>DB: INSERT INTO booking_log (...)
            B-->>F: 409\n{ ok:false, error:"Duplicate resource name" }
            F-->>U: Show duplicate-name error
        else Insert success
            DB-->>B: Created row
            B->>S: logEvent("Resource created (ID ...)")
            S->>DB: INSERT INTO booking_log (...)
            B-->>F: 201\n{ ok:true, data:{...} }
            F->>F: onResourceActionSuccess() -> clear form + loadResources()
            F-->>U: Show create success message + refreshed list
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

    U->>F: Open /resources (or refresh after C/U/D)
    F->>B: GET /api/resources
    B->>DB: SELECT * FROM resources ORDER BY created_at DESC

    alt Query success
        DB-->>B: rows[]
        B-->>F: 200\n{ ok:true, data:[...] }
        F->>F: resourcesCache = body.data; renderResourceList(...)
        F-->>U: Updated resource list is displayed
    else Query fails
        DB-->>B: SQL error
        B-->>F: 500\n{ ok:false, error:"Database error" }
        F->>F: console.error(...); renderResourceList([])
        F-->>U: Empty/fallback list state
    end

    Note over S: No logEvent() call in READ ALL route.
```

## UPDATE (U) - PUT /api/resources/:id

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (form.js + resources.js)
    participant B as Backend Route (PUT /api/resources/:id)
    participant S as Service (log.service.js)
    participant DB as PostgreSQL

    U->>F: Select item, edit fields, click Update
    F->>F: Client-side validation + changed-state check

    alt Missing selected resourceId in form
        F-->>U: "Update failed: missing resource ID"
    else resourceId exists
        F->>B: PUT /api/resources/:id\nBody with edited fields
        B->>B: Parse id + run resourceValidators

        alt Invalid id (NaN)
            B-->>F: 400\n{ ok:false, error:"Invalid ID" }
            F-->>U: Generic 400 message (frontend expects errors[])
        else Validation errors
            B-->>F: 400\n{ ok:false, errors:[{field,msg}, ...] }
            F-->>U: Field-level validation message
        else Validation OK
            B->>DB: UPDATE resources SET ... WHERE id=$6 RETURNING *

            alt No row updated
                DB-->>B: rows.length = 0
                B-->>F: 404\n{ ok:false, error:"Resource not found" }
                F-->>U: Not-found message
            else Duplicate name (23505)
                DB-->>B: unique constraint error
                B-->>F: 409\n{ ok:false, error:"Duplicate resource name" }
                F-->>U: Duplicate-name message
            else Update success
                DB-->>B: Updated row
                B->>S: logEvent("Resource updated (ID ...)")
                S->>DB: INSERT INTO booking_log (...)
                B-->>F: 200\n{ ok:true, data:{...} }
                F->>F: onResourceActionSuccess() -> clear form + loadResources()
                F-->>U: Updated list + success message
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

    U->>F: Select item and click Delete

    alt Missing selected resourceId in form
        F-->>U: "Delete failed: missing resource ID"
    else resourceId exists
        F->>B: DELETE /api/resources/:id
        B->>B: Parse id

        alt Invalid id (NaN)
            B-->>F: 400\n{ ok:false, error:"Invalid ID" }
            F-->>U: Error message
        else Valid id
            B->>DB: DELETE FROM resources WHERE id=$1

            alt rowCount = 0
                DB-->>B: Not found
                B-->>F: 404\n{ ok:false, error:"Resource not found" }
                F-->>U: Not-found message
            else rowCount = 1
                DB-->>B: Deleted
                B->>S: logEvent("Resource deleted (ID ...)")
                S->>DB: INSERT INTO booking_log (...)
                B-->>F: 204 No Content
                F->>F: onResourceActionSuccess() -> clear form + loadResources()
                F-->>U: Delete success + refreshed list
            end
        end
    end
```

## Endpoint/Status Summary

| CRUD | Method | Endpoint | Success | Failure paths implemented |
|---|---|---|---|---|
| Create | POST | /api/resources | 201 | 400, 409, 500 |
| Read (used by UI) | GET | /api/resources | 200 | 500 |
| Read one (route exists) | GET | /api/resources/:id | 200 | 400, 404, 500 |
| Update | PUT | /api/resources/:id | 200 | 400, 404, 409, 500 |
| Delete | DELETE | /api/resources/:id | 204 | 400, 404, 500 |

## Runtime Verification (2026-03-22)

Environment:
- docker compose up -d --build: success
- booking-system-phase6-web listening on port 5000
- booking-system-phase6-db initialized and running on 5432

Observed requests (real run):

| Scenario | Request | Status | Response shape |
|---|---|---|---|
| Read success | GET /api/resources | 200 | { ok:true, data:[...] } |
| Create validation fail | POST /api/resources | 400 | { ok:false, errors:[...] } |
| Create success | POST /api/resources | 201 | { ok:true, data:{ id, ... } } |
| Create duplicate fail | POST /api/resources (same name) | 409 | { ok:false, error:"Duplicate resource name" } |
| Update success | PUT /api/resources/3 | 200 | { ok:true, data:{...} } |
| Update not found fail | PUT /api/resources/999999 | 404 | { ok:false, error:"Resource not found" } |
| Delete success | DELETE /api/resources/3 | 204 | no body |
| Delete not found fail | DELETE /api/resources/3 again | 404 | { ok:false, error:"Resource not found" } |
