## Database Schema

```mermaid
erDiagram
    USERS {
        uuid id PK
        string username "email, unique"
        string hashed_password
        enum role "ADMIN | CITIZEN | VOLUNTEER"
        bool is_active
    }

    VENUES {
        string id PK "e.g. soa-iter-01"
        string name
        string location
        float gps_center_lat
        float gps_center_lng
        int total_capacity
    }

    ZONES {
        string id PK
        string venue_id FK
        string code
        string name
        string sector
        int capacity_limit
        int current_headcount
        float density "persons per m²"
        float flow_rate
        int risk_score "0–100"
        enum risk_level "safe | caution | warning | critical"
        enum trend "up | down | stable"
        enum gate_status "open | restricted | closed | one_way | evacuation"
        json coordinates_json "polygon [[lat,lng],...]"
        float center_lat
        float center_lng
        bool reverse_flow_detected
        bool flow_conflict
    }

    ALERTS {
        string id PK "e.g. ALT-8924"
        string zone_id FK
        string venue_id FK
        enum severity "safe | caution | warning | critical"
        string title
        string category
        string trigger_reason
        string sentinel_analysis
        float confidence_score
        float density
        float flow_rate
        json recommended_actions
        enum status "OPEN | DISPATCHED | RESOLVED"
        string resolved_by
        datetime created_at
        datetime resolved_at
    }

    CITIZEN_REPORTS {
        uuid id PK
        enum category "Overcrowding | Medical | Hazard | Panic"
        string description
        string location_name
        string venue_id
        float latitude
        float longitude
        string media_url
        string media_type
        int upvotes
        enum status "PENDING | VERIFIED | DISPATCHED | RESOLVED"
        datetime created_at
    }

    TELEMETRY_LOGS {
        bigint id PK
        string zone_id FK
        datetime timestamp "indexed"
        int person_count
        float density
        float avg_speed
        bool flow_conflict
        bool reverse_flow_detected
        float surge_score
        float calculated_risk_score
    }

    CCTV_FEEDS {
        string id PK
        string name
        string location
        string zone_id FK
        enum status "online | warning | offline"
        int fps
        int person_count
        string image_url
        string edge_node_id
        json yolo_detections_json
    }

    AUDIT_LOGS {
        int id PK
        string operator_id
        string action_taken
        string target_entity
        datetime timestamp
    }

    VENUES ||--o{ ZONES : "contains"
    ZONES ||--o{ ALERTS : "triggers"
    ZONES ||--o{ CCTV_FEEDS : "monitored by"
    ZONES ||--o{ TELEMETRY_LOGS : "records"
    VENUES ||--o{ ALERTS : "scoped to"
    VENUES ||--o{ CITIZEN_REPORTS : "reported at"
```

### Pre-Seeded Venues

| Venue ID | Name | Location | Zones |
|---|---|---|---|
| `soa-iter-01` | SOA ITER Campus | Bhubaneswar, Odisha | `gate_1`, `zone_admin_block_rd`, `zone_library_roundabout`, `zone_sports_complex_rd`, `gate_2`, `zone_e_block_lawn_rd` |
| `kalinga-stadium-01` | Kalinga International Stadium | Nayapalli, Bhubaneswar | `ks_gate_3`, `ks_sky_walk`, `ks_swimming`, `ks_athletics`, `ks_parking`, `ks_badminton` |

---