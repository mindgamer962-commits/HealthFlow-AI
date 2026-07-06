# Cloud Firestore Schema & Database Planning

HealthFlow AI utilizes Google Cloud Firestore as its primary real-time database. The document-oriented layout is structured for high throughput, optimized read performance, and secure access checks.

---

## 1. Collection: `districts`
Represents administrative zones containing multiple healthcare facilities.

### Document Path: `/districts/{districtId}`
```json
{
  "id": "dst-east-khasi",
  "name": "East Khasi Hills",
  "state": "Meghalaya",
  "leadAdminId": "usr-admin-1",
  "leadAdminName": "Dr. Sarah Lyngdoh",
  "facilityCounts": {
    "phc": 18,
    "chc": 6
  },
  "createdTime": "2026-06-01T00:00:00Z"
}
```

---

## 2. Collection: `phcs`
Contains metadata and running operational totals for individual facilities.

### Document Path: `/phcs/{phcId}`
```json
{
  "id": "phc-1",
  "name": "Mawphlang PHC",
  "type": "PHC",
  "districtId": "dst-east-khasi",
  "districtName": "East Khasi Hills",
  "capacity": {
    "bedsTotal": 10,
    "doctorsTotal": 2
  },
  "runningMetrics": {
    "bedsOccupied": 9,
    "doctorsPresent": 1,
    "patientFootfallToday": 84,
    "medicineHealthScore": 42,
    "labStatusScore": 90
  },
  "status": "Critical",
  "lastSyncTime": "2026-07-03T09:45:00Z"
}
```

---

## 3. Subcollection: `inventory` (Nested under `phcs`)
Stores specific items and medicine stock thresholds for a facility.

### Document Path: `/phcs/{phcId}/inventory/{itemId}`
```json
{
  "id": "med-2",
  "name": "Amoxicillin 250mg",
  "category": "Antibiotics",
  "stock": 15,
  "minThreshold": 100,
  "unit": "Capsules",
  "status": "Critical",
  "lastUpdated": "2026-07-03T09:45:00Z",
  "updatedBy": "usr-staff-1"
}
```

---

## 4. Collection: `daily_metrics`
Aggregates historical performance metrics used to build Recharts trends and run predictive AI computations.

### Document Path: `/daily_metrics/{metricId}`
*(Where `metricId` is generated as `{phcId}_{YYYY-MM-DD}`)*
```json
{
  "id": "phc-1_2026-07-03",
  "phcId": "phc-1",
  "phcName": "Mawphlang PHC",
  "date": "2026-07-03",
  "totals": {
    "patientCount": 84,
    "bedsOccupied": 9,
    "doctorsPresent": 1,
    "medicineShortagesCount": 3
  },
  "timestamp": "2026-07-03T23:59:59Z"
}
```

---

## 5. Collection: `alerts`
Triggers immediate exceptions visible to the District Administrator in the top bar and home panel.

### Document Path: `/alerts/{alertId}`
```json
{
  "id": "al-1",
  "phcId": "phc-1",
  "phcName": "Mawphlang PHC",
  "type": "Medicine Stock-out",
  "severity": "Critical",
  "message": "ORS and Amoxicillin stock is below 10%. Potential stock-out in 48 hours.",
  "timestamp": "2026-07-03T08:30:00Z",
  "resolved": false,
  "resolvedBy": null,
  "resolvedTime": null
}
```

---

## 6. Collection: `transfers`
Tracks inter-facility redirection logs and statuses.

### Document Path: `/transfers/{transferId}`
```json
{
  "id": "tr-1",
  "fromPhcId": "phc-2",
  "fromPhcName": "Laitryngew PHC",
  "toPhcId": "phc-1",
  "toPhcName": "Mawphlang PHC",
  "resourceType": "Medicines",
  "details": "Amoxicillin 250mg - 50 Capsules, ORS - 20 Sachets",
  "quantity": 70,
  "status": "Pending",
  "timestamp": "2026-07-03T09:40:00Z",
  "approvedBy": null,
  "actionedTime": null
}
```

---

## Firestore Security Rules Guidelines
We configure role checks at the Firestore layer to secure patient counts and stock metrics:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User metadata lookup helper
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    // District Admins can read everything
    match /phcs/{phcId} {
      allow read: if request.auth != null && (
        getUserData().role == 'District Admin' || 
        getUserData().role == 'Super Admin' ||
        getUserData().phcId == phcId
      );
      
      // PHC staff can write only to their designated facility
      allow update: if request.auth != null && (
        getUserData().role == 'District Admin' ||
        getUserData().role == 'Super Admin' ||
        (getUserData().role == 'PHC Staff' && getUserData().phcId == phcId)
      );
    }
    
    // Transfers can only be approved by District Admins
    match /transfers/{transferId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && getUserData().role == 'District Admin';
    }
  }
}
```
