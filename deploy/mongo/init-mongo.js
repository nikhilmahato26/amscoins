// Runs once, automatically, the first time the mongo container starts with an
// empty /data/db (docker-entrypoint-initdb.d convention). Two jobs:
//
// 1. Initiate a single-node replica set. This app is NOT optional about this —
//    server/src/services/{wallet,withdrawal,investment,referral}Service.js all
//    run Mongoose sessions with multi-document transactions, and MongoDB will
//    refuse transactions on a standalone (non-replica-set) instance. A
//    one-member replica set is the standard way to get transaction support
//    without running a real 3-node cluster.
//
// 2. Create the app-level DB user (readWrite on asmcoins only) so the backend
//    never connects as the cluster root/admin user.
//
// MONGO_APP_USER / MONGO_APP_PASSWORD must be passed into the mongo container's
// environment (see docker-compose.yml) — set them in .env.production.

try {
  rs.initiate();
  print('[init-mongo] replica set initiated');
} catch (e) {
  // Already initiated (e.g. container restarted with existing data) — fine.
  print('[init-mongo] rs.initiate() skipped: ' + e.message);
}

db = db.getSiblingDB('asmcoins');
db.createUser({
  user: process.env.MONGO_APP_USER || 'appuser',
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'asmcoins' }],
});
print('[init-mongo] app user ensured');

// --- If this script's rs.initiate() didn't take (auth/timing races on some
// Docker/mongo versions), run it manually once after first boot:
//
//   docker exec -it <mongo_container> mongosh \
//     -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin \
//     --eval "rs.initiate()"
//
// Verify with: --eval "rs.status().ok"  (expect 1)
