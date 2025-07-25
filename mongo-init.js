db = db.getSiblingDB('aamira-courier');

// Create collections
db.createCollection('packages');
db.createCollection('packageevents');

// Create indexes
db.packages.createIndex({ "packageId": 1 }, { unique: true });
db.packages.createIndex({ "isActive": 1, "lastUpdated": -1 });
db.packages.createIndex({ "currentStatus": 1 });

db.packageevents.createIndex({ "packageId": 1, "eventTimestamp": -1 });
db.packageevents.createIndex({ "eventHash": 1 }, { unique: true });
db.packageevents.createIndex({ "receivedAt": -1 });

print("Database initialized with indexes");
